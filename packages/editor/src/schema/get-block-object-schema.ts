import type {BaseDefinition, FieldDefinition} from '@portabletext/schema'
import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import type {TraversalSnapshot} from '../traversal/traversal-snapshot'
import {getDeclarationsInScope, resolveOfMember} from './declarations-in-scope'
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
 * Resolves the block's `_type` against the `field.of` of the nearest
 * registered container ancestor: an inline declaration by name, or a bare
 * reference to the nearest declaration of the type on the path's
 * ancestors, then to the schema's root `blockObjects`. Falls back to
 * `schema.blockObjects` when no `of` member matches (or when the block is
 * at the root of the document).
 *
 * Returns `undefined` when the type is not declared at the effective scope.
 */
export function getBlockObjectSchema(
  snapshot: TraversalSnapshot,
  node: Node,
  path: Path,
): BlockObjectSchema | undefined {
  const {schema} = snapshot.context
  const enclosing = getEnclosingContainer(snapshot, path)

  const declaration = enclosing
    ? resolveOfMember(
        enclosing.of,
        node._type,
        schema,
        getDeclarationsInScope(snapshot, path),
      )
    : undefined

  return (
    declaration ??
    schema.blockObjects.find((definition) => definition.name === node._type)
  )
}
