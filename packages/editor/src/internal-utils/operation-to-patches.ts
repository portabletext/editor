import {
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
  type InsertPosition,
  type Patch,
} from '@portabletext/patches'
import {
  isSpan,
  isTextBlock,
  type PortableTextBlock,
  type PortableTextSpan,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {
  Descendant,
  InsertNodeOperation,
  InsertTextOperation,
  MergeNodeOperation,
  MoveNodeOperation,
  RemoveNodeOperation,
  RemoveTextOperation,
  SetNodeOperation,
  SplitNodeOperation,
} from '../slate'
import type {Path} from '../types/paths'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {fromSlateBlock} from './values'

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
    throw new Error('Could not find block')
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
  if (!block) {
    throw new Error('Could not find block')
  }
  const child =
    (isTextBlock({schema}, block) && block.children[operation.path[1]!]) ||
    undefined
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
  editor: PortableTextSlateEditor,
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

      for (const key of Object.keys(operation.newProperties)) {
        const value = (operation.newProperties as Record<string, unknown>)[key]

        if (key === '_key') {
          patches.push(set(value, [blockIndex, '_key']))
        } else {
          patches.push(set(value, [{_key: block._key}, key]))
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

      // Properties live directly on the node now (no value wrapper)
      // Read directly from operation.newProperties/operation.properties
      for (const key of Object.keys(operation.newProperties)) {
        if (key === '_key' || key === '_type' || key === 'children') {
          continue
        }
        const value = (operation.newProperties as Record<string, unknown>)[key]
        patches.push(set(value, [{_key: block._key}, key]))
      }

      for (const key of Object.keys(operation.properties)) {
        if (key === '_key' || key === '_type' || key === 'children') {
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

        if (editor.isElement(child)) {
          // The child is an inline object. Properties live directly on the node.

          for (const key of Object.keys(operation.newProperties)) {
            if (key === '_type' || key === 'children') {
              continue
            }

            const value = (operation.newProperties as Record<string, unknown>)[
              key
            ]

            if (key === '_key') {
              patches.push(
                set(value, [
                  {_key: blockKey},
                  'children',
                  block.children.indexOf(child),
                  '_key',
                ]),
              )
            } else {
              patches.push(
                set(value, [
                  {_key: blockKey},
                  'children',
                  {_key: childKey},
                  key,
                ]),
              )
            }
          }

          return patches
        }

        const newPropNames = Object.keys(operation.newProperties)

        for (const keyName of newPropNames) {
          const value = (operation.newProperties as Record<string, unknown>)[
            keyName
          ]

          if (keyName === '_key') {
            patches.push(
              set(value, [
                {_key: blockKey},
                'children',
                block.children.indexOf(child),
                keyName,
              ]),
            )

            continue
          }

          patches.push(
            set(value, [
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
  editor: PortableTextSlateEditor,
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
        insert(
          [fromSlateBlock(operation.node as Descendant, schema.block.name)],
          position,
          [{_key: targetKey}],
        ),
      ]
    }
    return [
      setIfMissing(beforeValue, []),
      insert(
        [fromSlateBlock(operation.node as Descendant, schema.block.name)],
        'before',
        [operation.path[0]!],
      ),
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

    if (editor.isText(operation.node)) {
      return [setIfMissingPatch, insert([operation.node], position, path)]
    }

    // Properties live directly on the node (no value wrapper)
    // Strip children key (if present from transient states)
    const {children: _c, ...nodeProps} = operation.node as Record<
      string,
      unknown
    >

    return [setIfMissingPatch, insert([nodeProps], position, path)]
  }

  return []
}

export function splitNodePatch(
  schema: EditorSchema,
  children: Descendant[],
  operation: SplitNodeOperation,
  beforeValue: Array<PortableTextBlock>,
): Array<Patch> {
  const patches: Patch[] = []
  const splitBlock = children[operation.path[0]!]
  if (!isTextBlock({schema}, splitBlock)) {
    throw new Error(
      `Block with path ${JSON.stringify(
        operation.path[0],
      )} is not a text block and can't be split`,
    )
  }
  if (operation.path.length === 1) {
    const oldBlock = beforeValue[operation.path[0]!]
    if (isTextBlock({schema}, oldBlock)) {
      const nextBlock = children[operation.path[0]! + 1]
      if (!nextBlock) {
        return patches
      }
      const targetValue = fromSlateBlock(nextBlock, schema.block.name)
      if (targetValue) {
        patches.push(insert([targetValue], 'after', [{_key: splitBlock._key}]))
        const spansToUnset = oldBlock.children.slice(operation.position)
        spansToUnset.forEach((span) => {
          const path = [{_key: oldBlock._key}, 'children', {_key: span._key}]
          patches.push(unset(path))
        })
      }
    }
    return patches
  }
  if (operation.path.length === 2) {
    const splitSpan = splitBlock.children[operation.path[1]!]
    if (isSpan({schema}, splitSpan)) {
      const targetSpans = (
        fromSlateBlock(
          {
            ...splitBlock,
            children: splitBlock.children.slice(
              operation.path[1]! + 1,
              operation.path[1]! + 2,
            ),
          } as Descendant,
          schema.block.name,
        ) as PortableTextTextBlock
      ).children

      // Defensive setIfMissing to ensure children array exists before inserting
      patches.push(setIfMissing([], [{_key: splitBlock._key}, 'children']))
      patches.push(
        insert(targetSpans, 'after', [
          {_key: splitBlock._key},
          'children',
          {_key: splitSpan._key},
        ]),
      )
      patches.push(
        set(splitSpan.text, [
          {_key: splitBlock._key},
          'children',
          {_key: splitSpan._key},
          'text',
        ]),
      )
    }
    return patches
  }
  return patches
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

export function mergeNodePatch(
  schema: EditorSchema,
  children: Descendant[],
  operation: MergeNodeOperation,
  beforeValue: Array<PortableTextBlock>,
): Array<Patch> {
  const patches: Patch[] = []

  const block = beforeValue[operation.path[0]!]
  const updatedBlock = children[operation.path[0]!]

  if (operation.path.length === 1) {
    if (block?._key) {
      const prevBlock = children[operation.path[0]! - 1]
      if (!prevBlock) {
        throw new Error('Previous block not found!')
      }
      const newBlock = fromSlateBlock(prevBlock, schema.block.name)
      patches.push(set(newBlock, [{_key: newBlock._key}]))
      patches.push(unset([{_key: block._key}]))
    } else {
      throw new Error('Target key not found!')
    }
  } else if (
    isTextBlock({schema}, block) &&
    isTextBlock({schema}, updatedBlock) &&
    operation.path.length === 2
  ) {
    const updatedSpan =
      updatedBlock.children[operation.path[1]! - 1] &&
      isSpan({schema}, updatedBlock.children[operation.path[1]! - 1])
        ? updatedBlock.children[operation.path[1]! - 1]
        : undefined
    const removedSpan =
      block.children[operation.path[1]!] &&
      isSpan({schema}, block.children[operation.path[1]!])
        ? block.children[operation.path[1]!]
        : undefined

    if (updatedSpan) {
      const spansMatchingKey = block.children.filter(
        (span) => span._key === updatedSpan._key,
      )

      if (spansMatchingKey.length === 1) {
        const prevSpan = spansMatchingKey[0]

        if (isSpan({schema}, prevSpan) && prevSpan.text !== updatedSpan.text) {
          patches.push(
            set(updatedSpan.text, [
              {_key: block._key},
              'children',
              {_key: updatedSpan._key},
              'text',
            ]),
          )
        }
      } else {
        console.warn(
          `Multiple spans have \`_key\` ${updatedSpan._key}. It's ambiguous which one to update.`,
          JSON.stringify(block, null, 2),
        )
      }
    }

    if (removedSpan) {
      const spansMatchingKey = block.children.filter(
        (span) => span._key === removedSpan._key,
      )

      if (spansMatchingKey.length === 1) {
        patches.push(
          unset([{_key: block._key}, 'children', {_key: removedSpan._key}]),
        )
      } else {
        console.warn(
          `Multiple spans have \`_key\` ${removedSpan._key}. It's ambiguous which one to remove.`,
          JSON.stringify(block, null, 2),
        )
      }
    }
  }
  return patches
}

export function moveNodePatch(
  schema: EditorSchema,
  beforeValue: Array<PortableTextBlock>,
  operation: MoveNodeOperation,
): Array<Patch> {
  const patches: Patch[] = []
  const block = beforeValue[operation.path[0]!]
  const targetBlock = beforeValue[operation.newPath[0]!]

  if (!targetBlock || !block) {
    return patches
  }

  if (operation.path.length === 1) {
    const position: InsertPosition =
      operation.path[0]! > operation.newPath[0]! ? 'before' : 'after'
    patches.push(unset([{_key: block._key}]))
    patches.push(insert([block], position, [{_key: targetBlock._key}]))
  } else if (
    operation.path.length === 2 &&
    isTextBlock({schema}, block) &&
    isTextBlock({schema}, targetBlock)
  ) {
    const child = block.children[operation.path[1]!]
    const targetChild = targetBlock.children[operation.newPath[1]!]
    const position =
      operation.newPath[1]! === targetBlock.children.length ? 'after' : 'before'
    const childToInsert = block.children[operation.path[1]!]

    if (!child || !targetChild || !childToInsert) {
      return patches
    }

    patches.push(unset([{_key: block._key}, 'children', {_key: child._key}]))
    // Defensive setIfMissing to ensure children array exists before inserting
    patches.push(setIfMissing([], [{_key: targetBlock._key}, 'children']))
    patches.push(
      insert([childToInsert], position, [
        {_key: targetBlock._key},
        'children',
        {_key: targetChild._key},
      ]),
    )
  }
  return patches
}
