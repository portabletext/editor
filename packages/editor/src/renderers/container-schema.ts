import type {FieldDefinition, OfDefinition, Schema} from '@portabletext/schema'

/**
 * Represents a child field on a container type - an array field that contains
 * nested types (either blocks or other object types).
 */
export type ContainerChildField = {
  fieldName: string
  ofTypes: ReadonlyArray<OfDefinition>
}

/**
 * Given a schema and a type name with optional scope path, find the array
 * fields that represent container children.
 *
 * For top-level block objects (e.g., 'table'), we look directly at the
 * blockObjects in the schema.
 *
 * For nested types (e.g., 'row' inside 'table'), we walk the schema tree
 * following the scope path to find the type definition.
 *
 * @param schema - The compiled editor schema
 * @param typeName - The type name to look up (e.g., 'table', 'row', 'cell')
 * @param scopePath - Dot-separated scope path (e.g., 'table', 'table.row')
 */
export function getContainerChildFields(
  schema: Schema,
  typeName: string,
  scopePath?: string,
): Array<ContainerChildField> {
  const fields = findFieldsForType(schema, typeName, scopePath)

  if (!fields) {
    return []
  }

  const childFields: Array<ContainerChildField> = []

  for (const field of fields) {
    if (field.type === 'array' && 'of' in field && field.of) {
      childFields.push({
        fieldName: field.name,
        ofTypes: field.of,
      })
    }
  }

  return childFields
}

/**
 * Walk the schema tree to find the field definitions for a given type.
 */
function findFieldsForType(
  schema: Schema,
  typeName: string,
  scopePath?: string,
): ReadonlyArray<FieldDefinition> | undefined {
  // If no scope, look at top-level block objects
  if (!scopePath) {
    const blockObject = schema.blockObjects.find(
      (blockObj) => blockObj.name === typeName,
    )

    if (blockObject) {
      return blockObject.fields
    }

    return undefined
  }

  // Walk the scope path to find the nested type definition
  // e.g., scopePath='table' and typeName='row' means:
  //   1. Find 'table' in blockObjects
  //   2. Look through its fields for array fields
  //   3. Find the 'of' member with type='row'
  //   4. Return its fields

  const scopeParts = scopePath.split('.')
  const rootTypeName = scopeParts[0]

  if (!rootTypeName) {
    return undefined
  }

  const rootBlockObject = schema.blockObjects.find(
    (blockObj) => blockObj.name === rootTypeName,
  )

  if (!rootBlockObject) {
    return undefined
  }

  // Start from the root block object's fields and walk down
  let currentFields: ReadonlyArray<FieldDefinition> = rootBlockObject.fields

  // Walk through the remaining scope parts (skip the root)
  for (let index = 1; index < scopeParts.length; index++) {
    const scopePart = scopeParts[index]

    if (!scopePart) {
      return undefined
    }

    const found = findTypeInFields(currentFields, scopePart)

    if (!found) {
      return undefined
    }

    currentFields = found
  }

  // Now find the target type in the current fields
  return findTypeInFields(currentFields, typeName) ?? undefined
}

/**
 * Search through fields for array fields that contain an 'of' member
 * matching the given type name, and return that member's fields.
 */
function findTypeInFields(
  fields: ReadonlyArray<FieldDefinition>,
  typeName: string,
): ReadonlyArray<FieldDefinition> | undefined {
  for (const field of fields) {
    if (field.type === 'array' && 'of' in field && field.of) {
      for (const ofMember of field.of) {
        if (
          ofMember.type === typeName &&
          'fields' in ofMember &&
          ofMember.fields
        ) {
          return ofMember.fields
        }
      }
    }
  }

  return undefined
}

/**
 * Check if a given type has container child fields (i.e., is a container).
 */
export function isContainerType(
  schema: Schema,
  typeName: string,
  scopePath?: string,
): boolean {
  return getContainerChildFields(schema, typeName, scopePath).length > 0
}
