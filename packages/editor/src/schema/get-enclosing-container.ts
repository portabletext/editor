import type {OfDefinition} from '@portabletext/schema'
import {getAncestors} from '../node-traversal/get-ancestors'
import type {TraversalSnapshot} from '../node-traversal/traversal-snapshot'
import type {Path} from '../slate/interfaces/path'
import {isObjectNode} from '../slate/node/is-object-node'
import {getContainerScopedName} from './get-container-scoped-name'
import {lookupContainer} from './lookup-container'

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
    const container = lookupContainer(snapshot.context.containers, scopedName)

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
