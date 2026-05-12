import type {FieldDefinition, OfDefinition} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {ContainerConfig} from '../renderers/renderer.types'
import {compareSpecificity} from '../scope/compare-specificity'
import {matchScope} from '../scope/match-scope'
import {parseScope} from '../scope/parse-scope'

export type ChildArrayField = FieldDefinition & {
  type: 'array'
  of: ReadonlyArray<OfDefinition>
}

/**
 * Value shape held in the {@link Containers} map.
 *
 * Carries only what traversal and selectors need: the array field on the
 * container node that holds its editable children.
 *
 * @alpha
 */
export type Container = {field: ChildArrayField}

/**
 * Map of registered editable containers carried on `EditorContext`.
 *
 * Keyed by scoped type name (type chain joined by '.', e.g. `'callout.block'`,
 * `'table.row.cell'`). The internal `ResolvedContainers` map carries the full
 * `ContainerConfig` and is a subtype of this.
 *
 * @alpha
 */
export type Containers = ReadonlyMap<string, Container>

/**
 * Maps scoped type names (type chain joined by '.') to registered container
 * configs.
 *
 * Key: scoped type name (e.g., 'block', 'callout.block', 'table.row.cell').
 */
export type ResolvedContainers = Map<string, ContainerConfig>

/**
 * Candidate type chain discoverable from the schema with an editable array
 * field. A single type with multiple array fields produces multiple candidates.
 */
type Candidate = {
  chain: Array<string>
  field: ChildArrayField
}

/**
 * Resolve the `Containers` map for a schema and a set of registered configs.
 *
 * For each candidate position discoverable in the schema, picks the
 * most-specific matching config. Registration order breaks exact-duplicate
 * ties (last-wins).
 */
export function resolveContainers(
  schema: EditorSchema,
  containerConfigs: Map<string, ContainerConfig>,
): ResolvedContainers {
  const containers: ResolvedContainers = new Map()

  if (containerConfigs.size === 0) {
    return containers
  }

  const configs = Array.from(containerConfigs.values()).sort(
    (leftConfig, rightConfig) =>
      -compareSpecificity(leftConfig.parsedScope, rightConfig.parsedScope),
  )
  const candidates = discoverCandidates(schema)

  for (const candidate of candidates) {
    const matching = configs.find(
      (config) =>
        config.field.name === candidate.field.name &&
        matchScope(config.parsedScope, candidate.chain),
    )
    if (!matching) {
      continue
    }

    containers.set(candidate.chain.join('.'), matching)
  }

  return containers
}

/**
 * Resolve the `ChildArrayField` on a schema for a container registration.
 * Returns `undefined` when the registration is invalid: unknown type in
 * scope, missing field, non-array field, or primitive-only array field.
 * Warns on primitive-only fields.
 *
 * Picks the most-specific candidate whose chain matches the scope. This
 * matters when a type is declared inline at multiple positions (e.g.
 * `list` at root AND inline inside `callout`) - the candidate at
 * `callout.list` carries the inline shape, while the candidate at `list`
 * carries the root shape.
 */
export function resolveContainerField(
  schema: EditorSchema,
  scope: string,
  fieldName: string,
): ChildArrayField | undefined {
  const parsedScope = parseScope(scope)
  if (!parsedScope) {
    return undefined
  }
  const candidates = discoverCandidates(schema)
  let best: {chain: ReadonlyArray<string>; field: ChildArrayField} | undefined
  for (const candidate of candidates) {
    if (candidate.field.name !== fieldName) {
      continue
    }
    if (!matchScope(parsedScope, candidate.chain)) {
      continue
    }
    if (containsOnlyPrimitiveTypes(candidate.field)) {
      console.warn(
        `Field '${candidate.field.name}' on '${candidate.chain.join('.')}' doesn't contain block or container types and will be excluded`,
      )
      return undefined
    }
    // Among matching candidates, prefer the most specific (longest chain).
    if (!best || candidate.chain.length > best.chain.length) {
      best = candidate
    }
  }
  return best?.field
}

/**
 * Discover every container-candidate type chain in the schema, along with
 * its editable array fields. A single type with multiple array fields
 * produces multiple candidates (one per field).
 *
 * Always includes `['block']` as a candidate, since text blocks are the
 * universal container for span / inline-object children.
 */
function discoverCandidates(schema: EditorSchema): Array<Candidate> {
  const candidates: Array<Candidate> = [
    {chain: ['block'], field: synthesizeBlockChildrenField(schema)},
  ]

  for (const blockObject of schema.blockObjects) {
    if (!('fields' in blockObject) || !blockObject.fields) {
      continue
    }
    walkTypeForCandidates(
      schema,
      blockObject.fields,
      [blockObject.name],
      candidates,
      new Map([[blockObject.name, blockObject.fields]]),
    )
  }

  return candidates
}

/**
 * Resolve a bare reference's fields by name. Looks up the ancestor chain
 * first (so types declared inline by an ancestor can be referenced from a
 * descendant), then falls back to the schema's root `blockObjects`.
 *
 * Returns `undefined` when no match is found.
 */
