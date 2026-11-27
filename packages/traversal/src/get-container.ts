import type {Path} from '@portabletext/patches'
import {getNode} from './get-node'
import {isEditableContainer} from './is-editable-container'
import type {Node} from './node'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Get the registered editable container at a given path.
 *
 * @public
 */
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
