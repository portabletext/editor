import type {PortableTextBlock} from '@portabletext/schema'
import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import type {Containers} from '../schema/container-types'
import {everyAncestors} from './every-field'
import type {TraversalSnapshot} from './traversal-snapshot'
import {walkParent} from './walk-path'

/**
 * Get the parent of a node at a given path.
 *
 * Without a registry, a parent may be any object, including a plain object
 * field or a span with object fields.
 *
 * When `match` is provided and the parent does not satisfy it, returns
 * `undefined`.
 *
 * @public
 */
export function getParent<TMatch extends PortableTextBlock>(
  snapshot: TraversalSnapshot & {context: {containers: Containers}},
  path: Path,
  options: {
    match: (node: PortableTextBlock, path: Path) => node is TMatch
  },
): {node: TMatch; path: Path} | undefined
/**
 * @public
 */
export function getParent(
  snapshot: TraversalSnapshot & {context: {containers: Containers}},
  path: Path,
  options?: {
    match?: (node: PortableTextBlock, path: Path) => boolean
  },
): {node: PortableTextBlock; path: Path} | undefined
/** @public */
export function getParent<TMatch extends Node>(
  snapshot: TraversalSnapshot,
  path: Path,
  options: {
    match: (node: Node, path: Path) => node is TMatch
  },
): {node: TMatch; path: Path} | undefined
/**
 * @public
 */
export function getParent(
  snapshot: TraversalSnapshot,
  path: Path,
  options?: {
    match?: (node: Node, path: Path) => boolean
  },
): {node: Node; path: Path} | undefined
export function getParent(
  snapshot: TraversalSnapshot,
  path: Path,
  options?: {
    match?(node: Node, path: Path): boolean
  },
): {node: Node; path: Path} | undefined {
  const entry =
    snapshot.context.containers === undefined
      ? everyAncestors(snapshot, path)[0]
      : walkParent(snapshot, path)

  if (!entry) {
    return undefined
  }

  const result = {node: entry.node, path: entry.path}

  if (options?.match && !options.match(result.node, result.path)) {
    return undefined
  }

  return result
}
