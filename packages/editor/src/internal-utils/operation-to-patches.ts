import {
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import {
  isSpan,
  isTextBlock,
  type PortableTextBlock,
  type PortableTextSpan,
} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {
  Descendant,
  InsertNodeOperation,
  InsertTextOperation,
  RemoveNodeOperation,
  RemoveTextOperation,
  SetNodeKeyedOperation,
  SetNodeOperation,
} from '../slate'
import {isElement} from '../slate/element/is-element'
import {isText} from '../slate/text/is-text'
import {resolveKeyedPath} from '../slate/utils/resolve-keyed-path'
import type {Path} from '../types/paths'
import {safeStringify} from './safe-json'

export function insertTextPatch(
  schema: EditorSchema,
  children: Descendant[],
  operation: InsertTextOperation,
  beforeValue: Array<PortableTextBlock>,
): Array<Patch> {
  const block =
    isTextBlock({schema}, children[operation.path[0]!]) &&
    children[operation.path[0]!]
  if (!block) {
    return []
  }
  const textChild =
    isTextBlock({schema}, block) &&
    isSpan({schema}, block.children[operation.path[1]!]) &&
    (block.children[operation.path[1]!] as PortableTextSpan)
  if (!textChild) {
    throw new Error('Could not find child')
  }
  const path: Path = [
    {_key: block._key},
    'children',
    {_key: textChild._key},
    'text',
  ]
  const prevBlock = beforeValue[operation.path[0]!]
  const prevChild =
    isTextBlock({schema}, prevBlock) && prevBlock.children[operation.path[1]!]
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
  const block = children[operation.path[0]!]
  if (!block || !isTextBlock({schema}, block)) {
    return []
  }
  const child = block.children[operation.path[1]!] || undefined
  const textChild: PortableTextSpan | undefined = isSpan({schema}, child)
    ? child
    : undefined
  if (child && !textChild) {
    throw new Error('Expected span')
  }
  if (!textChild) {
    throw new Error('Could not find child')
  }
  const path: Path = [
    {_key: block._key},
    'children',
    {_key: textChild._key},
    'text',
  ]
  const beforeBlock = beforeValue[operation.path[0]!]
  const prevTextChild =
    isTextBlock({schema}, beforeBlock) &&
    beforeBlock.children[operation.path[1]!]
  const prevText = isSpan({schema}, prevTextChild) && prevTextChild.text
  const patch = diffMatchPatch(prevText || '', textChild.text, path)
  return patch.value ? [patch] : []
}

export function setNodePatch(
  schema: EditorSchema,
  children: Descendant[],
  operation: SetNodeOperation,
): Array<Patch> {
  const blockIndex = operation.path.at(0)

  if (blockIndex !== undefined && operation.path.length === 1) {
    const block = children.at(blockIndex)

    if (!block) {
      console.error('Could not find block at index', blockIndex)
      return []
    }

    if (isTextBlock({schema}, block)) {
      const patches: Patch[] = []

      for (const [key, propertyValue] of Object.entries(
        operation.newProperties,
      )) {
        if (key === '_key') {
          patches.push(set(propertyValue, [blockIndex, '_key']))
        } else {
          patches.push(set(propertyValue, [{_key: block._key}, key]))
        }
      }

      for (const key of Object.keys(operation.properties)) {
        if (!(key in operation.newProperties)) {
          patches.push(unset([{_key: block._key}, key]))
        }
      }

      return patches
    } else {
      const patches: Patch[] = []

      const _key = operation.newProperties._key

      if (_key !== undefined) {
        patches.push(set(_key, [blockIndex, '_key']))
      }

      for (const [key, propertyValue] of Object.entries(
        operation.newProperties,
      )) {
        if (key === '_key' || key === 'children') {
          continue
        }

        patches.push(set(propertyValue, [{_key: block._key}, key]))
      }

      for (const key of Object.keys(operation.properties)) {
        if (key === '_key' || key === 'children') {
          continue
        }

        if (!(key in operation.newProperties)) {
          patches.push(unset([{_key: block._key}, key]))
        }
      }

      return patches
    }
  } else if (operation.path.length === 2) {
    const block = children[operation.path[0]!]
    if (isTextBlock({schema}, block)) {
      const child = block.children[operation.path[1]!]
      if (child) {
        const blockKey = block._key
        const childKey = child._key
        const patches: Patch[] = []

        if (isElement(child, schema)) {
          const _key = operation.newProperties._key

          if (_key !== undefined) {
            patches.push(
              set(_key, [
                {_key: blockKey},
                'children',
                block.children.indexOf(child),
                '_key',
              ]),
            )
          }

          for (const [key, propertyValue] of Object.entries(
            operation.newProperties,
          )) {
            if (key === '_key' || key === 'children') {
              continue
            }

            patches.push(
              set(propertyValue, [
                {_key: blockKey},
                'children',
                {_key: childKey},
                key,
              ]),
            )
          }

          return patches
        }

        for (const [keyName, propertyValue] of Object.entries(
          operation.newProperties,
        )) {
          if (keyName === '_key') {
            patches.push(
              set(propertyValue, [
                {_key: blockKey},
                'children',
                block.children.indexOf(child),
                keyName,
              ]),
            )

            continue
          }

          patches.push(
            set(propertyValue, [
              {_key: blockKey},
              'children',
              {_key: childKey},
              keyName,
            ]),
          )
        }

        const propNames = Object.keys(operation.properties)

        for (const keyName of propNames) {
          if (keyName in operation.newProperties) {
            continue
          }

          patches.push(
            unset([{_key: blockKey}, 'children', {_key: childKey}, keyName]),
          )
        }

        return patches
      }
      throw new Error('Could not find a valid child')
    }
    throw new Error('Could not find a valid block')
  } else {
    throw new Error(
      `Unexpected path encountered: ${safeStringify(operation.path)}`,
    )
  }
}

export function insertNodePatch(
  schema: EditorSchema,
  children: Descendant[],
  operation: InsertNodeOperation,
  beforeValue: Array<PortableTextBlock>,
): Array<Patch> {
  const block = beforeValue[operation.path[0]!]
  if (operation.path.length === 1) {
    const position = operation.path[0] === 0 ? 'before' : 'after'
    const beforeBlock = beforeValue[operation.path[0]! - 1]
    const targetKey = operation.path[0] === 0 ? block?._key : beforeBlock?._key
    if (targetKey) {
      return [
        insert([operation.node as PortableTextBlock], position, [
          {_key: targetKey},
        ]),
      ]
    }
    return [
      setIfMissing(beforeValue, []),
      insert([operation.node as PortableTextBlock], 'before', [
        operation.path[0]!,
      ]),
    ]
  } else if (
    isTextBlock({schema}, block) &&
    operation.path.length === 2 &&
    children[operation.path[0]!]
  ) {
    const position =
      block.children.length === 0 || !block.children[operation.path[1]! - 1]
        ? 'before'
        : 'after'
    const path =
      block.children.length <= 1 || !block.children[operation.path[1]! - 1]
        ? [{_key: block._key}, 'children', 0]
        : [
            {_key: block._key},
            'children',
            {_key: block.children[operation.path[1]! - 1]!._key},
          ]

    // Defensive setIfMissing to ensure children array exists before inserting
    const setIfMissingPatch = setIfMissing([], [{_key: block._key}, 'children'])

    if (isText(operation.node, schema)) {
      return [setIfMissingPatch, insert([operation.node], position, path)]
    }

    return [setIfMissingPatch, insert([operation.node], position, path)]
  }

  return []
}

export function removeNodePatch(
  schema: EditorSchema,
  beforeValue: Array<PortableTextBlock>,
  operation: RemoveNodeOperation,
): Array<Patch> {
  const block = beforeValue[operation.path[0]!]
  if (operation.path.length === 1) {
    // Remove a single block
    if (block && block._key) {
      return [unset([{_key: block._key}])]
    }
    throw new Error('Block not found')
  } else if (isTextBlock({schema}, block) && operation.path.length === 2) {
    const spanToRemove = block.children[operation.path[1]!]

    if (spanToRemove) {
      const spansMatchingKey = block.children.filter(
        (span) => span._key === operation.node._key,
      )

      if (spansMatchingKey.length > 1) {
        console.warn(
          `Multiple spans have \`_key\` ${operation.node._key}. It's ambiguous which one to remove.`,
          safeStringify(block, 2),
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

export function setNodeKeyedPatch(
  _schema: EditorSchema,
  children: Array<Descendant>,
  operation: SetNodeKeyedOperation,
): Array<Patch> {
  const patches: Array<Patch> = []

  // If _key is being changed, the old key in operation.path won't resolve
  // because the tree is already mutated. Replace the last keyed segment
  // with the new key so we can resolve the path in the current tree.
  const newKey = operation.newProperties._key
  const effectivePath =
    newKey !== undefined
      ? operation.path.map((segment, i) =>
          i === operation.path.length - 1 &&
          typeof segment === 'object' &&
          '_key' in segment
            ? {_key: newKey as string}
            : segment,
        )
      : operation.path

  const indexedPath = resolveKeyedPath({children}, effectivePath)

  if (!indexedPath) {
    return []
  }

  for (const [key, propertyValue] of Object.entries(operation.newProperties)) {
    if (key === 'children') {
      continue
    }

    if (key === '_key') {
      // _key patches must use a numeric index for the node whose key is
      // changing — you can't reference a node by its key when that key is
      // the thing being changed. We build a path that keeps keyed segments
      // for ancestors but uses the numeric index for the target node.
      //
      // Find the last keyed segment (the node whose _key is changing)
      // and replace only that one with its resolved numeric index.
      let lastKeyedIdx = -1
      for (let i = effectivePath.length - 1; i >= 0; i--) {
        const seg = effectivePath[i]
        if (typeof seg === 'object' && seg !== null && '_key' in seg) {
          lastKeyedIdx = i
          break
        }
      }

      // Count how many keyed segments precede the last one to find its
      // position in the indexedPath array.
      let keyedCount = 0
      const hybridPath: Array<{_key: string} | string | number> = []
      for (let i = 0; i < effectivePath.length; i++) {
        const segment = effectivePath[i]!
        if (typeof segment === 'object' && '_key' in segment) {
          if (i === lastKeyedIdx) {
            // Replace the target node's keyed segment with numeric index
            hybridPath.push(indexedPath[keyedCount]!)
          } else {
            // Keep ancestor keyed segments as-is
            hybridPath.push(segment)
          }
          keyedCount++
        } else {
          hybridPath.push(segment)
        }
      }
      patches.push(set(propertyValue, [...hybridPath, '_key']))
    } else {
      // Use effectivePath (with new key if _key changed) since the tree
      // is already mutated and the old key no longer exists.
      patches.push(set(propertyValue, [...effectivePath, key]))
    }
  }

  for (const key of Object.keys(operation.properties)) {
    if (key === '_key' || key === 'children') {
      continue
    }

    if (!(key in operation.newProperties)) {
      patches.push(unset([...effectivePath, key]))
    }
  }

  return patches
}
