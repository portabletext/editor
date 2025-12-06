import {
  diffMatchPatch,
  insert,
  set,
  unset,
  type Patch,
} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {Element, Path, type Operation} from 'slate'
import type {EditorContext} from '../editor/editor-snapshot'
import type {OmitFromUnion} from '../type-utils'
import {isPartialSpanNode, isTextBlockNode} from './portable-text-node'

/**
 * Convert a Slate operation to incoming patches that can be applied to Portable Text.
 */
export function operationToIncomingPatches(
  context: Pick<EditorContext, 'schema'>,
  value: Array<PortableTextBlock>,
  operation: OmitFromUnion<Operation, 'type', 'set_selection'>,
): Array<Patch> {
  switch (operation.type) {
    case 'insert_text': {
      const {path, offset, text} = operation
      if (text.length === 0) {
        return []
      }

      const block = value.at(path[0])
      if (!block || !isTextBlockNode(context, block)) {
        return []
      }

      const span = block.children.at(path[1])
      if (!span || !isPartialSpanNode(span)) {
        return []
      }

      const newText =
        span.text.slice(0, offset) + text + span.text.slice(offset)
      const patch = diffMatchPatch(span.text, newText, [
        {_key: block._key},
        'children',
        {_key: span._key},
        'text',
      ])
      return patch.value.length > 0 ? [patch] : []
    }

    case 'remove_text': {
      const {path, offset, text} = operation
      if (text.length === 0) {
        return []
      }

      const block = value.at(path[0])
      if (!block || !isTextBlockNode(context, block)) {
        return []
      }

      const span = block.children.at(path[1])
      if (!span || !isPartialSpanNode(span)) {
        return []
      }

      const newText =
        span.text.slice(0, offset) + span.text.slice(offset + text.length)
      const patch = diffMatchPatch(span.text, newText, [
        {_key: block._key},
        'children',
        {_key: span._key},
        'text',
      ])
      return patch.value.length > 0 ? [patch] : []
    }

    case 'insert_node': {
      const {path, node} = operation
      const index = path[path.length - 1]

      if (path.length === 1) {
        // Insert block at root
        const transformedNode = transformInsertedNode(context, node)
        const prevBlock = value[index - 1]

        if (prevBlock) {
          return [insert([transformedNode], 'after', [{_key: prevBlock._key}])]
        }
        return [insert([transformedNode], 'before', [0])]
      }

      if (path.length === 2) {
        // Insert child into block
        const block = value.at(path[0])
        if (!block || !isTextBlockNode(context, block)) return []

        const transformedNode = transformInsertedChild(node)
        const prevChild = block.children[index - 1]

        if (prevChild) {
          return [
            insert([transformedNode], 'after', [
              {_key: block._key},
              'children',
              {_key: prevChild._key},
            ]),
          ]
        }
        return [
          insert([transformedNode], 'before', [
            {_key: block._key},
            'children',
            0,
          ]),
        ]
      }

      return []
    }

    case 'remove_node': {
      const {path} = operation

      if (path.length === 1) {
        const block = value.at(path[0])
        if (!block) {
          return []
        }
        return [unset([{_key: block._key}])]
      }

      if (path.length === 2) {
        const block = value.at(path[0])
        if (!block || !isTextBlockNode(context, block)) return []

        const child = block.children.at(path[1])
        if (!child) {
          return []
        }

        return [unset([{_key: block._key}, 'children', {_key: child._key}])]
      }

      return []
    }

    case 'merge_node': {
      const {path} = operation
      const prevPath = Path.previous(path)

      if (path.length === 1) {
        // Merge blocks
        const block = value.at(path[0])
        const prevBlock = value.at(prevPath[0])

        if (
          !block ||
          !prevBlock ||
          !isTextBlockNode(context, block) ||
          !isTextBlockNode(context, prevBlock)
        ) {
          return []
        }

        // Set the merged block with combined children
        const mergedBlock = {
          ...prevBlock,
          children: [...prevBlock.children, ...block.children],
        }
        return [
          set(mergedBlock, [{_key: prevBlock._key}]),
          unset([{_key: block._key}]),
        ]
      }

      if (path.length === 2) {
        // Merge spans
        const block = value.at(path[0])
        if (!block || !isTextBlockNode(context, block)) return []

        const span = block.children.at(path[1])
        const prevSpan = block.children.at(prevPath[1])

        if (
          !span ||
          !prevSpan ||
          !isPartialSpanNode(span) ||
          !isPartialSpanNode(prevSpan)
        ) {
          return []
        }

        return [
          set(prevSpan.text + span.text, [
            {_key: block._key},
            'children',
            {_key: prevSpan._key},
            'text',
          ]),
          unset([{_key: block._key}, 'children', {_key: span._key}]),
        ]
      }

      return []
    }

    case 'split_node': {
      const {path, position, properties} = operation
      if (path.length === 0) {
        return []
      }

      if (path.length === 1) {
        // Split block
        const block = value.at(path[0])
        if (!block || !isTextBlockNode(context, block)) return []

        const beforeChildren = block.children.slice(0, position)
        const afterChildren = block.children.slice(position)

        const newBlock = {
          ...properties,
          _type: context.schema.block.name,
          children: afterChildren,
        }

        return [
          set({...block, children: beforeChildren}, [{_key: block._key}]),
          insert([newBlock], 'after', [{_key: block._key}]),
        ]
      }

      if (path.length === 2) {
        // Split span
        const block = value.at(path[0])
        if (!block || !isTextBlockNode(context, block)) return []

        const span = block.children.at(path[1])
        if (!span || !isPartialSpanNode(span)) return []

        const beforeText = span.text.slice(0, position)
        const afterText = span.text.slice(position)

        const newSpan = {
          ...properties,
          text: afterText,
        }

        return [
          set(beforeText, [
            {_key: block._key},
            'children',
            {_key: span._key},
            'text',
          ]),
          insert([newSpan], 'after', [
            {_key: block._key},
            'children',
            {_key: span._key},
          ]),
        ]
      }

      return []
    }

    case 'move_node': {
      const {path, newPath} = operation

      if (Path.isAncestor(path, newPath)) return []

      if (path.length === 1) {
        // Move block
        const block = value.at(path[0])
        if (!block) {
          return []
        }

        const targetBlock = value.at(newPath[0])

        // Remove from old position
        const patches: Patch[] = [unset([{_key: block._key}])]

        // Insert at new position
        if (targetBlock) {
          patches.push(
            insert([block], path[0] > newPath[0] ? 'before' : 'after', [
              {_key: targetBlock._key},
            ]),
          )
        }

        return patches
      }

      if (path.length === 2) {
        // Move child within/between blocks
        const block = value.at(path[0])
        if (!block || !isTextBlockNode(context, block)) return []

        const child = block.children.at(path[1])
        if (!child) {
          return []
        }

        const targetBlock = value.at(newPath[0])
        if (!targetBlock || !isTextBlockNode(context, targetBlock)) return []

        const patches: Patch[] = [
          unset([{_key: block._key}, 'children', {_key: child._key}]),
        ]

        const isSameBlock = path[0] === newPath[0]
        const isMovingForward = isSameBlock && path[1] < newPath[1]

        // When moving forward within the same block, insert after the child at newPath
        // When moving backward or between blocks, insert before the child at newPath
        const targetChild = targetBlock.children.at(newPath[1])
        const position = isMovingForward ? 'after' : 'before'

        if (targetChild) {
          patches.push(
            insert([child], position, [
              {_key: targetBlock._key},
              'children',
              {_key: targetChild._key},
            ]),
          )
        } else {
          // Target index doesn't exist, insert at the end
          const lastChild =
            targetBlock.children[targetBlock.children.length - 1]
          if (lastChild) {
            patches.push(
              insert([child], 'after', [
                {_key: targetBlock._key},
                'children',
                {_key: lastChild._key},
              ]),
            )
          }
        }

        return patches
      }

      return []
    }

    case 'set_node': {
      const {path, properties, newProperties} = operation
      const patches: Patch[] = []

      if (path.length === 1) {
        const blockIndex = path[0]
        const block = value.at(blockIndex)
        if (!block) {
          return []
        }

        // Check for cases where key-based paths would be problematic:
        // 1. Block is missing _key
        // 2. Duplicate block keys
        const needsCoarsePatch =
          !block._key || value.filter((b) => b._key === block._key).length > 1

        if (needsCoarsePatch) {
          // Use coarse patch to avoid ambiguity
          // Use a mutable record that we'll assign back to the value array
          const updatedBlock: PortableTextBlock & Record<string, unknown> = {
            ...block,
          }

          if (isTextBlockNode(context, block)) {
            for (const [key, val] of Object.entries(newProperties)) {
              if (key === 'children' || key === 'text') continue
              if (val == null) {
                delete updatedBlock[key]
              } else {
                updatedBlock[key] = val
              }
            }
            for (const key of Object.keys(properties)) {
              if (!(key in newProperties)) {
                delete updatedBlock[key]
              }
            }
          } else {
            const valueBefore = getRecordValue(properties, 'value')
            const valueAfter = getRecordValue(newProperties, 'value')

            for (const [key, val] of Object.entries(newProperties)) {
              if (key === 'value') continue
              if (val == null) {
                delete updatedBlock[key]
              } else {
                updatedBlock[key] = val
              }
            }
            for (const key of Object.keys(properties)) {
              if (key === 'value') continue
              if (!(key in newProperties)) {
                delete updatedBlock[key]
              }
            }
            for (const [key, val] of Object.entries(valueAfter)) {
              if (val == null) {
                delete updatedBlock[key]
              } else {
                updatedBlock[key] = val
              }
            }
            for (const key of Object.keys(valueBefore)) {
              if (!(key in valueAfter)) {
                delete updatedBlock[key]
              }
            }
          }

          const newValue = [...value]
          newValue[blockIndex] = updatedBlock
          return [set(newValue, [])]
        }

        // No duplicate keys - use granular patches
        // Important: If _key is being changed, it must be the LAST patch
        let keyPatch: Patch | undefined

        if (isTextBlockNode(context, block)) {
          for (const [key, val] of Object.entries(newProperties)) {
            if (key === 'children' || key === 'text') continue
            if (key === '_key' && val !== block._key) {
              // Save _key patch for last
              keyPatch = set(val, [{_key: block._key}, '_key'])
              continue
            }
            if (val == null) {
              patches.push(unset([{_key: block._key}, key]))
            } else {
              patches.push(set(val, [{_key: block._key}, key]))
            }
          }
          for (const key of Object.keys(properties)) {
            if (!(key in newProperties)) {
              patches.push(unset([{_key: block._key}, key]))
            }
          }
        } else {
          const valueBefore = getRecordValue(properties, 'value')
          const valueAfter = getRecordValue(newProperties, 'value')

          for (const [key, val] of Object.entries(newProperties)) {
            if (key === 'value') continue
            if (key === '_key' && val !== block._key) {
              // Save _key patch for last
              keyPatch = set(val, [{_key: block._key}, '_key'])
              continue
            }
            if (val == null) {
              patches.push(unset([{_key: block._key}, key]))
            } else {
              patches.push(set(val, [{_key: block._key}, key]))
            }
          }
          for (const key of Object.keys(properties)) {
            if (key === 'value') continue
            if (!(key in newProperties)) {
              patches.push(unset([{_key: block._key}, key]))
            }
          }
          for (const key of Object.keys(valueAfter)) {
            const val = valueAfter[key]
            if (val == null) {
              patches.push(unset([{_key: block._key}, key]))
            } else {
              patches.push(set(val, [{_key: block._key}, key]))
            }
          }
          for (const key of Object.keys(valueBefore)) {
            if (!(key in valueAfter)) {
              patches.push(unset([{_key: block._key}, key]))
            }
          }
        }

        // Add _key patch last so other patches can still reference the old key
        if (keyPatch) {
          patches.push(keyPatch)
        }

        return patches
      }

      if (path.length === 2) {
        const block = value.at(path[0])
        if (!block || !isTextBlockNode(context, block)) return []

        const childIndex = path[1]
        const child = block.children.at(childIndex)
        if (!child) {
          return []
        }

        // Check for cases where key-based paths would be problematic:
        // 1. Child is missing _key
        // 2. Duplicate child keys
        const needsCoarsePatch =
          !child._key ||
          block.children.filter((c) => c._key === child._key).length > 1

        if (needsCoarsePatch) {
          // Use coarse patch to avoid ambiguity
          // Use intersection type to allow dynamic property access
          const updatedChild: (typeof block.children)[number] &
            Record<string, unknown> = {...child}

          if (isPartialSpanNode(child)) {
            for (const [key, val] of Object.entries(newProperties)) {
              if (val == null) {
                delete updatedChild[key]
              } else {
                updatedChild[key] = val
              }
            }
          } else {
            const valueBefore = getRecordValue(properties, 'value')
            const valueAfter = getRecordValue(newProperties, 'value')

            for (const [key, val] of Object.entries(newProperties)) {
              if (key === 'value') continue
              if (val == null) {
                delete updatedChild[key]
              } else {
                updatedChild[key] = val
              }
            }
            for (const key of Object.keys(properties)) {
              if (key === 'value') continue
              if (!(key in newProperties)) {
                delete updatedChild[key]
              }
            }
            for (const [key, val] of Object.entries(valueAfter)) {
              if (val == null) {
                delete updatedChild[key]
              } else {
                updatedChild[key] = val
              }
            }
            for (const key of Object.keys(valueBefore)) {
              if (!(key in valueAfter)) {
                delete updatedChild[key]
              }
            }
          }

          const newChildren = [...block.children]
          newChildren[childIndex] = updatedChild
          return [set(newChildren, [{_key: block._key}, 'children'])]
        }

        // No duplicate keys - use granular patches
        // Important: If _key is being changed, it must be the LAST patch
        // because subsequent patches reference the old _key in their path
        let keyPatch: Patch | undefined

        if (isPartialSpanNode(child)) {
          for (const [key, val] of Object.entries(newProperties)) {
            if (key === 'text') continue
            if (key === '_key' && val !== child._key) {
              // Save _key patch for last
              keyPatch = set(val, [
                {_key: block._key},
                'children',
                {_key: child._key},
                '_key',
              ])
              continue
            }
            if (val == null) {
              patches.push(
                unset([
                  {_key: block._key},
                  'children',
                  {_key: child._key},
                  key,
                ]),
              )
            } else {
              patches.push(
                set(val, [
                  {_key: block._key},
                  'children',
                  {_key: child._key},
                  key,
                ]),
              )
            }
          }
          for (const key of Object.keys(properties)) {
            if (!(key in newProperties)) {
              patches.push(
                unset([
                  {_key: block._key},
                  'children',
                  {_key: child._key},
                  key,
                ]),
              )
            }
          }
        } else {
          const valueBefore = getRecordValue(properties, 'value')
          const valueAfter = getRecordValue(newProperties, 'value')

          for (const [key, val] of Object.entries(newProperties)) {
            if (key === 'value') continue
            if (key === '_key' && val !== child._key) {
              // Save _key patch for last
              keyPatch = set(val, [
                {_key: block._key},
                'children',
                {_key: child._key},
                '_key',
              ])
              continue
            }
            if (val == null) {
              patches.push(
                unset([
                  {_key: block._key},
                  'children',
                  {_key: child._key},
                  key,
                ]),
              )
            } else {
              patches.push(
                set(val, [
                  {_key: block._key},
                  'children',
                  {_key: child._key},
                  key,
                ]),
              )
            }
          }
          for (const key of Object.keys(properties)) {
            if (key === 'value') continue
            if (!(key in newProperties)) {
              patches.push(
                unset([
                  {_key: block._key},
                  'children',
                  {_key: child._key},
                  key,
                ]),
              )
            }
          }
          for (const key of Object.keys(valueAfter)) {
            const val = valueAfter[key]
            if (val == null) {
              patches.push(
                unset([
                  {_key: block._key},
                  'children',
                  {_key: child._key},
                  key,
                ]),
              )
            } else {
              patches.push(
                set(val, [
                  {_key: block._key},
                  'children',
                  {_key: child._key},
                  key,
                ]),
              )
            }
          }
          for (const key of Object.keys(valueBefore)) {
            if (!(key in valueAfter)) {
              patches.push(
                unset([
                  {_key: block._key},
                  'children',
                  {_key: child._key},
                  key,
                ]),
              )
            }
          }
        }

        // Add _key patch last so other patches can still reference the old key
        if (keyPatch) {
          patches.push(keyPatch)
        }

        return patches
      }

      return []
    }
  }
}

