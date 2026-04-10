import type {FieldDefinition, OfDefinition} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'

export type ChildArrayField = FieldDefinition & {
  type: 'array'
  of: ReadonlyArray<OfDefinition>
}

/**
 * Maps scoped type names to their resolved editable array fields.
 *
 * Key: scoped type name (e.g., 'table', 'table.row', 'table.row.cell')
 * Value: resolved array field definitions with name and of scope
 */
export type EditableTypes = Map<string, Array<ChildArrayField>>

/**
 * Resolve the complete EditableTypes Map from a schema and a set of
 * registered renderers. Walks the schema once per renderer type,
 * collecting all scoped type paths and their editable array fields.
 */
export function resolveEditableTypes(
  schema: EditorSchema,
  renderers: Map<string, {renderer: {type: string}}>,
): EditableTypes {
  const editableTypes: EditableTypes = new Map()

  for (const [, config] of renderers) {
    for (const entry of resolveTypePaths(schema, config.renderer.type)) {
      editableTypes.set(entry.path, entry.fields)
    }
  }

  return editableTypes
}

function resolveTypePaths(
  schema: EditorSchema,
  typeName: string,
): Array<{path: string; fields: Array<ChildArrayField>}> {
  const entries: Array<{path: string; fields: Array<ChildArrayField>}> = []

  const blockObject = schema.blockObjects.find(
    (definition) => definition.name === typeName,
  )

  if (!blockObject || !('fields' in blockObject) || !blockObject.fields) {
    entries.push({path: typeName, fields: []})
    return entries
  }

  const rootFields: Array<ChildArrayField> = []
  walkFields(blockObject.fields, typeName, entries, rootFields)
  entries.unshift({path: typeName, fields: rootFields})
  return entries
}

function isChildArrayField(field: FieldDefinition): field is ChildArrayField {
  return field.type === 'array' && 'of' in field && Array.isArray(field.of)
}

function walkFields(
  fields: ReadonlyArray<FieldDefinition>,
  currentPath: string,
  entries: Array<{path: string; fields: Array<ChildArrayField>}>,
  parentFields: Array<ChildArrayField>,
) {
  for (const field of fields) {
    if (isChildArrayField(field)) {
      parentFields.push(field)
      for (const ofMember of field.of) {
        if (ofMember.type === 'block') {
          continue
        }
        const scopedPath = `${currentPath}.${ofMember.type}`
        const childFields: Array<ChildArrayField> = []
        if ('fields' in ofMember && ofMember.fields) {
          walkFields(ofMember.fields, scopedPath, entries, childFields)
        }
        entries.push({path: scopedPath, fields: childFields})
      }
    }
  }
}
