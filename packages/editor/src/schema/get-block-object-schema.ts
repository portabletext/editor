import type {BaseDefinition, FieldDefinition} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {getEnclosingContainer} from './get-enclosing-container'
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
  const typeName = node._type

  const enclosing = getEnclosingContainer(context, path)

  if (enclosing) {
    const inline = enclosing.of.find(
      (member) => member.type !== 'block' && member.type === typeName,
    )

    if (inline && inline.type !== 'block') {
      // Project to BlockObjectSchema shape: `name` comes from `type`
      // when the inline definition doesn't specify one.
      return {
        ...inline,
        name: 'name' in inline && inline.name ? inline.name : inline.type,
        fields:
          'fields' in inline && inline.fields
            ? (inline.fields as ReadonlyArray<FieldDefinition>)
            : undefined,
      }
    }
  }

  return context.schema.blockObjects.find(
    (definition) => definition.name === typeName,
  )
}
