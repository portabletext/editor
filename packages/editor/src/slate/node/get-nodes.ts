import type {EditorSchema} from '../../editor/editor-schema'
import type {
  Ancestor,
  Node,
  NodeEntry,
  NodeNodesOptions,
} from '../interfaces/node'
import type {Path} from '../interfaces/path'
import {isAfterPath} from '../path/is-after-path'
import {isAncestorPath} from '../path/is-ancestor-path'
import {isBeforePath} from '../path/is-before-path'
import {nextPath} from '../path/next-path'
import {parentPath} from '../path/parent-path'
import {previousPath} from '../path/previous-path'
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
    if (to && (reverse ? isBeforePath(p, to) : isAfterPath(p, to))) {
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

      if (isAncestorPath(p, from)) {
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
      const newPath = nextPath(p)

      if (hasNode(root, newPath, schema)) {
        p = newPath
        n = getNode(root, p, schema)
        continue
      }
    }

    if (reverse && p[p.length - 1] !== 0) {
      const newPath = previousPath(p)
      p = newPath
      n = getNode(root, p, schema)
      continue
    }

    p = parentPath(p)
    n = getNode(root, p, schema)
    visited.add(n)
  }
}
