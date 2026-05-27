import type {BaseDefinition, FieldDefinition} from '@portabletext/schema'
import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import type {TraversalSnapshot} from '../node-traversal/traversal-snapshot'
import {getEnclosingContainer} from './get-enclosing-container'

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
  snapshot: TraversalSnapshot,
  node: Node,
  path: Path,
): BlockObjectSchema | undefined {
  const typeName = node._type

  const enclosing = getEnclosingContainer(snapshot, path)

  if (enclosing) {
    const inline = enclosing.of.find((member) => {
      if (member.type === 'block') {
        return false
      }
      // Inline declarations: `{type: 'object', name: 'X', fields: [...]}`
      if (member.type === 'object' && 'name' in member) {
        return member.name === typeName
      }
      // Bare references: `{type: 'X'}` - the type itself is the name.
      return member.type === typeName
    })

    if (inline && inline.type !== 'block') {
      // Project to BlockObjectSchema shape. For inline declarations, use
      // `name`. For bare references, use `type` (resolved against root).
      if (inline.type === 'object' && 'name' in inline && inline.name) {
        return {
          ...inline,
          name: inline.name,
          fields:
            'fields' in inline && inline.fields ? inline.fields : undefined,
        }
      }
      // Bare reference: resolve against root `blockObjects`.
      return snapshot.context.schema.blockObjects.find(
        (definition) => definition.name === typeName,
      )
    }
  }

  return snapshot.context.schema.blockObjects.find(
    (definition) => definition.name === typeName,
  )
}
