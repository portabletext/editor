import type {OfDefinition} from '@portabletext/schema'
import {getAncestors} from '../node-traversal/get-ancestors'
import type {TraversalSnapshot} from '../node-traversal/traversal-snapshot'
import type {Path} from '../slate/interfaces/path'
import {isObjectNode} from '../slate/node/is-object-node'

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

    const container = snapshot.context.containers.get(ancestor.node._type)

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
