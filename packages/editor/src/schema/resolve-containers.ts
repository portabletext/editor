import type {FieldDefinition, OfDefinition} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {ContainerConfig} from '../renderers/renderer.types'

export type ChildArrayField = FieldDefinition & {
  type: 'array'
  of: ReadonlyArray<OfDefinition>
}

/**
 * Value shape held in the {@link Containers} map.
 *
 * Carries the container's resolved `field` (the array field on the
 * container node that holds its editable children) and the original
 * `container` definition. Engine traversal and selectors use `field`;
 * render dispatch uses `container.render` and `container.renderChild`.
 *
 * @alpha
 */
export type Container = ContainerConfig

/**
 * Map of registered editable containers carried on `EditorContext`.
 *
 * Keyed by the container's `_type`. One registration per type; later
 * registrations of the same type are ignored with a warning.
 *
 * @alpha
 */
export type Containers = ReadonlyMap<string, Container>

/**
 * Maps container `_type` names to registered container configs.
 *
 * @internal
 */
export type ResolvedContainers = ReadonlyMap<string, ContainerConfig>

/**
 * Resolve the `Containers` map from a set of registered container
 * configs. Drops any registration whose type doesn't have a matching
 * declaration in the schema. Container types are keyed by `_type` and
 * the first schema declaration wins for `field` resolution.
 */
export function resolveContainers(
  _schema: EditorSchema,
  containerConfigs: Map<string, ContainerConfig>,
): ResolvedContainers {
  return new Map(containerConfigs)
}

/**
 * Resolve the `ChildArrayField` on a schema for a container
 * registration. Walks the schema graph for the first declaration of
 * `type` and returns the array field matching `fieldName`. Returns
 * `undefined` when the type isn't declared, the field doesn't exist,
 * isn't an array, or contains only primitive members.
 *
 * For `type === 'block'`, returns a synthesized children field
 * combining the schema's `span` with every inline object name.
 */
export function resolveContainerField(
  schema: EditorSchema,
  type: string,
  fieldName: string,
): ChildArrayField | undefined {
  if (type === 'block') {
    if (fieldName !== 'children') {
      return undefined
    }
    return synthesizeBlockChildrenField(schema)
  }

  const fields = findFieldsForType(schema, type)
  if (!fields) {
    return undefined
  }
  const matching = fields.find(
    (field): field is ChildArrayField =>
      field.name === fieldName && isChildArrayField(field),
  )
  if (!matching) {
    return undefined
  }
  if (containsOnlyPrimitiveTypes(matching)) {
    console.warn(
      `Field '${matching.name}' on '${type}' doesn't contain block or container types and will be excluded`,
    )
    return undefined
  }
  return matching
}

function findFieldsForType(
  schema: EditorSchema,
  type: string,
): ReadonlyArray<FieldDefinition> | undefined {
  // Top-level declarations with non-empty fields. Bare types like
  // `{name: 'row'}` compile to an empty fields array; treat those as
  // unresolved at this level and fall through to inline declarations,
  // where the full shape lives.
  for (const blockObject of schema.blockObjects) {
    if (
      blockObject.name === type &&
      'fields' in blockObject &&
      blockObject.fields &&
      blockObject.fields.length > 0
    ) {
      return blockObject.fields
    }
  }

  for (const blockObject of schema.blockObjects) {
    if (!('fields' in blockObject) || !blockObject.fields) {
      continue
    }
    const found = findInlineDeclaration(
      blockObject.fields,
      type,
      new Set([blockObject.name]),
    )
    if (found) {
      return found
    }
  }

  return undefined
}

function findInlineDeclaration(
  fields: ReadonlyArray<FieldDefinition>,
  target: string,
  visited: ReadonlySet<string>,
): ReadonlyArray<FieldDefinition> | undefined {
  for (const field of fields) {
    if (!isChildArrayField(field)) {
      continue
    }
    for (const member of field.of) {
      if (member.type === 'object' && 'fields' in member && member.fields) {
        if (!('name' in member) || !member.name) {
          continue
        }
        if (member.name === target) {
          return member.fields
        }
        if (visited.has(member.name)) {
          continue
        }
        const found = findInlineDeclaration(
          member.fields,
          target,
          new Set([...visited, member.name]),
        )
        if (found) {
          return found
        }
      }
    }
  }
  return undefined
}

function isChildArrayField(field: FieldDefinition): field is ChildArrayField {
  return field.type === 'array' && 'of' in field && Array.isArray(field.of)
}

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
