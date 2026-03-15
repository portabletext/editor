import {end} from '../slate/editor/end'
import {isEdge} from '../slate/editor/is-edge'
import {isEnd} from '../slate/editor/is-end'
import {nodes} from '../slate/editor/nodes'
import {pathRef} from '../slate/editor/path-ref'
import {withoutNormalizing} from '../slate/editor/without-normalizing'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import type {Point} from '../slate/interfaces/point'
import {extractProps} from '../slate/node/extract-props'
import {getNode} from '../slate/node/get-node'
import {nextPath} from '../slate/path/next-path'
import {isText} from '../slate/text/is-text'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {applySelect} from './apply-selection'
import {applySplitNode} from './apply-split-node'

/**
 * Insert a node at a known path and optionally select the end of the
 * inserted node.
 */
export function applyInsertNodeAtPath(
  editor: PortableTextSlateEditor,
  node: Node,
  path: Path,
): void {
  editor.apply({type: 'insert_node', path, node})

  const point = end(editor, path)

  if (point) {
    applySelect(editor, point)
  }
}

/**
 * Insert a node at a Point, splitting the existing text node if needed,
 * and optionally select the end of the inserted node.
 */
export function applyInsertNodeAtPoint(
  editor: PortableTextSlateEditor,
  node: Node,
  at: Point,
): void {
  withoutNormalizing(editor, () => {
    const match = isText(node, editor.schema)
      ? (n: Node) => isText(n, editor.schema)
      : (n: Node) => isText(n, editor.schema) || editor.isObjectNode(n)

    const [entry] = nodes(editor, {
      at: at.path,
      match,
      mode: 'lowest',
      voids: false,
    })

    if (!entry) {
      return
    }

    const [, matchPath] = entry
    const ref = pathRef(editor, matchPath)
    const isAtEnd = isEnd(editor, at, matchPath)

    // Split the node at the point if we're not at an edge
    if (!isEdge(editor, at, matchPath)) {
      const textNode = getNode(editor, at.path, editor.schema)
      const properties = extractProps(textNode, editor.schema)

      applySplitNode(editor, at.path, at.offset, properties)
    }

    const path = ref.unref()!
    const insertPath = isAtEnd ? nextPath(path) : path

    editor.apply({type: 'insert_node', path: insertPath, node})

    const point = end(editor, insertPath)

    if (point) {
      applySelect(editor, point)
    }
  })
}
