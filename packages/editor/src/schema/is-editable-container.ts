import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import type {TraversalSnapshot} from '../node-traversal/traversal-snapshot'
import {resolveContainerAt} from './resolve-container-at'

/**
 * Check if a node at the given path is a registered editable container.
 *
 * Position-aware: {@link resolveContainerAt} descends from the editor
 * root threading the resolved parent at each step, so positionally-
 * registered containers (e.g. `cell` registered only inside
 * `table.of`) are recognized when reached through their declared
 * parent.
 */
export function isEditableContainer(
  snapshot: TraversalSnapshot,
  _node: Node,
  path: Path,
): boolean {
  if (snapshot.context.containers.size === 0) {
    return false
  }

  // `resolveContainerAt` aborts on the first unregistered object-node
  // ancestor (chain validity falls out of the single descent), so the
  // single call below answers both "is the node here a container?" and
  // "is the ancestor chain valid?" in one walk.
  const resolved = resolveContainerAt(
    snapshot.context.containers,
    snapshot.context.value,
    path,
  )
  return !!(resolved && 'field' in resolved)
}
