import type {
  FieldDefinition,
  OfDefinition,
  PortableTextObject,
} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'

/**
 * Returns the name of the child array field for a given node type,
 * or undefined if the node has no child array field.
 *
 * Only resolves child fields for types in `editableTypes`. If a type
 * has no registered renderer, its fields are regular data properties,
 * not structural children managed by the editor.
 *
 * Searches the full schema tree, not just top-level block objects.
 */
export function resolveChildFieldName(
  schema: EditorSchema,
  editableTypes: Set<string>,
  node: PortableTextObject,
): string | undefined {
  if (!editableTypes.has(node._type)) {
    return undefined
  }

  // Search top-level block objects first
  for (const blockObject of schema.blockObjects) {
    if (blockObject.name === node._type) {
      return findChildArrayFieldName(blockObject.fields)
    }
  }

  // Recursively search inside field definitions of all block objects
  for (const blockObject of schema.blockObjects) {
    const result = searchFieldDefinitions(blockObject.fields, node._type)
    if (result !== undefined) {
      return result
    }
  }

  return undefined
}

function findChildArrayFieldName(
  fields: ReadonlyArray<FieldDefinition> | undefined,
): string | undefined {
  if (!fields) {
    return undefined
  }

  for (const field of fields) {
    if (field.type === 'array' && 'of' in field && field.of) {
      return field.name
    }
  }

  return undefined
}

function searchFieldDefinitions(
  fields: ReadonlyArray<FieldDefinition> | undefined,
  targetType: string,
): string | undefined {
  if (!fields) {
    return undefined
  }

  for (const field of fields) {
    if (field.type !== 'array' || !('of' in field) || !field.of) {
      continue
    }

    for (const ofMember of field.of) {
      if (ofMember.type === targetType) {
        return findChildArrayFieldName(getOfMemberFields(ofMember))
      }

      // Recurse into the of member's fields
      const memberFields = getOfMemberFields(ofMember)
      if (memberFields) {
        const result = searchFieldDefinitions(memberFields, targetType)
        if (result !== undefined) {
          return result
        }
      }
    }
  }

  return undefined
}

function getOfMemberFields(
  ofMember: OfDefinition,
): ReadonlyArray<FieldDefinition> | undefined {
  if ('fields' in ofMember && ofMember.fields) {
    return ofMember.fields
  }
  return undefined
}
