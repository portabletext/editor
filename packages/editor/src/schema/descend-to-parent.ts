import type {Path} from '../engine/interfaces/path'
import {getAncestors} from '../traversal/get-ancestors'
import {isObject} from '../traversal/is-object'
import type {TraversalSnapshot} from '../traversal/traversal-snapshot'
import type {RegisteredContainer} from './container-types'
import {resolveContainerAt} from './resolve-container-at'

/**
 * Descent primitive: return the immediate parent
 * {@link RegisteredContainer} of the node at `path` (and that parent's
 * path), or `undefined` when the target's immediate parent is the
 * editor root, when no object-node ancestor is a registered container,
 * or when descent hits an ancestor whose `_type` is not registered.
 *
 * Walks ancestors and resolves each object-node ancestor positionally
 * via {@link resolveContainerAt}. Text-block and span ancestors are
 * skipped - "container" here means the enclosing object container,
 * not the text-block holding spans.
 */
export function descendToParent(
  snapshot: TraversalSnapshot,
  path: Path,
): {parent: RegisteredContainer; parentPath: Path} | undefined {
  const ancestors = getAncestors(snapshot, path)
  for (const ancestor of ancestors) {
    if (!isObject(snapshot, ancestor.node)) {
      continue
    }
    const resolved = resolveContainerAt(
      snapshot.context.containers,
      snapshot.context.value,
      ancestor.path,
    )
    if (!resolved || !('field' in resolved)) {
      return undefined
    }
    return {parent: resolved, parentPath: ancestor.path}
  }
  return undefined
}
