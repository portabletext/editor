import type {OfDefinition} from '@portabletext/schema'
import type {Path} from '../slate/interfaces/path'
import {isObjectNode} from '../slate/node/is-object-node'
import {getAncestors} from '../traversal/get-ancestors'
import type {TraversalSnapshot} from '../traversal/traversal-snapshot'
import {getContainerScopedName} from './get-container-scoped-name'

/**
 * Walk ancestors from `path` and return the nearest registered editable
 * container.
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
  for (const ancestor of getAncestors(snapshot, path)) {
    if (!isObjectNode({schema: snapshot.context.schema}, ancestor.node)) {
      continue
    }

    const scopedName = getContainerScopedName(
      snapshot,
      ancestor.node,
      ancestor.path,
    )
    const container = snapshot.context.containers.get(scopedName)

    if (!container) {
      continue
    }

    return {
      of: container.field.of,
      path: ancestor.path,
    }
  }

  return undefined
}
