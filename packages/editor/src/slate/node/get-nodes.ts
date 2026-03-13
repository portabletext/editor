import type {EditorSchema} from '../../editor/editor-schema'
import type {
  Ancestor,
  Node,
  NodeEntry,
  NodeNodesOptions,
} from '../interfaces/node'
import {Path} from '../interfaces/path'
import {getNode} from './get-node'
import {hasNode} from './has-node'
import {isLeaf} from './is-leaf'

export function* getNodes(
  root: Node,
  schema: EditorSchema,
  options: NodeNodesOptions = {},
): Generator<NodeEntry, void, undefined> {
  const {pass, reverse = false} = options
  const {from = [], to} = options
  const visited = new Set()
  let p: Path = []
  let n = root

  while (true) {
    if (to && (reverse ? Path.isBefore(p, to) : Path.isAfter(p, to))) {
      break
    }

    if (!visited.has(n)) {
      yield [n, p]
    }

    if (
      !visited.has(n) &&
      !isLeaf(n, schema) &&
      (n as Ancestor).children.length !== 0 &&
      (pass == null || pass([n, p]) === false)
    ) {
      visited.add(n)
      const children = (n as Ancestor).children
      let nextIndex = reverse ? children.length - 1 : 0

      if (Path.isAncestor(p, from)) {
        nextIndex = from[p.length]!
      }

      p = p.concat(nextIndex)
      n = getNode(root, p, schema)
      continue
    }

    if (p.length === 0) {
      break
    }

    if (!reverse) {
      const newPath = Path.next(p)

      if (hasNode(root, newPath, schema)) {
        p = newPath
        n = getNode(root, p, schema)
        continue
      }
    }

    if (reverse && p[p.length - 1] !== 0) {
      const newPath = Path.previous(p)
      p = newPath
      n = getNode(root, p, schema)
      continue
    }

    p = Path.parent(p)
    n = getNode(root, p, schema)
    visited.add(n)
  }
}
