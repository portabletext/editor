import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import {parentPath} from '../engine/path/parent-path'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getChildren} from './get-children'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Walk siblings of the node at the given path in a direction, returning the
 * first sibling that matches the predicate.
 *
 * The predicate may be a type guard, in which case the returned `node` is
 * narrowed accordingly.
 */
export function findSibling<TNode extends Node = Node>(
  snapshot: TraversalSnapshot,
  path: Path,
  direction: 'next' | 'previous',
  match: (entry: {
    node: Node
    path: Path
  }) => entry is {node: TNode; path: Path},
): {node: TNode; path: Path} | undefined
export function findSibling(
  snapshot: TraversalSnapshot,
  path: Path,
  direction: 'next' | 'previous',
  match: (entry: {node: Node; path: Path}) => boolean,
): {node: Node; path: Path} | undefined
export function findSibling(
  snapshot: TraversalSnapshot,
  path: Path,
  direction: 'next' | 'previous',
  match: (entry: {node: Node; path: Path}) => boolean,
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

  const candidates =
    direction === 'next'
      ? children.slice(currentIndex + 1)
      : children.slice(0, currentIndex).reverse()

  return candidates.find(match)
}
