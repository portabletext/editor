import type {PortableTextBlock, PortableTextSpan} from '@portabletext/schema'
import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import type {Containers} from '../schema/container-types'
import {getChildren} from './get-children'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Get the last child of a node at a given path.
 *
 * @public
 */
export function getLastChild(
  snapshot: TraversalSnapshot & {context: {containers: Containers}},
  path: Path,
): {node: PortableTextBlock | PortableTextSpan; path: Path} | undefined
/** @public */
export function getLastChild(
  snapshot: TraversalSnapshot,
  path: Path,
): {node: Node; path: Path} | undefined
export function getLastChild(
  snapshot: TraversalSnapshot,
  path: Path,
): {node: Node; path: Path} | undefined {
  const children = getChildren(snapshot, path)

  return children.at(-1)
}
