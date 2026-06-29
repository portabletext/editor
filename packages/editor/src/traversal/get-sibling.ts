import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import {parentPath} from '../engine/path/parent-path'
import {serializePath} from '../paths/serialize-path'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getChildren} from './get-children'
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
 * @beta
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
 * @beta
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

  const lastSegment = path.at(-1)

  if (!isKeyedSegment(lastSegment)) {
    return undefined
  }

  const parent = parentPath(path)
  const children = getChildren(snapshot, parent)

  // Prefer the O(1) `blockIndexMap` lookup, but validate it against the
  // resolved children before trusting it. The map can miss (an unkeyed
  // transient node) or disagree with the traversed value (a snapshot that
  // pairs the live map with a pre-apply value, e.g. `textPatch`); only then
  // fall back to an O(n) scan of `children`, which is value-derived and the
  // source of truth. Mirrors the fast-path-then-scan in `getNode`/
  // `getChildren`.
  let currentIndex = snapshot.blockIndexMap.get(serializePath(path)) ?? -1
  const mappedSegment = children[currentIndex]?.path.at(-1)

  if (
    !(isKeyedSegment(mappedSegment) && mappedSegment._key === lastSegment._key)
  ) {
    currentIndex = children.findIndex((child) => {
      const childSegment = child.path.at(-1)
      return (
        isKeyedSegment(childSegment) && childSegment._key === lastSegment._key
      )
    })
  }

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
