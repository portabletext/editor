import type {PortableTextBlock, PortableTextSpan} from '@portabletext/schema'
import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import type {Containers} from '../schema/container-types'
import {isEditableContainer} from '../schema/is-editable-container'
import {getNode} from './get-node'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Get the registered editable container at a given path.
 *
 * @public
 */
export function getContainer(
  snapshot: TraversalSnapshot & {context: {containers: Containers}},
  path: Path,
): {node: PortableTextBlock | PortableTextSpan; path: Path} | undefined
/** @public */
export function getContainer(
  snapshot: TraversalSnapshot,
  path: Path,
): {node: Node; path: Path} | undefined
export function getContainer(
  snapshot: TraversalSnapshot,
  path: Path,
): {node: Node; path: Path} | undefined {
  const entry = getNode(snapshot, path)

  if (!entry) {
    return undefined
  }

  if (!isEditableContainer(snapshot, entry.node, entry.path)) {
    return undefined
  }

  return {node: entry.node, path: entry.path}
}
