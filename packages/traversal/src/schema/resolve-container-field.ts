import type {FieldDefinition, OfDefinition} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {ChildArrayField} from './container-types'

/**
 * JSON primitive type names. Arrays containing only primitive types don't
 * have `_key` properties on their members and can't be used as editable
 * container content.
 */
const PRIMITIVE_TYPES = new Set(['string', 'number', 'boolean'])

/**
 * Why a container registration failed to resolve against the schema.
 * Carried out of {@link resolveContainerFieldResolution} so the caller
 * can warn (or throw) with a message that names the actual problem.
 */
export type ContainerFieldFailure =
  | 'unknown-type'
  | 'field-missing'
  | 'field-not-array'
  | 'field-primitive-only'

export type ContainerFieldResolution =
  | {field: ChildArrayField}
  | {failure: ContainerFieldFailure}

function isChildArrayField(field: FieldDefinition): field is ChildArrayField {
  return field.type === 'array' && 'of' in field && Array.isArray(field.of)
}

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

function resolveFieldOn(
  fields: ReadonlyArray<FieldDefinition>,
  fieldName: string,
): ContainerFieldResolution {
  const field = fields.find((candidate) => candidate.name === fieldName)
  if (!field) {
    return {failure: 'field-missing'}
  }
  if (!isChildArrayField(field)) {
    return {failure: 'field-not-array'}
  }
  if (containsOnlyPrimitiveTypes(field)) {
    return {failure: 'field-primitive-only'}
  }
  return {field}
}

function findInlineDeclarationIn(
  parentOf: ReadonlyArray<OfDefinition>,
  type: string,
): ReadonlyArray<FieldDefinition> | undefined {
  for (const member of parentOf) {
    if (
      member.type === 'object' &&
      'name' in member &&
      member.name === type &&
      'fields' in member &&
      member.fields &&
      member.fields.length > 0
    ) {
      return member.fields
    }
  }
  return undefined
}

function findInlineFields(
  schema: EditorSchema,
  type: string,
): ReadonlyArray<FieldDefinition> | undefined {
  let best: ReadonlyArray<FieldDefinition> | undefined

  function walk(of: ReadonlyArray<OfDefinition>): void {
    for (const member of of) {
      if (
        member.type === 'object' &&
        'name' in member &&
        member.name === type
      ) {
        if ('fields' in member && member.fields && member.fields.length > 0) {
          if (!best || best.length === 0) {
            best = member.fields
          }
          for (const field of member.fields) {
            if (isChildArrayField(field)) {
              walk(field.of)
            }
          }
          continue
        }
      }
      if (member.type === 'object' && 'fields' in member && member.fields) {
        for (const field of member.fields) {
          if (isChildArrayField(field)) {
            walk(field.of)
          }
        }
      }
    }
  }

  for (const blockObject of schema.blockObjects) {
    if ('fields' in blockObject && blockObject.fields) {
      for (const field of blockObject.fields) {
        if (isChildArrayField(field)) {
          walk(field.of)
        }
      }
    }
  }

  return best
}

/**
 * Resolve the {@link ChildArrayField} on a schema for a container
 * registration, or report why the registration is invalid: unknown
 * type, missing field, non-array field, or primitive-only array field.
 *
 * Resolves the type by looking at:
 *   1. The synthesized `block` container (text blocks; field is
 *      `'children'`).
 *   2. The schema's `blockObjects` for a matching root-declared type.
 *   3. Inline block-object declarations found anywhere in the schema's
 *      `of` tree (for types referenced as inline declarations rather than
 *      root types).
 *
 * Among inline declarations of the same name at multiple depths, prefers
 * the shape with the matching field (rejecting empty-fields placeholders).
 */
export function resolveContainerFieldResolution(
  schema: EditorSchema,
  type: string,
  fieldName: string,
  parentOf?: ReadonlyArray<OfDefinition>,
): ContainerFieldResolution {
  if (type === 'block') {
    if (fieldName !== 'children') {
      // Text blocks have exactly one child array. Any other field name is
      // a field mistake, not a type mistake.
      return {failure: 'field-missing'}
    }
    return {field: synthesizeBlockChildrenField(schema)}
  }

  if (parentOf) {
    const inlineMatch = findInlineDeclarationIn(parentOf, type)
    if (inlineMatch) {
      return resolveFieldOn(inlineMatch, fieldName)
    }
  }

  const rootMatch = schema.blockObjects.find(
    (blockObject) => blockObject.name === type,
  )
  const rootFields =
    rootMatch &&
    'fields' in rootMatch &&
    rootMatch.fields &&
    rootMatch.fields.length > 0
      ? rootMatch.fields
      : undefined

  const inlineFields = rootFields ? undefined : findInlineFields(schema, type)

  const fields = rootFields ?? inlineFields
  if (!fields) {
    if (rootMatch) {
      // The type exists in the schema but declares no fields, so the
      // problem to report is the field, not the type.
      return {failure: 'field-missing'}
    }
    return {failure: 'unknown-type'}
  }

  return resolveFieldOn(fields, fieldName)
}

/**
 * Convenience wrapper over {@link resolveContainerFieldResolution} for
 * callers that only need the field and not the failure reason.
 */
export function resolveContainerField(
  schema: EditorSchema,
  type: string,
  fieldName: string,
  parentOf?: ReadonlyArray<OfDefinition>,
): ChildArrayField | undefined {
  const resolution = resolveContainerFieldResolution(
    schema,
    type,
    fieldName,
    parentOf,
  )
  return 'field' in resolution ? resolution.field : undefined
}
