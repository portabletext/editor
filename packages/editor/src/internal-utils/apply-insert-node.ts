import {isSpan} from '@portabletext/schema'
import {getNode} from '../node-traversal/get-node'
import {end} from '../slate/editor/end'
import {isEdge} from '../slate/editor/is-edge'
import {isEnd} from '../slate/editor/is-end'
import {pathRef} from '../slate/editor/path-ref'
import {withoutNormalizing} from '../slate/editor/without-normalizing'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import type {Point} from '../slate/interfaces/point'
import {isObjectNode} from '../slate/node/is-object-node'
import {nextPath} from '../slate/path/next-path'
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
    const match = isSpan({schema: editor.schema}, node)
      ? (n: Node) => isSpan({schema: editor.schema}, n)
      : (n: Node) =>
          isSpan({schema: editor.schema}, n) ||
          isObjectNode({schema: editor.schema}, n)

    const nodeEntry = getNode(editor, at.path)
    const entry = nodeEntry && match(nodeEntry.node) ? nodeEntry : undefined

    if (!entry) {
      return
    }

    const matchPath = entry.path
    const ref = pathRef(editor, matchPath)
    const isAtEnd = isEnd(editor, at, matchPath)

    // Split the node at the point if we're not at an edge
    if (!isEdge(editor, at, matchPath)) {
      applySplitNode(editor, at.path, at.offset)
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
