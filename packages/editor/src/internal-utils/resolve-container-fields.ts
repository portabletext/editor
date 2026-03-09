import type {FieldDefinition} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'

/**
 * Find array field names for a type by searching through schema.blockObjects
 * and their nested `of` definitions.
 *
 * First checks top-level block objects for a direct name match.
 * If not found, searches nested `of` definitions recursively.
 */
export function resolveArrayFields(
  schema: EditorSchema,
  typeName: string,
): string[] {
  // First check top-level block objects
  const blockObj = schema.blockObjects.find((bo) => bo.name === typeName)
  if (blockObj) {
    return blockObj.fields.filter((f) => f.type === 'array').map((f) => f.name)
  }

  // Search nested of definitions in all block objects
  for (const bo of schema.blockObjects) {
    const found = findTypeInFields(bo.fields, typeName)
    if (found) {
      return found.filter((f) => f.type === 'array').map((f) => f.name)
    }
  }

  return []
}

function findTypeInFields(
  fields: ReadonlyArray<FieldDefinition>,
  typeName: string,
): ReadonlyArray<FieldDefinition> | undefined {
  for (const field of fields) {
    if (field.type === 'array' && 'of' in field && field.of) {
      for (const ofDef of field.of) {
        if (ofDef.type === typeName && 'fields' in ofDef && ofDef.fields) {
          return ofDef.fields
        }
        // Recurse into nested of definitions
        if ('fields' in ofDef && ofDef.fields) {
          const found = findTypeInFields(ofDef.fields, typeName)
          if (found) {
            return found
          }
        }
      }
    }
  }
  return undefined
}
