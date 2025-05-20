import type {PortableTextBlock} from '@sanity/types'
import {createDraft, finishDraft, type WritableDraft} from 'immer'
import {Element, Path, type Node, type Operation} from 'slate'
import type {EditorSchema} from '../editor/editor-schema'
import type {EditorContext} from '../editor/editor-snapshot'
import type {OmitFromUnion} from '../type-utils'
import {
  getBlock,
  getNode,
  getParent,
  getSpan,
  isEditorNode,
  isObjectNode,
  isPartialSpanNode,
  isSpanNode,
  isTextBlockNode,
  type PortableTextNode,
  type SpanNode,
  type TextBlockNode,
} from './portable-text-node'

export function applyOperationToPortableText(
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>,
  value: Array<PortableTextBlock>,
  operation: OmitFromUnion<Operation, 'type', 'set_selection'>,
) {
  const draft = createDraft({children: value})

  try {
    applyOperationToPortableTextDraft(context, draft, operation)
  } catch (e) {
    console.error(e)
  }

  return finishDraft(draft).children
}

function applyOperationToPortableTextDraft(
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>,
  root: WritableDraft<{
    children: Array<PortableTextBlock>
  }>,
  operation: OmitFromUnion<Operation, 'type', 'set_selection'>,
) {
  switch (operation.type) {
    case 'insert_node': {
      const {path, node: insertedNode} = operation
      const parent = getParent(context, root, path)
      const index = path[path.length - 1]

      if (!parent) {
        break
      }

      if (index > parent.children.length) {
        break
      }

      if (path.length === 1) {
        // Inserting block at the root

        if (isTextBlockNode(context, insertedNode)) {
          // Text blocks can be inserted as is

          parent.children.splice(index, 0, {
            ...insertedNode,
            children: insertedNode.children.map((child) => {
              if ('__inline' in child) {
                // Except for inline object children which need to have their
                // `value` spread onto the block
                return {
                  _key: child._key,
                  _type: child._type,
                  ...('value' in child && typeof child.value === 'object'
                    ? child.value
                    : {}),
                }
              }

              return child
            }),
          })

          break
        }

        if (Element.isElement(insertedNode) && !('__inline' in insertedNode)) {
          // Void blocks have to have their `value` spread onto the block

          parent.children.splice(index, 0, {
            _key: insertedNode._key,
            _type: insertedNode._type,
            ...('value' in insertedNode &&
            typeof insertedNode.value === 'object'
              ? insertedNode.value
              : {}),
          })
          break
        }
      }

      if (path.length === 2) {
        // Inserting children into blocks

        if (!isTextBlockNode(context, parent)) {
          // Only text blocks can have children
          break
        }

        if (isPartialSpanNode(insertedNode)) {
          // Text nodes can be inserted as is

          parent.children.splice(index, 0, insertedNode)
          break
        }

        if ('__inline' in insertedNode) {
          // Void children have to have their `value` spread onto the block

          parent.children.splice(index, 0, {
            _key: insertedNode._key,
            _type: insertedNode._type,
            ...('value' in insertedNode &&
            typeof insertedNode.value === 'object'
              ? insertedNode.value
              : {}),
          })
          break
        }
      }

      break
    }

    case 'insert_text': {
      const {path, offset, text} = operation
      if (text.length === 0) break
      const span = getSpan(context, root, path)

      if (!span) {
        break
      }

      const before = span.text.slice(0, offset)
      const after = span.text.slice(offset)
      span.text = before + text + after

      break
    }

    case 'merge_node': {
      const {path} = operation
      const node = getNode(context, root, path)
      const prevPath = Path.previous(path)
      const prev = getNode(context, root, prevPath)
      const parent = getParent(context, root, path)

      if (!node || !prev || !parent) {
        break
      }

      const index = path[path.length - 1]

      if (isPartialSpanNode(node) && isPartialSpanNode(prev)) {
        prev.text += node.text
      } else if (
        isTextBlockNode(context, node) &&
        isTextBlockNode(context, prev)
      ) {
        prev.children.push(...node.children)
      } else {
        break
      }

      parent.children.splice(index, 1)

      break
    }

    case 'move_node': {
      const {path, newPath} = operation

      if (Path.isAncestor(path, newPath)) {
        break
      }

      const node = getNode(context, root, path)
      const parent = getParent(context, root, path)
      const index = path[path.length - 1]

      if (!node || !parent) {
        break
      }

      // This is tricky, but since the `path` and `newPath` both refer to
      // the same snapshot in time, there's a mismatch. After either
      // removing the original position, the second step's path can be out
      // of date. So instead of using the `op.newPath` directly, we
      // transform `op.path` to ascertain what the `newPath` would be after
      // the operation was applied.
      parent.children.splice(index, 1)
      const truePath = Path.transform(path, operation)!
      const newParent = getNode(context, root, Path.parent(truePath))
      const newIndex = truePath[truePath.length - 1]

      if (!newParent) {
        break
      }

      if (!('children' in newParent)) {
        break
      }

      if (!Array.isArray(newParent.children)) {
        break
      }

      newParent.children.splice(newIndex, 0, node)

      break
    }

    case 'remove_node': {
      const {path} = operation
      const index = path[path.length - 1]
      const parent = getParent(context, root, path)
      parent?.children.splice(index, 1)

      break
    }

    case 'remove_text': {
      const {path, offset, text} = operation

      if (text.length === 0) {
        break
      }

      const span = getSpan(context, root, path)

      if (!span) {
        break
      }

      const before = span.text.slice(0, offset)
      const after = span.text.slice(offset + text.length)
      span.text = before + after

      break
    }

    case 'set_node': {
      const {path, properties, newProperties} = operation

      const node = getNode(context, root, path)

      if (!node) {
        break
      }

      if (isEditorNode(node)) {
        break
      }

      if (isObjectNode(context, node)) {
        const valueBefore = (
          'value' in properties && typeof properties.value === 'object'
            ? properties.value
            : {}
        ) as Partial<Node>
        const valueAfter = (
          'value' in newProperties && typeof newProperties.value === 'object'
            ? newProperties.value
            : {}
        ) as Partial<Node>

        for (const key in newProperties) {
          if (key === 'value') {
            continue
          }

          const value = newProperties[key as keyof Partial<Node>]

          if (value == null) {
            delete node[<keyof PortableTextNode<EditorSchema>>key]
          } else {
            node[<keyof PortableTextNode<EditorSchema>>key] = value
          }
        }

        for (const key in properties) {
          if (key === 'value') {
            continue
          }

          if (!newProperties.hasOwnProperty(key)) {
            delete node[<keyof PortableTextNode<EditorSchema>>key]
          }
        }

        for (const key in valueAfter) {
          const value = valueAfter[key as keyof Partial<Node>]

          if (value == null) {
            delete node[<keyof PortableTextNode<EditorSchema>>key]
          } else {
            node[<keyof PortableTextNode<EditorSchema>>key] = value
          }
        }

        for (const key in valueBefore) {
          if (!valueAfter.hasOwnProperty(key)) {
            delete node[<keyof PortableTextNode<EditorSchema>>key]
          }
        }

        break
      }

      if (isTextBlockNode(context, node)) {
        for (const key in newProperties) {
          if (key === 'children' || key === 'text') {
            break
          }

          const value = newProperties[key as keyof Partial<Node>]

          if (value == null) {
            delete node[<keyof Partial<Node>>key]
          } else {
            node[<keyof Partial<Node>>key] = value
          }
        }

        // properties that were previously defined, but are now missing, must be deleted
        for (const key in properties) {
          if (!newProperties.hasOwnProperty(key)) {
            delete node[<keyof Partial<Node>>key]
          }
        }

        break
      }

      if (isPartialSpanNode(node)) {
        for (const key in newProperties) {
          if (key === 'text') {
            break
          }

          const value = newProperties[key as keyof Partial<Node>]

          if (value == null) {
            delete node[<keyof PortableTextNode<EditorSchema>>key]
          } else {
            node[<keyof PortableTextNode<EditorSchema>>key] = value
          }
        }

        // properties that were previously defined, but are now missing, must be deleted
        for (const key in properties) {
          if (!newProperties.hasOwnProperty(key)) {
            delete node[<keyof PortableTextNode<EditorSchema>>key]
          }
        }

        break
      }

      break
    }

    case 'split_node': {
      const {path, position, properties} = operation

      if (path.length === 0) {
        break
      }

      const parent = getParent(context, root, path)
      const index = path[path.length - 1]

      if (!parent) {
        break
      }

      if (isEditorNode(parent)) {
        const block = getBlock(root, path)

        if (!block || !isTextBlockNode(context, block)) {
          break
        }

        const before = block.children.slice(0, position)
        const after = block.children.slice(position)
        block.children = before

        // _key is deliberately left out
        const newTextBlockNode = {
          ...properties,
          children: after,
          _type: context.schema.block.name,
        } as unknown as TextBlockNode<EditorSchema>

        parent.children.splice(index + 1, 0, newTextBlockNode)

        break
      }

      if (isTextBlockNode(context, parent)) {
        const node = getNode(context, root, path)

        if (!node || !isSpanNode(context, node)) {
          break
        }

        const before = node.text.slice(0, position)
        const after = node.text.slice(position)
        node.text = before

        // _key is deliberately left out
        const newSpanNode = {
          ...properties,
          text: after,
        } as unknown as SpanNode<EditorSchema>

        parent.children.splice(index + 1, 0, newSpanNode)
      }

      break
    }
  }

  return root
}