function resolveReferenceFields(
  schema: EditorSchema,
  name: string,
  ancestorFields: ReadonlyMap<string, ReadonlyArray<FieldDefinition>>,
): ReadonlyArray<FieldDefinition> | undefined {
  const ancestorMatch = ancestorFields.get(name)
  if (ancestorMatch) {
    return ancestorMatch
  }
  const rootMatch = schema.blockObjects.find(
    (blockObject) => blockObject.name === name,
  )
  if (rootMatch && 'fields' in rootMatch && rootMatch.fields) {
    return rootMatch.fields
  }
  return undefined
}

function walkTypeForCandidates(
  schema: EditorSchema,
  fields: ReadonlyArray<FieldDefinition>,
  chain: Array<string>,
  out: Array<Candidate>,
  ancestorFields: ReadonlyMap<string, ReadonlyArray<FieldDefinition>>,
): void {
  for (const field of fields) {
    if (!isChildArrayField(field)) {
      continue
    }

    out.push({chain, field})

    if (containsOnlyPrimitiveTypes(field)) {
      continue
    }

    for (const member of field.of) {
      if (member.type === 'block') {
        // A text block inside a container: emit as a candidate so that
        // scopes like `$..callout.block` can match. The field is the
        // synthesized text-block children array.
        out.push({
          chain: [...chain, 'block'],
          field: synthesizeBlockChildrenField(schema),
        })
        continue
      }
      if (member.type === 'object' && 'fields' in member && member.fields) {
        // Inline declaration: `{type: 'object', name: 'X', fields: [...]}`.
        // The segment name is `member.name`, not `'object'`.
        if (!('name' in member) || !member.name) {
          continue
        }
        if (ancestorFields.has(member.name)) {
          continue
        }
        const nextAncestors = new Map(ancestorFields)
        nextAncestors.set(member.name, member.fields)
        walkTypeForCandidates(
          schema,
          member.fields,
          [...chain, member.name],
          out,
          nextAncestors,
        )
        continue
      }
      // Bare reference: resolve `member.type` against ancestors first
      // (so types declared inline by an ancestor are referenceable),
      // then root `blockObjects`.
      const referencedFields = resolveReferenceFields(
        schema,
        member.type,
        ancestorFields,
      )
      if (!referencedFields) {
        continue
      }
      if (ancestorFields.has(member.type)) {
        // Cycle: emit the reference's array-field candidates at this
        // depth without recursing further. `..` segments in scopes cover
        // any deeper depths.
        for (const refField of referencedFields) {
          if (!isChildArrayField(refField)) {
            continue
          }
          out.push({chain: [...chain, member.type], field: refField})
        }
        continue
      }
      const nextAncestors = new Map(ancestorFields)
      nextAncestors.set(member.type, referencedFields)
      walkTypeForCandidates(
        schema,
        referencedFields,
        [...chain, member.type],
        out,
        nextAncestors,
      )
    }
  }
}

function isChildArrayField(field: FieldDefinition): field is ChildArrayField {
  return field.type === 'array' && 'of' in field && Array.isArray(field.of)
}

/**
 * JSON primitive type names. Arrays containing only primitive types don't
 * have `_key` properties on their members and can't be used as editable
 * container content.
 */
const PRIMITIVE_TYPES = new Set(['string', 'number', 'boolean'])

function containsOnlyPrimitiveTypes(field: ChildArrayField): boolean {
  return field.of.every((member) => PRIMITIVE_TYPES.has(member.type))
}

function synthesizeBlockChildrenField(schema: EditorSchema): ChildArrayField {
  const ofMembers: Array<OfDefinition> = [{type: 'span'}]
  for (const inlineObject of schema.inlineObjects) {
    ofMembers.push({type: inlineObject.name})
  }
  return {name: 'children', type: 'array', of: ofMembers}
}

/**
 * Derive the set of type names that have at least one container
 * registration. A scoped type name whose leaf segment isn't in this set
 * provably cannot match any registered container, so
 * {@link lookupContainer} can short-circuit before running the
 * scope-pattern fallback.
 *
 * Computed at construction time from the same configs that drive
 * {@link resolveContainers}. Rebuilt whenever the registration set
 * changes (i.e. alongside the resolved containers map).
 */
export function resolveContainerTypes(
  containerConfigs: Map<string, ContainerConfig>,
): ReadonlySet<string> {
  const types = new Set<string>()
  for (const config of containerConfigs.values()) {
    const segments = config.parsedScope.segments
    const leafSegment = segments[segments.length - 1]
    if (leafSegment) {
      types.add(leafSegment.type)
    }
  }
  return types
}

/**
 * Derive the set of container leaf types from a resolved containers map.
 * Use this when you have the resolved `Containers` but not the original
 * `ContainerConfig` map (mostly test utilities and fixture construction).
 * Production callers should consume the precomputed set carried alongside
 * `Containers` on the snapshot context.
 *
 * @internal
 */
export function containerTypesFromContainers(
  containers: Containers,
): ReadonlySet<string> {
  const types = new Set<string>()
  for (const scopedName of containers.keys()) {
    const dotIndex = scopedName.lastIndexOf('.')
    types.add(dotIndex === -1 ? scopedName : scopedName.slice(dotIndex + 1))
  }
  return types
}
