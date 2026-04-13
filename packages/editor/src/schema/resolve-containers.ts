import type {FieldDefinition, OfDefinition} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {ContainerConfig} from '../renderers/renderer.types'

export type ChildArrayField = FieldDefinition & {
  type: 'array'
  of: ReadonlyArray<OfDefinition>
}

/**
 * Maps scoped type names to their resolved editable array field.
 *
 * Key: scoped type name (e.g., 'table', 'table.row', 'table.row.cell')
 * Value: resolved array field definition with name and of scope
 */
export type Containers = Map<string, ChildArrayField>

/**
 * Resolve the complete Containers Map from a schema and a set of
 * registered container configs. Each config declares a scope and
 * a field (the child array field). The resolver walks the schema to find the
 * matching field definition.
 */
export function resolveContainers(
  schema: EditorSchema,
  containerConfigs: Map<string, ContainerConfig>,
): Containers {
  const containers: Containers = new Map()

  for (const [, config] of containerConfigs) {
    const resolved = resolveContainerField(schema, {
      scope: config.container.scope,
      field: config.container.field,
    })
    if (resolved) {
      containers.set(resolved.scope, resolved.field)
    }
  }

  return containers
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

function resolveContainerField(
  schema: EditorSchema,
  containerConfig: {scope: string; field: string},
): {scope: string; field: ChildArrayField} | undefined {
  // Split the scope into segments to find the type definition
  const segments = containerConfig.scope.split('.')
  const lastSegment = segments[segments.length - 1]

  // Handle 'block' scope (text block children)
  if (lastSegment === 'block') {
    if (containerConfig.field !== 'children') {
      return undefined
    }
    return {
      scope: containerConfig.scope,
      field: synthesizeBlockChildrenField(schema),
    }
  }

  // The first segment is always a block object name
  const blockObject = schema.blockObjects.find(
    (definition) => definition.name === segments[0],
  )

  if (!blockObject || !('fields' in blockObject) || !blockObject.fields) {
    return undefined
  }

  // Walk nested types for multi-segment scopes (e.g., 'table.row.cell')
  let currentFields: ReadonlyArray<FieldDefinition> = blockObject.fields

  for (let i = 1; i < segments.length; i++) {
    const segmentType = segments[i]!
    let found = false

    for (const field of currentFields) {
      if (isChildArrayField(field)) {
        for (const ofMember of field.of) {
          if (
            ofMember.type === segmentType &&
            'fields' in ofMember &&
            ofMember.fields
          ) {
            currentFields = ofMember.fields
            found = true
            break
          }
        }
      }
      if (found) {
        break
      }
    }

    if (!found) {
      return undefined
    }
  }

  // Find the declared name (child array field) in the resolved fields
  const childField = currentFields.find(
    (field) => field.name === containerConfig.field,
  )

  if (!childField || !isChildArrayField(childField)) {
    return undefined
  }

  if (containsOnlyPrimitiveTypes(childField)) {
    console.warn(
      `Field '${childField.name}' on '${containerConfig.scope}' doesn't contain block or container types and will be excluded`,
    )
    return undefined
  }

  return {scope: containerConfig.scope, field: childField}
}

function synthesizeBlockChildrenField(schema: EditorSchema): ChildArrayField {
  const ofMembers: Array<OfDefinition> = [{type: 'span'}]
  for (const inlineObject of schema.inlineObjects) {
    ofMembers.push({type: inlineObject.name})
  }
  return {name: 'children', type: 'array', of: ofMembers}
}
