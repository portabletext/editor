import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getNodeChildren} from './get-children'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Determine if a node at the given path is a leaf.
 *
 * A leaf node cannot have children. Spans and non-editable object nodes are
 * leaves. Text blocks and editable container objects are not.
 *
 * @beta
 */
export function isLeaf(snapshot: TraversalSnapshot, path: Path): boolean {
  if (path.length === 0) {
    return false
  }

  let currentChildren: Array<Node> = snapshot.context.value
  let currentParent:
    | import('../schema/resolve-containers').RegisteredContainer
    | undefined

  for (let i = 0; i < path.length; i++) {
    const segment = path[i]!
    let node: Node | undefined

    if (isKeyedSegment(segment)) {
      node = currentChildren.find((child) => child._key === segment._key)
    } else if (typeof segment === 'number') {
      node = currentChildren.at(segment)
    } else {
      continue
    }

    if (!node) {
      return false
    }

    const next = getNodeChildren(snapshot.context, node, currentParent)

    if (i === path.length - 1) {
      return next === undefined
    }

    if (!next) {
      return false
    }

    currentChildren = next.children
    currentParent = next.parent
  }

  return false
}
