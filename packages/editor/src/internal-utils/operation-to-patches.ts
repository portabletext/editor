import {
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import {isSpan, isTextBlock, type PortableTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {
  Descendant,
  InsertNodeOperation,
  InsertTextOperation,
  RemoveNodeOperation,
  RemoveTextOperation,
  SetNodeOperation,
} from '../slate'
import {resolveSegmentIndex, type KeyedSegment, type Path} from '../types/paths'

export function insertTextPatch(
  schema: EditorSchema,
  children: Descendant[],
  operation: InsertTextOperation,
  beforeValue: Array<PortableTextBlock>,
): Array<Patch> {
  const blockKey = operation.path[0] as KeyedSegment
  const childKey = operation.path[2] as KeyedSegment
  const path: Path = [blockKey, 'children', childKey, 'text']

  const blockIndex = resolveSegmentIndex(children, blockKey)
  const block = children[blockIndex]

  if (!block || !isTextBlock({schema}, block)) {
    return []
  }

  const childIndex = resolveSegmentIndex(block.children, childKey)
  const textChild = block.children[childIndex]

  if (!textChild || !isSpan({schema}, textChild)) {
    throw new Error('Could not find child')
  }

  const prevBlock = beforeValue[resolveSegmentIndex(beforeValue, blockKey)]
  const prevChild =
    isTextBlock({schema}, prevBlock) &&
    prevBlock.children[resolveSegmentIndex(prevBlock.children, childKey)]
  const prevText = isSpan({schema}, prevChild) ? prevChild.text : ''
  const patch = diffMatchPatch(prevText, textChild.text, path)
  return patch.value.length ? [patch] : []
}

export function removeTextPatch(
  schema: EditorSchema,
  children: Descendant[],
  operation: RemoveTextOperation,
  beforeValue: Array<PortableTextBlock>,
): Array<Patch> {
  const blockKey = operation.path[0] as KeyedSegment
  const childKey = operation.path[2] as KeyedSegment
  const path: Path = [blockKey, 'children', childKey, 'text']

  const blockIndex = resolveSegmentIndex(children, blockKey)
  const block = children[blockIndex]

  if (!block || !isTextBlock({schema}, block)) {
    return []
  }

  const childIndex = resolveSegmentIndex(block.children, childKey)
  const textChild = block.children[childIndex]

  if (!textChild) {
    throw new Error('Could not find child')
  }
  if (!isSpan({schema}, textChild)) {
    throw new Error('Expected span')
  }

  const beforeBlock = beforeValue[resolveSegmentIndex(beforeValue, blockKey)]
  const prevTextChild =
    isTextBlock({schema}, beforeBlock) &&
    beforeBlock.children[resolveSegmentIndex(beforeBlock.children, childKey)]
  const prevText = isSpan({schema}, prevTextChild) && prevTextChild.text
  const patch = diffMatchPatch(prevText || '', textChild.text, path)
  return patch.value ? [patch] : []
}

export function setNodePatch(
  schema: EditorSchema,
  children: Descendant[],
  operation: SetNodeOperation,
): Array<Patch> {
  if (operation.path.length === 1) {
    const blockSegment = operation.path[0]!
    const blockIndex = resolveSegmentIndex(children, blockSegment)
    const block = children.at(blockIndex)

    if (!block) {
      console.error('Could not find block', blockSegment)
      return []
    }

    const blockKey = (block as {_key: string})._key
    const patches: Patch[] = []

    for (const [key, propertyValue] of Object.entries(
      operation.newProperties,
    )) {
      if (key === '_key') {
        patches.push(set(propertyValue, [blockIndex, '_key']))
      } else if (key !== 'children') {
        patches.push(set(propertyValue, [{_key: blockKey}, key]))
      }
    }

    for (const key of Object.keys(operation.properties)) {
      if (
        key !== '_key' &&
        key !== 'children' &&
        !(key in operation.newProperties)
      ) {
        patches.push(unset([{_key: blockKey}, key]))
      }
    }

    return patches
  } else if (operation.path.length >= 2) {
    const blockKey = operation.path[0] as KeyedSegment
    const childKey = operation.path[2] as KeyedSegment

    const blockIndex = resolveSegmentIndex(children, blockKey)
    const block = children[blockIndex]

    if (!isTextBlock({schema}, block)) {
      throw new Error('Could not find a valid block')
    }

    const childIndex = resolveSegmentIndex(block.children, childKey)
    const child = block.children[childIndex]

    if (!child) {
      throw new Error('Could not find a valid child')
    }

    const patches: Patch[] = []

    for (const [key, propertyValue] of Object.entries(
      operation.newProperties,
    )) {
      if (key === '_key') {
        patches.push(
          set(propertyValue, [blockKey, 'children', childIndex, '_key']),
        )
      } else if (key !== 'children') {
        patches.push(set(propertyValue, [blockKey, 'children', childKey, key]))
      }
    }

    for (const key of Object.keys(operation.properties)) {
      if (
        key !== '_key' &&
        key !== 'children' &&
        !(key in operation.newProperties)
      ) {
        patches.push(unset([blockKey, 'children', childKey, key]))
      }
    }

    return patches
  } else {
    throw new Error(
      `Unexpected path encountered: ${JSON.stringify(operation.path)}`,
    )
  }
}

export function insertNodePatch(
  schema: EditorSchema,
  children: Descendant[],
  operation: InsertNodeOperation,
  beforeValue: Array<PortableTextBlock>,
): Array<Patch> {
  const block =
    beforeValue[resolveSegmentIndex(beforeValue, operation.path[0]!)]

  if (operation.path.length === 1) {
    const blockIndex = resolveSegmentIndex(beforeValue, operation.path[0]!)
    const position = blockIndex === 0 ? 'before' : 'after'
    const beforeBlock = beforeValue[blockIndex - 1]
    const targetKey = blockIndex === 0 ? block?._key : beforeBlock?._key
    if (targetKey) {
      return [
        insert([operation.node as PortableTextBlock], position, [
          {_key: targetKey},
        ]),
      ]
    }
    return [
      setIfMissing(beforeValue, []),
      insert([operation.node as PortableTextBlock], 'before', [blockIndex]),
    ]
  } else if (
    isTextBlock({schema}, block) &&
    operation.path.length >= 2 &&
    children[resolveSegmentIndex(children, operation.path[0]!)]
  ) {
    const childIndex = resolveSegmentIndex(
      block.children,
      operation.path[operation.path.length - 1]!,
    )
    const position =
      block.children.length === 0 || !block.children[childIndex - 1]
        ? 'before'
        : 'after'
    const path =
      block.children.length <= 1 || !block.children[childIndex - 1]
        ? [{_key: block._key}, 'children', 0]
        : [
            {_key: block._key},
            'children',
            {_key: block.children[childIndex - 1]!._key},
          ]

    const setIfMissingPatch = setIfMissing([], [{_key: block._key}, 'children'])

    return [setIfMissingPatch, insert([operation.node], position, path)]
  }

  return []
}

export function removeNodePatch(
  schema: EditorSchema,
  beforeValue: Array<PortableTextBlock>,
  operation: RemoveNodeOperation,
): Array<Patch> {
  const block =
    beforeValue[resolveSegmentIndex(beforeValue, operation.path[0]!)]

  if (operation.path.length === 1) {
    if (block && block._key) {
      return [unset([{_key: block._key}])]
    }
    throw new Error('Block not found')
  } else if (isTextBlock({schema}, block) && operation.path.length >= 2) {
    const spanToRemove =
      block.children[
        resolveSegmentIndex(
          block.children,
          operation.path[operation.path.length - 1]!,
        )
      ]

    if (spanToRemove) {
      const spansMatchingKey = block.children.filter(
        (span) => span._key === operation.node._key,
      )

      if (spansMatchingKey.length > 1) {
        console.warn(
          `Multiple spans have \`_key\` ${operation.node._key}. It's ambiguous which one to remove.`,
          JSON.stringify(block, null, 2),
        )
        return []
      }

      return [
        unset([{_key: block._key}, 'children', {_key: spanToRemove._key}]),
      ]
    }
    return []
  } else {
    return []
  }
}
