import type {FieldDefinition, OfDefinition, Schema} from '@portabletext/schema'
import type {Path, PathSegment} from '../engine/interfaces/path'
import {getAncestors} from '../traversal/get-ancestors'
import type {TraversalSnapshot} from '../traversal/traversal-snapshot'

/**
 * Type declarations visible at a position in the value, keyed by type name:
 * the declaration of every object on the path down to that position. A
 * nearer declaration of a name replaces a farther one.
 */
export type DeclarationScope = ReadonlyMap<
  string,
  ReadonlyArray<FieldDefinition>
>

/**
 * Collect the {@link DeclarationScope} at `path` from the declarations of
 * its ancestors.
 */
export function getDeclarationsInScope(
  snapshot: TraversalSnapshot,
  path: Path,
): DeclarationScope {
  return collectDeclarations(
    snapshot.context.schema,
    getAncestors(snapshot, path)
      .reverse()
      .map((ancestor) => ({
        type: ancestor.node._type,
        field: path[ancestor.path.length],
      })),
  )
}

/**
 * Collect the {@link DeclarationScope} along a chain of ancestors, root
 * first, each naming its `_type` and the path segment the chain descends
 * through. The root ancestor resolves against the schema's `blockObjects`,
 * each deeper one against the `of` of the array field above it. The walk
 * stops at the first ancestor that does not resolve to an object
 * declaration, such as a text block.
 */
export function collectDeclarations(
  schema: Schema,
  ancestors: ReadonlyArray<{type: string; field: PathSegment | undefined}>,
): DeclarationScope {
  const scope = new Map<string, ReadonlyArray<FieldDefinition>>()
  let of: ReadonlyArray<OfDefinition> | undefined

  for (const ancestor of ancestors) {
    const declaration = of
      ? resolveOfMember(of, ancestor.type, schema, scope)
      : schema.blockObjects.find(
          (blockObject) => blockObject.name === ancestor.type,
        )

    if (!declaration) {
      break
    }

    scope.set(declaration.name, declaration.fields)

    const field = declaration.fields.find(
      (candidate) => candidate.name === ancestor.field,
    )

    if (!field || field.type !== 'array' || !field.of) {
      break
    }

    of = field.of
  }

  return scope
}

/**
 * Resolve an `of` member against a runtime `_type`. Returns the
 * declaration to use for the item, or `undefined` if no member matches.
 *
 * - Inline declaration `{type: 'object', name: 'X', fields: [...]}`: the
 *   name matches `_type` and the fields are inline.
 * - Reference `{type: 'X'}`: the declaration of `X` in `scope`, then the
 *   schema's root `blockObjects`.
 * - `{type: 'block'}`: not an object member, never matches.
 */
export function resolveOfMember(
  of: ReadonlyArray<OfDefinition>,
  typeName: string,
  schema: Schema,
  scope: DeclarationScope,
): {name: string; fields: ReadonlyArray<FieldDefinition>} | undefined {
  for (const member of of) {
    if (member.type === 'block') {
      continue
    }
    if (member.type === 'object' && 'name' in member && member.name) {
      if (member.name === typeName && 'fields' in member && member.fields) {
        return {name: member.name, fields: member.fields}
      }
      continue
    }
    if (member.type === typeName) {
      const scopeMatch = scope.get(typeName)
      if (scopeMatch) {
        return {name: typeName, fields: scopeMatch}
      }
      return schema.blockObjects.find(
        (blockObject) => blockObject.name === typeName,
      )
    }
  }
  return undefined
}

/**
 * Rewrite each bare reference in `of` whose type is declared inline in
 * `scope` as the inline declaration it refers to, so `getSubSchema`, which
 * only sees root declarations, resolves it to the declaration in scope.
 */
export function resolveReferencesInScope(
  schema: Schema,
  of: ReadonlyArray<OfDefinition>,
  scope: DeclarationScope,
): ReadonlyArray<OfDefinition> {
  return of.map((member) => {
    if (member.type === 'block' || member.type === 'object') {
      return member
    }
    const fields = scope.get(member.type)
    const rootDeclaration = schema.blockObjects.find(
      (blockObject) => blockObject.name === member.type,
    )
    if (!fields || fields === rootDeclaration?.fields) {
      return member
    }
    return {...member, type: 'object', name: member.name ?? member.type, fields}
  })
}
