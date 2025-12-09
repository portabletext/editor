import type {PortableTextBlock} from '@sanity/types'
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
  type EditorNode,
  type ObjectNode,
  type SpanNode,
  type TextBlockNode,
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
      const index = path[path.length - 1]

      if (!parent) {
        return root
      }

      if (index > parent.children.length) {
        return root
      }

      if (path.length === 1) {
        // Inserting block at the root

        if (isTextBlockNode(context, insertedNode)) {
          // Text blocks can be inserted as is
          const newBlock = {
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
          }

          return {
            ...root,
            children: insertChildren(root.children, index, newBlock),
          }
        }

        if (Element.isElement(insertedNode) && !('__inline' in insertedNode)) {
          // Void blocks have to have their `value` spread onto the block
          const newBlock = {
            _key: insertedNode._key,
            _type: insertedNode._type,
            ...('value' in insertedNode &&
            typeof insertedNode.value === 'object'
              ? insertedNode.value
              : {}),
          }

          return {
            ...root,
            children: insertChildren(root.children, index, newBlock),
          }
        }
      }

      if (path.length === 2) {
        // Inserting children into blocks
        const blockIndex = path[0]

        if (!isTextBlockNode(context, parent)) {
          // Only text blocks can have children
          return root
        }

        let newChild: SpanNode<EditorSchema> | ObjectNode | undefined

        if (isPartialSpanNode(insertedNode)) {
          // Text nodes can be inserted as is
          newChild = insertedNode
        } else if ('__inline' in insertedNode) {
          // Void children have to have their `value` spread onto the block
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

        return updateTextBlockAtIndex(context, root, blockIndex, (block) => ({
          ...block,
          children: insertChildren(block.children, index, newChild),
        }))
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

      const blockIndex = path[0]
      const childIndex = path[1]
      const before = span.text.slice(0, offset)
      const after = span.text.slice(offset)
      const newSpan = {...span, text: before + text + after}

      return updateTextBlockAtIndex(context, root, blockIndex, (block) => ({
        ...block,
        children: replaceChild(block.children, childIndex, newSpan),
      }))
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

      const index = path[path.length - 1]

      if (isPartialSpanNode(node) && isPartialSpanNode(prev)) {
        // Merging spans
        const blockIndex = path[0]
        const newPrev = {...prev, text: prev.text + node.text}

        return updateTextBlockAtIndex(context, root, blockIndex, (block) => {
          const newChildren = replaceChild(
            block.children,
            index - 1,
            newPrev as never,
          )
          return {
            ...block,
            children: removeChildren(newChildren, index),
          }
        })
      }

      if (isTextBlockNode(context, node) && isTextBlockNode(context, prev)) {
        // Merging blocks
        const newPrev = {
          ...prev,
          children: [...prev.children, ...node.children],
        }
        const newChildren = replaceChild(root.children, index - 1, newPrev)
        return {
          ...root,
          children: removeChildren(newChildren, index),
        }
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
      const index = path[path.length - 1]

      if (!node || !parent) {
        return root
      }

      // First, remove the node from its current position
      let newRoot: EditorNode<EditorSchema>

      if (path.length === 1) {
        // Removing block from root
        newRoot = {
          ...root,
          children: removeChildren(root.children, index),
        }
      } else if (path.length === 2) {
        // Removing child from block
        const blockIndex = path[0]
        newRoot = updateTextBlockAtIndex(
          context,
          root,
          blockIndex,
          (block) => ({
            ...block,
            children: removeChildren(block.children, index),
          }),
        )
      } else {
        return root
      }

      // This is tricky, but since the `path` and `newPath` both refer to
      // the same snapshot in time, there's a mismatch. After either
      // removing the original position, the second step's path can be out
      // of date. So instead of using the `op.newPath` directly, we
      // transform `op.path` to ascertain what the `newPath` would be after
      // the operation was applied.
      const truePath = Path.transform(path, operation)!
      const newIndex = truePath[truePath.length - 1]

      if (truePath.length === 1) {
        // Inserting block at root
        return {
          ...newRoot,
          children: insertChildren(newRoot.children, newIndex, node as never),
        }
      }

      if (truePath.length === 2) {
        // Inserting child into block
        const newBlockIndex = truePath[0]
        const newParent = newRoot.children[newBlockIndex]

        if (!newParent || !isTextBlockNode(context, newParent)) {
          return root
        }

        return updateTextBlockAtIndex(
          context,
          newRoot,
          newBlockIndex,
          (block) => ({
            ...block,
            children: insertChildren(block.children, newIndex, node as never),
          }),
        )
      }

      return root
    }

    case 'remove_node': {
      const {path} = operation
      const index = path[path.length - 1]
      const parent = getParent(context, root, path)

      if (!parent) {
        return root
      }

      if (path.length === 1) {
        // Removing block from root
        return {
          ...root,
          children: removeChildren(root.children, index),
        }
      }

      if (path.length === 2) {
        // Removing child from block
        const blockIndex = path[0]
        return updateTextBlockAtIndex(context, root, blockIndex, (block) => ({
          ...block,
          children: removeChildren(block.children, index),
        }))
      }

      return root
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

      const blockIndex = path[0]
      const childIndex = path[1]
      const before = span.text.slice(0, offset)
      const after = span.text.slice(offset + text.length)
      const newSpan = {...span, text: before + after}

      return updateTextBlockAtIndex(context, root, blockIndex, (block) => ({
        ...block,
        children: replaceChild(block.children, childIndex, newSpan as never),
      }))
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

        if (path.length === 1) {
          return {
            ...root,
            children: replaceChild(root.children, path[0], newNode),
          }
        }

        if (path.length === 2) {
          return updateTextBlockAtIndex(context, root, path[0], (block) => ({
            ...block,
            children: replaceChild(block.children, path[1], newNode),
          }))
        }

        return root
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

        return {
          ...root,
          children: replaceChild(root.children, path[0], newNode),
        }
      }

      if (isPartialSpanNode(node)) {
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

        return updateTextBlockAtIndex(context, root, path[0], (block) => ({
          ...block,
          children: replaceChild(block.children, path[1], newNode),
        }))
      }

      return root
    }

    case 'split_node': {
      const {path, position, properties} = operation

      if (path.length === 0) {
        return root
      }

      const parent = getParent(context, root, path)
      const index = path[path.length - 1]

      if (!parent) {
        return root
      }

      if (isEditorNode(parent)) {
        const block = getBlock(root, path)

        if (!block || !isTextBlockNode(context, block)) {
          return root
        }

        const before = block.children.slice(0, position)
        const after = block.children.slice(position)
        const updatedTextBlockNode = {...block, children: before}

        // _key is deliberately left out
        const newTextBlockNode = {
          ...properties,
          children: after,
          _type: context.schema.block.name,
        }

        return {
          ...root,
          children: insertChildren(
            replaceChild(root.children, index, updatedTextBlockNode),
            index + 1,
            newTextBlockNode,
          ),
        }
      }

      if (isTextBlockNode(context, parent)) {
        const node = getNode(context, root, path)

        if (!node || !isSpanNode(context, node)) {
          return root
        }

        const blockIndex = path[0]
        const before = node.text.slice(0, position)
        const after = node.text.slice(position)
        const updatedSpanNode = {...node, text: before}

        // _key is deliberately left out
        const newSpanNode = {
          ...properties,
          text: after,
        }

        return updateTextBlockAtIndex(context, root, blockIndex, (block) => {
          return {
            ...block,
            children: insertChildren(
              replaceChild(block.children, index, updatedSpanNode),
              index + 1,
              newSpanNode,
            ),
          }
        })
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

function updateTextBlockAtIndex(
  context: Pick<EditorContext, 'schema'>,
  root: EditorNode<EditorSchema>,
  blockIndex: number,
  updater: (block: TextBlockNode<EditorSchema>) => TextBlockNode<EditorSchema>,
): EditorNode<EditorSchema> {
  const block = root.children.at(blockIndex)

  if (!block) {
    return root
  }

  if (!isTextBlockNode(context, block)) {
    return root
  }

  const newBlock = updater(block)

  return {
    ...root,
    children: replaceChild(root.children, blockIndex, newBlock),
  }
}
