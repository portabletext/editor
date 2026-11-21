import type {PortableTextBlock, PortableTextSpan} from '@portabletext/schema'
import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import type {Containers} from '../schema/container-types'
import {everyPath, everyChildren} from './every-field'
import type {TraversalSnapshot} from './traversal-snapshot'
import {childEntries, walkedNode, walkPath} from './walk-path'

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
export function getSibling<TMatch extends PortableTextBlock | PortableTextSpan>(
  snapshot: TraversalSnapshot & {context: {containers: Containers}},
  path: Path,
  options: {
    direction: 'next' | 'previous'
    match: (
      node: PortableTextBlock | PortableTextSpan,
      path: Path,
    ) => node is TMatch
  },
): {node: TMatch; path: Path} | undefined
/**
 * @public
 */
export function getSibling(
  snapshot: TraversalSnapshot & {context: {containers: Containers}},
  path: Path,
  options: {
    direction: 'next' | 'previous'
    match?: (node: PortableTextBlock | PortableTextSpan, path: Path) => boolean
  },
): {node: PortableTextBlock | PortableTextSpan; path: Path} | undefined
/** @public */
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
    match?(node: Node, path: Path): boolean
  },
): {node: Node; path: Path} | undefined {
  const {direction, match} = options

  if (snapshot.context.containers === undefined) {
    const resolved = everyPath(snapshot, path)
    const entry = resolved.found ? resolved.nodes.at(-1) : undefined
    if (!entry || resolved.invalid) {
      return undefined
    }
    const parent = resolved.nodes.at(-2)
    const children = everyChildren(snapshot, parent?.path ?? [])
    const index = children.findIndex((child) => child.node === entry.node)
    const candidates =
      direction === 'next'
        ? children.slice(index + 1)
        : children.slice(0, index).reverse()
    return match
      ? candidates.find((child) => match(child.node, child.path))
      : candidates[0]
  }
  const walk = walkPath(snapshot, path)
  const node = walkedNode(walk)

  if (walk.status !== 'found' || !node) {
    return undefined
  }

  const children = childEntries(snapshot.context.value, walk.nodes.at(-2))
  const currentIndex =
    children.length === node.siblings.length
      ? node.index
      : children.findIndex((entry) => entry.node === node.node)

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
