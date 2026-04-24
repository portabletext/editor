import type {OfDefinition} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import {getAncestors} from '../node-traversal/get-ancestors'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {isObjectNode} from '../slate/node/is-object-node'
import {getContainerScopedName} from './get-container-scoped-name'
import type {Containers} from './resolve-containers'

/**
 * Walk ancestors from `path` and return the nearest registered editable
 * container — its resolved field definition, the raw `of` array, and the
 * path at which it lives.
 *
 * Returns `undefined` when no ancestor is a registered container (the
 * caller falls back to root-level schema views).
 */
export function getEnclosingContainer(
  context: {
    schema: EditorSchema
    containers: Containers
    value: Array<Node>
  },
  path: Path,
):
  | {
      of: ReadonlyArray<OfDefinition>
      path: Path
    }
  | undefined {
  for (const ancestor of getAncestors(context, path)) {
    if (!isObjectNode({schema: context.schema}, ancestor.node)) {
      continue
    }

    const scopedName = getContainerScopedName(
      context,
      ancestor.node,
      ancestor.path,
    )
    const container = context.containers.get(scopedName)

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
