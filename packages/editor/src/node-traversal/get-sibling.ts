import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import {parentPath} from '../engine/path/parent-path'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getChildren} from './get-children'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Get the next or previous sibling of the node at a given path.
 *
 * @beta
 */
export function getSibling(
  snapshot: TraversalSnapshot,
  path: Path,
  direction: 'next' | 'previous',
): {node: Node; path: Path} | undefined {
  if (path.length === 0) {
    return undefined
  }

  const lastSegment = path.at(-1)

  if (!isKeyedSegment(lastSegment)) {
    return undefined
  }

  const parent = parentPath(path)
  const children = getChildren(snapshot, parent)

  const currentIndex = children.findIndex(
    (child) => child.node._key === lastSegment._key,
  )

  if (currentIndex === -1) {
    return undefined
  }

  const siblingIndex =
    direction === 'next' ? currentIndex + 1 : currentIndex - 1

  if (siblingIndex < 0 || siblingIndex >= children.length) {
    return undefined
  }

  return children[siblingIndex]
}
