import {
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
  type InsertPosition,
  type Patch,
} from '@portabletext/patches'
import {isSpan, isTextBlock} from '@portabletext/schema'
import type {Path, PortableTextTextBlock} from '@sanity/types'
import {
  Element,
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
import {fromSlateValue} from './values'

export function insertTextPatch(
  schema: EditorSchema,
  children: Descendant[],
  operation: InsertTextOperation,
  beforeValue: Descendant[],
): Array<Patch> {
  // Navigate to the parent block that contains the span
  // For nested paths like [0, 0, 0, 0], we need to traverse to find the actual text-containing block
  let currentNode: any = children[operation.path[0]]
  let prevNode: any = beforeValue[operation.path[0]]
  const patchPath: Path = [{_key: currentNode._key}]

  // Traverse all but the last segment to get to the parent block
  for (let i = 1; i < operation.path.length - 1; i++) {
    const index = operation.path[i]

    if (!currentNode.children || !Array.isArray(currentNode.children)) {
      throw new Error('Could not find block')
    }

    const child = currentNode.children[index]
    if (!child) {
      throw new Error('Could not find block')
    }

    patchPath.push('children', {_key: child._key})
    currentNode = child

    // Also traverse the previous value
    if (prevNode && prevNode.children && Array.isArray(prevNode.children)) {
      prevNode = prevNode.children[index]
    }
  }

  // Now currentNode is the parent block containing the span
  const spanIndex = operation.path[operation.path.length - 1]
  const textChild = currentNode.children?.[spanIndex]

  if (!textChild || !isSpan({schema}, textChild)) {
    throw new Error('Could not find child')
  }

  const path: Path = [...patchPath, 'children', {_key: textChild._key}, 'text']

  const prevChild = prevNode?.children?.[spanIndex]
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
  // Navigate to the parent block that contains the span
  // For nested paths like [0, 0, 0, 0], we need to traverse to find the actual text-containing block
  let currentNode: any = children[operation.path[0]]
  let prevNode: any = beforeValue[operation.path[0]]
  const patchPath: Path = [{_key: currentNode._key}]

  // Traverse all but the last segment to get to the parent block
  for (let i = 1; i < operation.path.length - 1; i++) {
    const index = operation.path[i]

    if (!currentNode.children || !Array.isArray(currentNode.children)) {
      throw new Error('Could not find block')
    }

    const child = currentNode.children[index]
    if (!child) {
      throw new Error('Could not find block')
    }

    patchPath.push('children', {_key: child._key})
    currentNode = child

    // Also traverse the previous value
    if (prevNode && prevNode.children && Array.isArray(prevNode.children)) {
      prevNode = prevNode.children[index]
    }
  }

  // Now currentNode is the parent block containing the span
  const spanIndex = operation.path[operation.path.length - 1]
  const textChild = currentNode.children?.[spanIndex]

  if (!textChild || !isSpan({schema}, textChild)) {
    throw new Error('Could not find child')
  }

  const path: Path = [...patchPath, 'children', {_key: textChild._key}, 'text']

  const prevTextChild = prevNode?.children?.[spanIndex]
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

      const newValue =
        'value' in operation.newProperties &&
        typeof operation.newProperties.value === 'object'
          ? (operation.newProperties.value as Record<string, unknown>)
          : ({} satisfies Record<string, unknown>)

      const keys = Object.keys(newValue)

      for (const key of keys) {
        const value = newValue[key]

        patches.push(set(value, [{_key: block._key}, key]))
      }

      const value =
        'value' in operation.properties &&
        typeof operation.properties.value === 'object'
          ? (operation.properties.value as Record<string, unknown>)
          : ({} satisfies Record<string, unknown>)

      for (const key of Object.keys(value)) {
        if (!(key in newValue)) {
          patches.push(unset([{_key: block._key}, key]))
        }
      }

      return patches
    }
  } else if (operation.path.length >= 2) {
    // Handle nested paths (e.g., [0, 0] for text block children or [0, 0, 0, 0] for nested container blocks)

    // Navigate to the target node by traversing the path
    let currentNode: any = children[operation.path[0]]
    const patchPath: Path = [{_key: currentNode._key}]

    // Traverse the path to build the patch path
    for (let i = 1; i < operation.path.length; i++) {
      const index = operation.path[i]

      if (!currentNode.children || !Array.isArray(currentNode.children)) {
        throw new Error(
          `Node at path ${operation.path.slice(0, i)} does not have children`,
        )
      }

      const child = currentNode.children[index]

      if (!child) {
        throw new Error(
          `Could not find child at index ${index} in path ${operation.path}`,
        )
      }

      patchPath.push('children')

      // For the last segment in the path, we're at the target node
      if (i === operation.path.length - 1) {
        // This is the node we're setting properties on
        const patches: Patch[] = []

        // Check if it's an inline object (Element) or a span
        if (Element.isElement(child)) {
          // The child is an inline object. This needs to be treated
          // differently since all custom properties are stored on a `value`
          // object.

          const _key = operation.newProperties._key

          if (_key !== undefined) {
            patches.push(set(_key, [...patchPath, index, '_key']))
          }

          const properties =
            'value' in operation.newProperties &&
            typeof operation.newProperties.value === 'object'
              ? (operation.newProperties.value as Record<string, unknown>)
              : ({} satisfies Record<string, unknown>)

          const keys = Object.keys(properties)

          for (const key of keys) {
            const value = properties[key]

            patches.push(set(value, [...patchPath, {_key: child._key}, key]))
          }

          return patches
        }

        // It's a span or similar text node
        const newPropNames = Object.keys(operation.newProperties)

        for (const keyName of newPropNames) {
          const value = (operation.newProperties as Record<string, unknown>)[
            keyName
          ]

          if (keyName === '_key') {
            patches.push(set(value, [...patchPath, index, keyName]))

            continue
          }

          patches.push(set(value, [...patchPath, {_key: child._key}, keyName]))
        }

        const propNames = Object.keys(operation.properties)

        for (const keyName of propNames) {
          if (keyName in operation.newProperties) {
            continue
          }

          patches.push(unset([...patchPath, {_key: child._key}, keyName]))
        }

        return patches
      } else {
        // We're still navigating, add the key and continue
        patchPath.push({_key: child._key})
        currentNode = child
      }
    }

    throw new Error('Could not process path')
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
