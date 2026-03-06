import {Editor, Element, Node, Path, Text, type Point} from '../slate'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {applySelect} from './apply-selection'
import {applySplitNode} from './apply-split-node'

/**
 * Insert a node at a known path and optionally select the end of the
 * inserted node.
 *
 * Replaces `Transforms.insertNodes(editor, node, {at: path, select: true})`
 * for the case where `at` is a concrete Path.
 */
export function applyInsertNodeAtPath(
  editor: PortableTextSlateEditor,
  node: Node,
  path: Path,
  options: {select?: boolean} = {},
): void {
  editor.apply({type: 'insert_node', path, node})

  if (options.select) {
    const point = Editor.end(editor, path)

    if (point) {
      applySelect(editor, point)
    }
  }
}

/**
 * Insert a node at a Point, splitting the existing text node if needed,
 * and optionally select the end of the inserted node.
 *
 * Replaces `Transforms.insertNodes(editor, node, {at: point, select: true})`
 * for the case where `at` is a Point inside a text node.
 *
 * This handles the common PTE pattern of inserting spans or inline objects
 * at the cursor position.
 */
export function applyInsertNodeAtPoint(
  editor: PortableTextSlateEditor,
  node: Node,
  at: Point,
  options: {select?: boolean} = {},
): void {
  Editor.withoutNormalizing(editor, () => {
    let match: (n: Node) => boolean

    if (Text.isText(node, editor.schema)) {
      match = (n) => Text.isText(n, editor.schema)
    } else if (
      Element.isElement(node, editor.schema) &&
      editor.isInline(node)
    ) {
      match = (n) =>
        Text.isText(n, editor.schema) ||
        (Element.isElement(n, editor.schema) && Editor.isInline(editor, n))
    } else if (editor.isObjectNode(node)) {
      match = (n) =>
        Text.isText(n, editor.schema) ||
        editor.isObjectNode(n) ||
        (Element.isElement(n, editor.schema) && Editor.isInline(editor, n))
    } else {
      match = (n) =>
        (Element.isElement(n, editor.schema) && Editor.isBlock(editor, n)) ||
        editor.isObjectNode(n)
    }

    const [entry] = Editor.nodes(editor, {
      at: at.path,
      match,
      mode: 'lowest',
      voids: false,
    })

    if (!entry) {
      return
    }

    const [, matchPath] = entry
    const pathRef = Editor.pathRef(editor, matchPath)
    const isAtEnd = Editor.isEnd(editor, at, matchPath)

    // Split the node at the point if we're not at an edge
    if (!Editor.isEdge(editor, at, matchPath)) {
      const textNode = Node.get(editor, at.path, editor.schema)
      const properties = Node.extractProps(textNode, editor.schema)

      applySplitNode(editor, at.path, at.offset, properties)
    }

    const path = pathRef.unref()!
    const insertPath = isAtEnd ? Path.next(path) : path

    editor.apply({type: 'insert_node', path: insertPath, node})

    if (options.select) {
      const point = Editor.end(editor, insertPath)

      if (point) {
        applySelect(editor, point)
      }
    }
  })
}
