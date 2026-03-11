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
import {
  Element,
  Text,
  type Descendant,
  type InsertNodeOperation,
  type InsertTextOperation,
  type RemoveNodeOperation,
  type RemoveTextOperation,
  type SetNodeOperation,
} from '../slate'
import type {Path} from '../types/paths'
import {safeStringify} from './safe-stringify'

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

        if (Element.isElement(child, schema)) {
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

    if (Text.isText(operation.node, schema)) {
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
