import type {BaseDefinition, FieldDefinition} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import {getAncestors} from '../node-traversal/get-ancestors'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {isObjectNode} from '../slate/node/is-object-node'
import {getContainerScopedName} from './get-container-scoped-name'
import type {TraversalContainers} from './resolve-containers'

/**
 * Minimal view of a block-object schema definition: its name and its
 * declared fields (if any). Matches both root-level `blockObjects` entries
 * and inline-declared types inside a container's `field.of`.
 */
export type BlockObjectSchema = BaseDefinition & {
  fields?: ReadonlyArray<FieldDefinition>
}

/**
 * Return the schema definition for a block-object at `path`.
 *
 * Walks to the nearest registered container ancestor and searches its
 * `field.of` for an inline-declared type whose `name` matches the block's
 * `_type`. Falls back to `schema.blockObjects` when no inline match is
 * found (or when the block is at the root of the document).
 *
 * Returns `undefined` when the type is not declared at the effective scope.
 */
export function getBlockObjectSchema(
  context: {
    schema: EditorSchema
    containers: TraversalContainers
    value: Array<Node>
  },
  node: Node,
  path: Path,
): BlockObjectSchema | undefined {
  if (typeof node !== 'object' || node === null || !('_type' in node)) {
    return undefined
  }
  const typeName = (node as {_type: unknown})._type
  if (typeof typeName !== 'string') {
    return undefined
  }

  const enclosingContainerOf = findEnclosingContainerOf(context, path)
  if (enclosingContainerOf) {
    const inline = enclosingContainerOf.find(
      (member) => member.type !== 'block' && member.type === typeName,
    )
    if (inline && inline.type !== 'block') {
      // Project to BlockObjectSchema shape: `name` comes from `type`
      // when the inline definition doesn't specify one.
      return {
        ...inline,
        name: 'name' in inline && inline.name ? inline.name : inline.type,
      } as BlockObjectSchema
    }
  }

  return context.schema.blockObjects.find(
    (definition) => definition.name === typeName,
  )
}

function findEnclosingContainerOf(
  context: {
    schema: EditorSchema
    containers: TraversalContainers
    value: Array<Node>
  },
  path: Path,
) {
  const ancestors = getAncestors(context, path)
  for (const ancestor of ancestors) {
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
    return container.field.of
  }
  return undefined
}
