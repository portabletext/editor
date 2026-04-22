import type {FieldDefinition, OfDefinition} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {ContainerConfig} from '../renderers/renderer.types'
import {compareSpecificity} from '../scope/compare-specificity'
import {matchScope} from '../scope/match-scope'

export type ChildArrayField = FieldDefinition & {
  type: 'array'
  of: ReadonlyArray<OfDefinition>
}

/**
 * Public shape of the container map carried on `EditorContext`.
 *
 * Values carry only what traversal and selectors need (the array field
 * holding editable children). The internal `Containers` map carries the
 * full `ContainerConfig` and is a subtype of this.
 */
export type TraversalContainers = ReadonlyMap<string, {field: ChildArrayField}>

/**
 * Maps scoped type names (type chain joined by '.') to registered container
 * configs.
 *
 * Key: scoped type name (e.g., 'block', 'callout.block', 'table.row.cell').
 */
export type Containers = Map<string, ContainerConfig>

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
): Containers {
  const containers: Containers = new Map()

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
 */
export function resolveContainerField(
  schema: EditorSchema,
  scope: string,
  fieldName: string,
): ChildArrayField | undefined {
  const candidates = discoverCandidates(schema)
  for (const candidate of candidates) {
    if (candidate.field.name !== fieldName) {
      continue
    }
    if (candidate.chain[candidate.chain.length - 1] !== terminalTypeOf(scope)) {
      continue
    }
    if (containsOnlyPrimitiveTypes(candidate.field)) {
      console.warn(
        `Field '${candidate.field.name}' on '${candidate.chain.join('.')}' doesn't contain block or container types and will be excluded`,
      )
      return undefined
    }
    return candidate.field
  }
  return undefined
}

function terminalTypeOf(scope: string): string {
  const withoutAnchor = scope.startsWith('$..')
    ? scope.slice(3)
    : scope.startsWith('$.')
      ? scope.slice(2)
      : scope
  const segments = withoutAnchor.split('.')
  return segments[segments.length - 1] ?? ''
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
    )
  }

  return candidates
}

function walkTypeForCandidates(
  schema: EditorSchema,
  fields: ReadonlyArray<FieldDefinition>,
  chain: Array<string>,
  out: Array<Candidate>,
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
      if ('fields' in member && member.fields) {
        walkTypeForCandidates(
          schema,
          member.fields,
          [...chain, member.type],
          out,
        )
      }
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