/**
 * Transform an inserted node from Slate format to Portable Text format.
 * Returns the node with proper Portable Text structure.
 */
function transformInsertedNode(
  context: Pick<EditorContext, 'schema'>,
  node: unknown,
): PortableTextBlock {
  if (isTextBlockNode(context, node)) {
    // Spread the node and transform children
    return {
      ...node,
      children: node.children.map((child) => transformInsertedChild(child)),
    }
  }

  if (Element.isElement(node) && !('__inline' in node)) {
    // Block object - spread value onto the block
    const valueObj = 'value' in node && isRecord(node.value) ? node.value : {}
    return {
      _key: node._key,
      _type: node._type,
      ...valueObj,
    }
  }

  // Fallback for already valid PortableTextBlock nodes
  if (isPortableTextBlock(node)) {
    return node
  }

  throw new Error('Unable to transform node to PortableTextBlock')
}

/**
 * Type guard for PortableTextBlock
 */
function isPortableTextBlock(node: unknown): node is PortableTextBlock {
  return (
    isRecord(node) &&
    typeof node._key === 'string' &&
    typeof node._type === 'string'
  )
}

function transformInsertedChild(child: unknown): unknown {
  if (isObjectWithKey(child, '__inline')) {
    // Inline object - spread value onto the child
    return {
      _key: child._key,
      _type: child._type,
      ...(isRecord(child.value) ? child.value : {}),
    }
  }
  return child
}

/**
 * Type guard to check if a value is a non-null object
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Type guard to check if a value is a record (plain object)
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return isObject(value) && !Array.isArray(value)
}

/**
 * Type guard to check if an object has a specific key
 */
function isObjectWithKey<K extends string>(
  value: unknown,
  key: K,
): value is Record<string, unknown> &
  Record<K, unknown> & {_key: string; _type: string; value?: unknown} {
  return isRecord(value) && key in value
}

/**
 * Safely extract a record value from an object's property
 */
function getRecordValue(
  obj: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const val = obj[key]
  return isRecord(val) ? val : {}
}
