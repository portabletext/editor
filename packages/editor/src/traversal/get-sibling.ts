import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import {parentPath} from '../engine/path/parent-path'
import {getChildren} from './get-children'
import {resolveChildEntryIndex} from './resolve-child-entry-index'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Get a sibling of the node at a given path.
 *
 * Without `match`, returns the immediate next or previous sibling.
 * With `match`, returns the first sibling in `direction` that satisfies
 * the predicate.
 *
 * When `match` is a type predicate, the returned `node` narrows to that type.
 *
 * @public
 */
export function getSibling<TMatch extends Node>(
  snapshot: TraversalSnapshot,
  path: Path,
  options: {
    direction: 'next' | 'previous'
    match: (node: Node, path: Path) => node is TMatch
  },
): {node: TMatch; path: Path} | undefined
/**
 * @public
 */
export function getSibling(
  snapshot: TraversalSnapshot,
  path: Path,
  options: {
    direction: 'next' | 'previous'
    match?: (node: Node, path: Path) => boolean
  },
): {node: Node; path: Path} | undefined
export function getSibling(
  snapshot: TraversalSnapshot,
  path: Path,
  options: {
    direction: 'next' | 'previous'
    match?: (node: Node, path: Path) => boolean
  },
): {node: Node; path: Path} | undefined {
  const {direction, match} = options

  if (path.length === 0) {
    return undefined
  }

  const parent = parentPath(path)
  const children = getChildren(snapshot, parent)

  const currentIndex = resolveChildEntryIndex(
    snapshot.blockIndexMap,
    children,
    path,
  )

  if (currentIndex === -1) {
    return undefined
  }

  if (!match) {
    const siblingIndex =
      direction === 'next' ? currentIndex + 1 : currentIndex - 1

    if (siblingIndex < 0 || siblingIndex >= children.length) {
      return undefined
    }

    return children[siblingIndex]
  }

  const candidates =
    direction === 'next'
      ? children.slice(currentIndex + 1)
      : children.slice(0, currentIndex).reverse()

  return candidates.find((child) => match(child.node, child.path))
}
