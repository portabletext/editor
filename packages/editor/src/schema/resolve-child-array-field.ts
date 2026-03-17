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

function isChildArrayField(field: FieldDefinition): field is ChildArrayField {
  return field.type === 'array' && 'of' in field
}
