import type {EditorSchema} from '../editor/editor-schema'
import type {Containers} from '../schema/resolve-containers'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getNodeChildren} from './get-children'

/**
 * Determine if a node at the given path is a leaf.
 *
 * A leaf node cannot have children. Spans and non-editable object nodes are
 * leaves. Text blocks and editable container objects are not.
 */
export function isLeaf(
  context: {
    schema: EditorSchema
    containers: Containers
    value: Array<Node>
  },
  path: Path,
): boolean {
  if (path.length === 0) {
    return false
  }

  const traversalContext = {
    schema: context.schema,
    containers: context.containers,
  }

  let currentChildren: Array<Node> = context.value
  let scopePath = ''

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

    const next = getNodeChildren(traversalContext, node, scopePath)

    if (i === path.length - 1) {
      return next === undefined
    }

    if (!next) {
      return false
    }

    currentChildren = next.children
    scopePath = next.scopePath
  }

  return false
}
