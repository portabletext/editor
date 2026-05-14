import type {OfDefinition} from '@portabletext/schema'
import type {TraversalSnapshot} from '../node-traversal/traversal-snapshot'
import type {Path} from '../slate/interfaces/path'
import {descendToParent} from './descend-to-parent'

/**
 * Return the immediate registered-container ancestor of `path` along
 * with its `of` array (the schema definitions accepted at this position).
 *
 * Position-aware: nested-only registrations (e.g. `cell` registered
 * only inside `table.row.of`) are recognized via the same descent
 * primitive used by all parent-aware traversal.
 *
 * Returns `undefined` when `path` has no registered-container ancestor
 * (i.e. is at the document root) or when descent hits a leaf-resolved
 * ancestor.
 */
export function getEnclosingContainer(
  snapshot: TraversalSnapshot,
  path: Path,
):
  | {
      of: ReadonlyArray<OfDefinition>
      path: Path
    }
  | undefined {
  const descent = descendToParent(snapshot, path)
  if (!descent) {
    return undefined
  }
  return {
    of: descent.parent.field.of,
    path: descent.parentPath,
  }
}
