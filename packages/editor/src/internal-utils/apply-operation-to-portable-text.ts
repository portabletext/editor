import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {EditorContext} from '../editor/editor-snapshot'
import {Element, Path, type Node, type Operation} from '../slate'
import type {OmitFromUnion} from '../type-utils'
import {
  getNode,
  getParent,
  getSpan,
  isEditorNode,
  isObjectNode,
  isPartialSpanNode,
  isSpanNode,
  isTextBlockNode,
  type EditorNode,
  type ObjectNode,
  type SpanNode,
} from './portable-text-node'

export function applyOperationToPortableText(
  context: Pick<EditorContext, 'schema'>,
  value: Array<PortableTextBlock>,
  operation: OmitFromUnion<Operation, 'type', 'set_selection'>,
): Array<PortableTextBlock> {
  const root = {children: value} as EditorNode<EditorSchema>

  try {
    const newRoot = applyOperationToPortableTextImmutable(
      context,
      root,
      operation,
    )
    return newRoot.children as Array<PortableTextBlock>
  } catch (e) {
    console.error(e)
    return value
  }
}

function applyOperationToPortableTextImmutable(
  context: Pick<EditorContext, 'schema'>,
  root: EditorNode<EditorSchema>,
  operation: OmitFromUnion<Operation, 'type', 'set_selection'>,
): EditorNode<EditorSchema> {
  switch (operation.type) {
    case 'insert_node': {
      const {path, node: insertedNode} = operation
      const parent = getParent(context, root, path)
      const index = path[path.length - 1]!

      if (!parent) {
        return root
      }

      if (
        'children' in parent &&
        Array.isArray(parent.children) &&
        index > parent.children.length
      ) {
        return root
      }

      if (isTextBlockNode(context, parent)) {
        // Inserting a child into a text block (span or inline object)
        let newChild: SpanNode<EditorSchema> | ObjectNode | undefined

        if (isPartialSpanNode(context, insertedNode)) {
          newChild = insertedNode
        } else if ('__inline' in insertedNode) {
          newChild = {
            _key: insertedNode._key,
            _type: insertedNode._type,
            ...('value' in insertedNode &&
            typeof insertedNode.value === 'object'
              ? insertedNode.value
              : {}),
          }
        } else {
          return root
        }

        const parentPath = path.slice(0, -1)
        return updateChildrenAtPath(root, parentPath, (children) =>
          insertChildren(children, index, newChild),
        )
      }

      // Inserting a block into root or a container
      if (isTextBlockNode(context, insertedNode)) {
        const newBlock = {
          ...insertedNode,
          children: insertedNode.children.map((child) => {
            if ('__inline' in child) {
              return {
                _key: child._key,
                _type: child._type,
                ...('value' in child && typeof child['value'] === 'object'
                  ? child['value']
                  : {}),
              }
            }

            return child
          }),
        }

        const parentPath = path.slice(0, -1)
        return updateChildrenAtPath(root, parentPath, (children) =>
          insertChildren(children, index, newBlock),
        )
      }

      if (Element.isElement(insertedNode) && !('__inline' in insertedNode)) {
        const newBlock = {
          _key: insertedNode._key,
          _type: insertedNode._type,
          ...('value' in insertedNode && typeof insertedNode.value === 'object'
            ? insertedNode.value
            : {}),
        }

        const parentPath = path.slice(0, -1)
        return updateChildrenAtPath(root, parentPath, (children) =>
          insertChildren(children, index, newBlock),
        )
      }

      return root
    }

    case 'insert_text': {
      const {path, offset, text} = operation
      if (text.length === 0) {
        return root
      }

      const span = getSpan(context, root, path)
      if (!span) {
        return root
      }

      const parentPath = path.slice(0, -1)
      const childIndex = path[path.length - 1]!
      const before = span.text.slice(0, offset)
      const after = span.text.slice(offset)
      const newSpan = {...span, text: before + text + after}

      return updateChildrenAtPath(root, parentPath, (children) =>
        replaceChild(children, childIndex, newSpan),
      )
    }

    case 'merge_node': {
      const {path} = operation

      const lastPathIndex = path.at(-1)

      if (lastPathIndex === 0) {
        return root
      }

      const node = getNode(context, root, path)
      const prevPath = Path.previous(path)
      const prev = getNode(context, root, prevPath)
      const parent = getParent(context, root, path)

      if (!node || !prev || !parent) {
        return root
      }

      const index = path[path.length - 1]!
      const parentPath = path.slice(0, -1)

      if (
        isPartialSpanNode(context, node) &&
        isPartialSpanNode(context, prev)
      ) {
        // Merging spans
        const newPrev = {...prev, text: prev.text + node.text}

        return updateChildrenAtPath(root, parentPath, (children) => {
          const newChildren = replaceChild(children, index - 1, newPrev)
          return removeChildren(newChildren, index)
        })
      }

      if (isTextBlockNode(context, node) && isTextBlockNode(context, prev)) {
        // Merging blocks
        const newPrev = {
          ...prev,
          children: [...prev.children, ...node.children],
        }

        return updateChildrenAtPath(root, parentPath, (children) => {
          const newChildren = replaceChild(children, index - 1, newPrev)
          return removeChildren(newChildren, index)
        })
      }

      return root
    }

    case 'move_node': {
      const {path, newPath} = operation

      if (Path.isAncestor(path, newPath)) {
        return root
      }

      const node = getNode(context, root, path)
      const parent = getParent(context, root, path)
      const index = path[path.length - 1]!

      if (!node || !parent) {
        return root
      }

      // First, remove the node from its current position
      const removeParentPath = path.slice(0, -1)
      const newRoot = updateChildrenAtPath(root, removeParentPath, (children) =>
        removeChildren(children, index),
      )

      // This is tricky, but since the `path` and `newPath` both refer to
      // the same snapshot in time, there's a mismatch. After either
      // removing the original position, the second step's path can be out
      // of date. So instead of using the `op.newPath` directly, we
      // transform `op.path` to ascertain what the `newPath` would be after
      // the operation was applied.
      const truePath = Path.transform(path, operation)!
      const newIndex = truePath[truePath.length - 1]!
      const insertParentPath = truePath.slice(0, -1)

      return updateChildrenAtPath(newRoot, insertParentPath, (children) =>
        insertChildren(children, newIndex, node as never),
      )
    }

    case 'remove_node': {
      const {path} = operation
      const index = path[path.length - 1]!
      const parent = getParent(context, root, path)

      if (!parent) {
        return root
      }

      const parentPath = path.slice(0, -1)
      return updateChildrenAtPath(root, parentPath, (children) =>
        removeChildren(children, index),
      )
    }

    case 'remove_text': {
      const {path, offset, text} = operation

      if (text.length === 0) {
        return root
      }

      const span = getSpan(context, root, path)

      if (!span) {
        return root
      }

      const parentPath = path.slice(0, -1)
      const childIndex = path[path.length - 1]!
      const before = span.text.slice(0, offset)
      const after = span.text.slice(offset + text.length)
      const newSpan = {...span, text: before + after}

      return updateChildrenAtPath(root, parentPath, (children) =>
        replaceChild(children, childIndex, newSpan),
      )
    }

    case 'set_node': {
      const {path, properties, newProperties} = operation

      const node = getNode(context, root, path)

      if (!node) {
        return root
      }

      if (isEditorNode(node)) {
        return root
      }

      const parentPath = path.slice(0, -1)
      const index = path[path.length - 1]!

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

        const newNode = {...node}

        for (const key in newProperties) {
          if (key === 'value') {
            continue
          }

          const value = newProperties[key as keyof Partial<Node>]

          if (value == null) {
            delete newNode[key]
          } else {
            newNode[key] = value
          }
        }

        for (const key in properties) {
          if (key === 'value') {
            continue
          }

          if (!newProperties.hasOwnProperty(key)) {
            delete newNode[key]
          }
        }

        for (const key in valueAfter) {
          const value = valueAfter[key as keyof Partial<Node>]

          if (value == null) {
            delete newNode[key]
          } else {
            newNode[key] = value
          }
        }

        for (const key in valueBefore) {
          if (!valueAfter.hasOwnProperty(key)) {
            delete newNode[key]
          }
        }

        return updateChildrenAtPath(root, parentPath, (children) =>
          replaceChild(children, index, newNode),
        )
      }

      if (isTextBlockNode(context, node)) {
        const newNode = {...node}

        for (const key in newProperties) {
          if (key === 'children' || key === 'text') {
            continue
          }

          const value = newProperties[key as keyof Partial<Node>]

          if (value == null) {
            delete newNode[key]
          } else {
            newNode[key] = value
          }
        }

        // properties that were previously defined, but are now missing, must be deleted
        for (const key in properties) {
          if (!newProperties.hasOwnProperty(key)) {
            delete newNode[key]
          }
        }

        return updateChildrenAtPath(root, parentPath, (children) =>
          replaceChild(children, index, newNode),
        )
      }

      if (isPartialSpanNode(context, node)) {
        const newNode = {...node}

        for (const key in newProperties) {
          if (key === 'text') {
            continue
          }

          const value = newProperties[key as keyof Partial<Node>]

          if (value == null) {
            delete newNode[key]
          } else {
            newNode[key] = value
          }
        }

        // properties that were previously defined, but are now missing, must be deleted
        for (const key in properties) {
          if (!newProperties.hasOwnProperty(key)) {
            delete newNode[key]
          }
        }

        return updateChildrenAtPath(root, parentPath, (children) =>
          replaceChild(children, index, newNode),
        )
      }

      return root
    }

    case 'split_node': {
      const {path, position, properties} = operation

      if (path.length === 0) {
        return root
      }

      const parent = getParent(context, root, path)
      const node = getNode(context, root, path)
      const index = path[path.length - 1]!
      const parentPath = path.slice(0, -1)

      if (!parent || !node) {
        return root
      }

      if (isTextBlockNode(context, node)) {
        // Splitting a text block: divide its children
        const before = node.children.slice(0, position)
        const after = node.children.slice(position)
        const updatedTextBlockNode = {...node, children: before}

        // _key is deliberately left out
        const newTextBlockNode = {
          ...properties,
          children: after,
          _type: context.schema.block.name,
        }

        return updateChildrenAtPath(root, parentPath, (children) =>
          insertChildren(
            replaceChild(children, index, updatedTextBlockNode),
            index + 1,
            newTextBlockNode,
          ),
        )
      }

      if (isSpanNode(context, node)) {
        // Splitting a span: divide its text
        const before = node.text.slice(0, position)
        const after = node.text.slice(position)
        const updatedSpanNode = {...node, text: before}

        // _key is deliberately left out
        const newSpanNode = {
          ...properties,
          text: after,
        }

        return updateChildrenAtPath(root, parentPath, (children) =>
          insertChildren(
            replaceChild(children, index, updatedSpanNode),
            index + 1,
            newSpanNode,
          ),
        )
      }

      return root
    }
  }
}

