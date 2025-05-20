import {
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
  type InsertPosition,
  type Patch,
} from '@portabletext/patches'
import type {Path, PortableTextSpan, PortableTextTextBlock} from '@sanity/types'
import {get, isUndefined, omitBy} from 'lodash'
import {
  Text,
  type Descendant,
  type InsertNodeOperation,
  type InsertTextOperation,
  type MergeNodeOperation,
  type MoveNodeOperation,
  type RemoveNodeOperation,
  type RemoveTextOperation,
  type SetNodeOperation,
  type SplitNodeOperation,
} from 'slate'
import type {EditorSchema} from '../editor/editor-schema'
import {isSpan, isTextBlock} from './parse-blocks'
import {fromSlateValue} from './values'

export function insertTextPatch(
  schema: EditorSchema,
  children: Descendant[],
  operation: InsertTextOperation,
  beforeValue: Descendant[],
): Array<Patch> {
  const block =
    isTextBlock({schema}, children[operation.path[0]]) &&
    children[operation.path[0]]
  if (!block) {
    throw new Error('Could not find block')
  }
  const textChild =
    isTextBlock({schema}, block) &&
    isSpan({schema}, block.children[operation.path[1]]) &&
    (block.children[operation.path[1]] as PortableTextSpan)
  if (!textChild) {
    throw new Error('Could not find child')
  }
  const path: Path = [
    {_key: block._key},
    'children',
    {_key: textChild._key},
    'text',
  ]
  const prevBlock = beforeValue[operation.path[0]]
  const prevChild =
    isTextBlock({schema}, prevBlock) && prevBlock.children[operation.path[1]]
  const prevText = isSpan({schema}, prevChild) ? prevChild.text : ''
  const patch = diffMatchPatch(prevText, textChild.text, path)
  return patch.value.length ? [patch] : []
}

