import {PortableTextBlock} from '@sanity/types'
import {createDraft, finishDraft} from 'immer'
import {
  Ancestor,
  Descendant,
  Editor,
  NodeEntry,
  Operation,
  Path,
  Point,
  Scrubber,
  Text,
} from 'slate'
import {PTNode} from './pt-node'

export function applyOpToPT(
  value: {children: Array<PortableTextBlock>},
  op: Operation,
) {
  const draft = createDraft(value)

  // let newValue = value

  try {
    applyToDraft(draft, op)
  } catch (e) {
    console.error(e)
  }

  return finishDraft(draft)
}

const applyToDraft = (
  editor: {children: Array<PortableTextBlock>},
  op: Operation,
) => {
  switch (op.type) {
    case 'insert_node': {
      const {path, node} = op
      const parent = PTNode.parent(editor, path)
      const index = path[path.length - 1]

      if (index > parent.children.length) {
        throw new Error(
          `Cannot apply an "insert_node" operation at path [${path}] because the destination is past the end of the node.`,
        )
      }

      parent.children.splice(index, 0, node)

      break
    }

    case 'insert_text': {
      const {path, offset, text} = op
      if (text.length === 0) break
      const node = PTNode.leaf(editor, path)
      const before = node.text.slice(0, offset)
      const after = node.text.slice(offset)
      node.text = before + text + after

      break
    }

    case 'merge_node': {
      const {path} = op
      const node = PTNode.get(editor, path)
      const prevPath = Path.previous(path)
      const prev = PTNode.get(editor, prevPath)
      const parent = PTNode.parent(editor, path)
      const index = path[path.length - 1]

      if (Text.isText(node) && Text.isText(prev)) {
        prev.text += node.text
      } else if (!Text.isText(node) && !Text.isText(prev)) {
        prev.children.push(...node.children)
      } else {
        throw new Error(
          `Cannot apply a "merge_node" operation at path [${path}] to nodes of different interfaces: ${Scrubber.stringify(
            node,
          )} ${Scrubber.stringify(prev)}`,
        )
      }

      parent.children.splice(index, 1)

      break
    }

    case 'move_node': {
      const {path, newPath} = op

      if (Path.isAncestor(path, newPath)) {
        throw new Error(
          `Cannot move a path [${path}] to new path [${newPath}] because the destination is inside itself.`,
        )
      }

      const node = PTNode.get(editor, path)
      const parent = PTNode.parent(editor, path)
      const index = path[path.length - 1]

      // This is tricky, but since the `path` and `newPath` both refer to
      // the same snapshot in time, there's a mismatch. After either
      // removing the original position, the second step's path can be out
      // of date. So instead of using the `op.newPath` directly, we
      // transform `op.path` to ascertain what the `newPath` would be after
      // the operation was applied.
      parent.children.splice(index, 1)
      const truePath = Path.transform(path, op)!
      const newParent = PTNode.get(editor, Path.parent(truePath)) as Ancestor
      const newIndex = truePath[truePath.length - 1]

      newParent.children.splice(newIndex, 0, node)

      break
    }

    case 'remove_node': {
      const {path} = op
      const index = path[path.length - 1]
      const parent = PTNode.parent(editor, path)
      parent.children.splice(index, 1)

      break
    }

    case 'remove_text': {
      const {path, offset, text} = op
      if (text.length === 0) break
      const node = PTNode.leaf(editor, path)
      const before = node.text.slice(0, offset)
      const after = node.text.slice(offset + text.length)
      node.text = before + after

      break
    }

    case 'set_node': {
      const {path, properties, newProperties} = op

      if (path.length === 0) {
        throw new Error(`Cannot set properties on the root node!`)
      }

      const node = PTNode.get(editor, path)

      for (const key in newProperties) {
        if (key === 'children' || key === 'text') {
          throw new Error(`Cannot set the "${key}" property of nodes!`)
        }

        const value = newProperties[<keyof PTNode>key]

        if (value == null) {
          delete node[<keyof PTNode>key]
        } else {
          node[<keyof PTNode>key] = value
        }
      }

      // properties that were previously defined, but are now missing, must be deleted
      for (const key in properties) {
        if (!newProperties.hasOwnProperty(key)) {
          delete node[<keyof PTNode>key]
        }
      }

      break
    }

    case 'set_selection': {
      break
    }

    case 'split_node': {
      const {path, position, properties} = op

      if (path.length === 0) {
        throw new Error(
          `Cannot apply a "split_node" operation at path [${path}] because the root node cannot be split.`,
        )
      }

      const node = PTNode.get(editor, path)
      const parent = PTNode.parent(editor, path)
      const index = path[path.length - 1]
      let newNode: Descendant

      if (Text.isText(node)) {
        const before = node.text.slice(0, position)
        const after = node.text.slice(position)
        node.text = before
        newNode = {
          ...(properties as Partial<Text>),
          text: after,
        }
      } else {
        const before = node.children.slice(0, position)
        const after = node.children.slice(position)
        node.children = before

        newNode = {
          ...(properties as Partial<Element>),
          children: after,
        }
      }

      parent.children.splice(index + 1, 0, newNode)

      break
    }
  }

  return editor
}
