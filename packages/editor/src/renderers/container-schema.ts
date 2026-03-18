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
 * When no scope is provided, searches the entire schema tree recursively.
 */
function findFieldsForType(
  schema: Schema,
  typeName: string,
  scopePath?: string,
): ReadonlyArray<FieldDefinition> | undefined {
  // Check top-level block objects first (works with or without scope)
  if (!scopePath) {
    const blockObject = schema.blockObjects.find(
      (blockObj) => blockObj.name === typeName,
    )

    if (blockObject) {
      return blockObject.fields
    }

    // Search the entire schema tree for this type
    for (const blockObj of schema.blockObjects) {
      const found = findTypeFieldsRecursive(blockObj.fields, typeName)
      if (found) {
        return found
      }
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
 * Recursively search all fields for a type and return its fields.
 */
function findTypeFieldsRecursive(
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

        // Recurse into nested types
        if ('fields' in ofMember && ofMember.fields) {
          const found = findTypeFieldsRecursive(ofMember.fields, typeName)
          if (found) {
            return found
          }
        }
      }
    }
  }

  return undefined
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
 *
 * When no scopePath is provided, searches the entire schema tree recursively.
 * A type is a container if it has array fields with nested types anywhere
 * in the schema definition.
 */
export function isContainerType(
  schema: Schema,
  typeName: string,
  scopePath?: string,
): boolean {
  // If a scope is provided, use the scoped lookup
  if (scopePath !== undefined) {
    return getContainerChildFields(schema, typeName, scopePath).length > 0
  }

  // Check top-level block objects first
  if (getContainerChildFields(schema, typeName).length > 0) {
    return true
  }

  // Search the entire schema tree for this type
  return hasContainerFieldsAnywhere(schema, typeName)
}

/**
 * Recursively search all block object definitions for a type with array fields.
 */
function hasContainerFieldsAnywhere(schema: Schema, typeName: string): boolean {
  for (const blockObject of schema.blockObjects) {
    if (searchFieldsForContainerType(blockObject.fields, typeName)) {
      return true
    }
  }

  return false
}

/**
 * Recursively search field definitions for a type that has array child fields.
 * A type is a container if it has any array fields - the array field's contents
 * can be blocks, objects, or other types.
 */
function searchFieldsForContainerType(
  fields: ReadonlyArray<FieldDefinition>,
  typeName: string,
): boolean {
  for (const field of fields) {
    if (field.type === 'array' && 'of' in field && field.of) {
      for (const ofMember of field.of) {
        if (ofMember.type === typeName) {
          // Found the type - check if it has any array fields (making it a container)
          if ('fields' in ofMember && ofMember.fields) {
            return ofMember.fields.some(
              (childField) =>
                childField.type === 'array' &&
                'of' in childField &&
                childField.of,
            )
          }

          return false
        }

        // Recurse into nested types
        if ('fields' in ofMember && ofMember.fields) {
          if (searchFieldsForContainerType(ofMember.fields, typeName)) {
            return true
          }
        }
      }
    }
  }

  return false
}
