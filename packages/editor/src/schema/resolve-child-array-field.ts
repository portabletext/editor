import type {
  FieldDefinition,
  OfDefinition,
  PortableTextObject,
} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'

export type ChildArrayField = FieldDefinition & {
  type: 'array'
  of: ReadonlyArray<OfDefinition>
}

/**
 * Resolves the child array field for a given object node.
 *
 * Looks up the node's type in the current scope of `of` definitions or the
 * top-level schema.
 */
export function resolveChildArrayField(
  context: {
    schema: EditorSchema
    scope?: ReadonlyArray<OfDefinition>
  },
  node: PortableTextObject,
): ChildArrayField | undefined {
  const scopeMatch = context.scope?.find(
    (definition) =>
      definition.type === node._type &&
      'fields' in definition &&
      definition.fields,
  )

  const fields =
    scopeMatch && 'fields' in scopeMatch
      ? scopeMatch.fields
      : context.schema.blockObjects.find(
          (definition) => definition.name === node._type,
        )?.fields

  if (!fields) {
    return undefined
  }

  return fields.find(isChildArrayField)
}

/**
 * Returns the child array field for a given node type,
 * searching the full schema tree.
 */
export function resolveChildArrayFieldByType(
  schema: EditorSchema,
  nodeType: string,
): ChildArrayField | undefined {
  // Search top-level block objects first
  for (const blockObject of schema.blockObjects) {
    if (blockObject.name === nodeType) {
      return findChildArrayFieldInFields(blockObject.fields)
    }
  }

  // Recursively search inside field definitions of all block objects
  for (const blockObject of schema.blockObjects) {
    const result = searchForChildArrayField(blockObject.fields, nodeType)
    if (result !== undefined) {
      return result
    }
  }

  return undefined
}

function findChildArrayFieldInFields(
  fields: ReadonlyArray<FieldDefinition> | undefined,
): ChildArrayField | undefined {
  if (!fields) {
    return undefined
  }

  for (const field of fields) {
    if (isChildArrayField(field)) {
      return field
    }
  }

  return undefined
}

function searchForChildArrayField(
  fields: ReadonlyArray<FieldDefinition> | undefined,
  targetType: string,
): ChildArrayField | undefined {
  if (!fields) {
    return undefined
  }

  for (const field of fields) {
    if (field.type !== 'array' || !('of' in field) || !field.of) {
      continue
    }

    for (const ofMember of field.of) {
      if (ofMember.type === targetType) {
        const memberFields =
          'fields' in ofMember && ofMember.fields ? ofMember.fields : undefined
        return findChildArrayFieldInFields(memberFields)
      }

      // Recurse into the of member's fields
      const memberFields =
        'fields' in ofMember && ofMember.fields ? ofMember.fields : undefined
      if (memberFields) {
        const result = searchForChildArrayField(memberFields, targetType)
        if (result !== undefined) {
          return result
        }
      }
    }
  }

  return undefined
}

function isChildArrayField(field: FieldDefinition): field is ChildArrayField {
  return field.type === 'array' && 'of' in field
}