export function removeTextPatch(
  schema: EditorSchema,
  children: Descendant[],
  operation: RemoveTextOperation,
  beforeValue: Descendant[],
): Array<Patch> {
  const block = children[operation.path[0]]
  if (!block) {
    throw new Error('Could not find block')
  }
  const child =
    (isTextBlock({schema}, block) && block.children[operation.path[1]]) ||
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
  const beforeBlock = beforeValue[operation.path[0]]
  const prevTextChild =
    isTextBlock({schema}, beforeBlock) &&
    beforeBlock.children[operation.path[1]]
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
    const block = children[operation.path[0]]
    if (typeof block._key !== 'string') {
      throw new Error('Expected block to have a _key')
    }
    const setNode = omitBy(
      {...children[operation.path[0]], ...operation.newProperties},
      isUndefined,
    ) as unknown as Descendant
    return [
      set(fromSlateValue([setNode], schema.block.name)[0], [
        {_key: block._key},
      ]),
    ]
  } else if (operation.path.length === 2) {
    const block = children[operation.path[0]]
    if (isTextBlock({schema}, block)) {
      const child = block.children[operation.path[1]]
      if (child) {
        const blockKey = block._key
        const childKey = child._key
        const patches: Patch[] = []
        const keys = Object.keys(operation.newProperties)
        keys.forEach((keyName) => {
          // Special case for setting _key on a child. We have to target it by index and not the _key.
          if (keys.length === 1 && keyName === '_key') {
            const val = get(operation.newProperties, keyName)
            patches.push(
              set(val, [
                {_key: blockKey},
                'children',
                block.children.indexOf(child),
                keyName,
              ]),
            )
          } else {
            const val = get(operation.newProperties, keyName)
            patches.push(
              set(val, [
                {_key: blockKey},
                'children',
                {_key: childKey},
                keyName,
              ]),
            )
          }
        })
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
  beforeValue: Descendant[],
): Array<Patch> {
  const block = beforeValue[operation.path[0]]
  if (operation.path.length === 1) {
    const position = operation.path[0] === 0 ? 'before' : 'after'
    const beforeBlock = beforeValue[operation.path[0] - 1]
    const targetKey = operation.path[0] === 0 ? block?._key : beforeBlock?._key
    if (targetKey) {
      return [
        insert(
          [
            fromSlateValue(
              [operation.node as Descendant],
              schema.block.name,
            )[0],
          ],
          position,
          [{_key: targetKey}],
        ),
      ]
    }
    return [
      setIfMissing(beforeValue, []),
      insert(
        [fromSlateValue([operation.node as Descendant], schema.block.name)[0]],
        'before',
        [operation.path[0]],
      ),
    ]
  } else if (
    isTextBlock({schema}, block) &&
    operation.path.length === 2 &&
    children[operation.path[0]]
  ) {
    const position =
      block.children.length === 0 || !block.children[operation.path[1] - 1]
        ? 'before'
        : 'after'
    const node = {...operation.node} as Descendant
    if (!node._type && Text.isText(node)) {
      node._type = 'span'
      node.marks = []
    }
    const blk = fromSlateValue(
      [
        {
          _key: 'bogus',
          _type: schema.block.name,
          children: [node],
        },
      ],
      schema.block.name,
    )[0] as PortableTextTextBlock
    const child = blk.children[0]
    return [
      insert([child], position, [
        {_key: block._key},
        'children',
        block.children.length <= 1 || !block.children[operation.path[1] - 1]
          ? 0
          : {_key: block.children[operation.path[1] - 1]._key},
      ]),
    ]
  }
  return []
}

export function splitNodePatch(
  schema: EditorSchema,
  children: Descendant[],
  operation: SplitNodeOperation,
  beforeValue: Descendant[],
): Array<Patch> {
  const patches: Patch[] = []
  const splitBlock = children[operation.path[0]]
  if (!isTextBlock({schema}, splitBlock)) {
    throw new Error(
      `Block with path ${JSON.stringify(
        operation.path[0],
      )} is not a text block and can't be split`,
    )
  }
  if (operation.path.length === 1) {
    const oldBlock = beforeValue[operation.path[0]]
    if (isTextBlock({schema}, oldBlock)) {
      const targetValue = fromSlateValue(
        [children[operation.path[0] + 1]],
        schema.block.name,
      )[0]
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
    const splitSpan = splitBlock.children[operation.path[1]]
    if (isSpan({schema}, splitSpan)) {
      const targetSpans = (
        fromSlateValue(
          [
            {
              ...splitBlock,
              children: splitBlock.children.slice(
                operation.path[1] + 1,
                operation.path[1] + 2,
              ),
            } as Descendant,
          ],
          schema.block.name,
        )[0] as PortableTextTextBlock
      ).children

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
  beforeValue: Descendant[],
  operation: RemoveNodeOperation,
): Array<Patch> {
  const block = beforeValue[operation.path[0]]
  if (operation.path.length === 1) {
    // Remove a single block
    if (block && block._key) {
      return [unset([{_key: block._key}])]
    }
    throw new Error('Block not found')
  } else if (isTextBlock({schema}, block) && operation.path.length === 2) {
    const spanToRemove = block.children[operation.path[1]]

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
  beforeValue: Descendant[],
): Array<Patch> {
  const patches: Patch[] = []

  const block = beforeValue[operation.path[0]]
  const updatedBlock = children[operation.path[0]]

  if (operation.path.length === 1) {
    if (block?._key) {
      const newBlock = fromSlateValue(
        [children[operation.path[0] - 1]],
        schema.block.name,
      )[0]
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
      updatedBlock.children[operation.path[1] - 1] &&
      isSpan({schema}, updatedBlock.children[operation.path[1] - 1])
        ? updatedBlock.children[operation.path[1] - 1]
        : undefined
    const removedSpan =
      block.children[operation.path[1]] &&
      isSpan({schema}, block.children[operation.path[1]])
        ? block.children[operation.path[1]]
        : undefined

    if (updatedSpan) {
      const spansMatchingKey = block.children.filter(
        (span) => span._key === updatedSpan._key,
      )

      if (spansMatchingKey.length === 1) {
        patches.push(
          set(updatedSpan.text, [
            {_key: block._key},
            'children',
            {_key: updatedSpan._key},
            'text',
          ]),
        )
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
  beforeValue: Descendant[],
  operation: MoveNodeOperation,
): Array<Patch> {
  const patches: Patch[] = []
  const block = beforeValue[operation.path[0]]
  const targetBlock = beforeValue[operation.newPath[0]]

  if (!targetBlock) {
    return patches
  }

  if (operation.path.length === 1) {
    const position: InsertPosition =
      operation.path[0] > operation.newPath[0] ? 'before' : 'after'
    patches.push(unset([{_key: block._key}]))
    patches.push(
      insert([fromSlateValue([block], schema.block.name)[0]], position, [
        {_key: targetBlock._key},
      ]),
    )
  } else if (
    operation.path.length === 2 &&
    isTextBlock({schema}, block) &&
    isTextBlock({schema}, targetBlock)
  ) {
    const child = block.children[operation.path[1]]
    const targetChild = targetBlock.children[operation.newPath[1]]
    const position =
      operation.newPath[1] === targetBlock.children.length ? 'after' : 'before'
    const childToInsert = (
      fromSlateValue([block], schema.block.name)[0] as PortableTextTextBlock
    ).children[operation.path[1]]
    patches.push(unset([{_key: block._key}, 'children', {_key: child._key}]))
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