function insertChildren<T>(children: T[], index: number, ...nodes: T[]): T[] {
  return [...children.slice(0, index), ...nodes, ...children.slice(index)]
}

function removeChildren<T>(children: T[], index: number, count = 1): T[] {
  return [...children.slice(0, index), ...children.slice(index + count)]
}

function replaceChild<T>(children: T[], index: number, newChild: T): T[] {
  return [...children.slice(0, index), newChild, ...children.slice(index + 1)]
}

/**
 * Immutably update a node's children at the given parent path.
 * Rebuilds the tree from root down to the target parent.
 *
 * `parentPath` is the path to the node whose children should be updated.
 * `updater` receives the current children array and returns the new one.
 */
function updateChildrenAtPath(
  root: EditorNode<EditorSchema>,
  parentPath: Path,
  updater: (children: Array<unknown>) => Array<unknown>,
): EditorNode<EditorSchema> {
  if (parentPath.length === 0) {
    return {
      ...root,
      children: updater(root.children) as EditorNode<EditorSchema>['children'],
    }
  }

  // Rebuild the tree immutably from root to the target parent
  // biome-ignore lint/suspicious/noExplicitAny: walking a heterogeneous tree
  function rebuild(node: any, depth: number): any {
    const index = parentPath[depth]!
    const child = node.children?.[index]

    if (!child) {
      return node
    }

    if (depth === parentPath.length - 1) {
      // This child is the target parent, update its children
      const newChild = {
        ...child,
        children: updater(child.children),
      }
      return {
        ...node,
        children: replaceChild(node.children, index, newChild),
      }
    }

    // Recurse deeper
    const newChild = rebuild(child, depth + 1)
    return {
      ...node,
      children: replaceChild(node.children, index, newChild),
    }
  }

  return rebuild(root, 0)
}
