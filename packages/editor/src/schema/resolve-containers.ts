import type {FieldDefinition, OfDefinition} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'

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
 * registered containers. Walks the schema once per container type,
 * collecting all scoped type paths and their editable array fields.
 */
export function resolveContainers(
  schema: EditorSchema,
  containerConfigs: Map<string, {renderer: {type: string}}>,
): Containers {
  const containers: Containers = new Map()

  for (const [, config] of containerConfigs) {
    for (const entry of resolveTypePaths(schema, config.renderer.type)) {
      if (entry.field) {
        containers.set(entry.path, entry.field)
      }
    }
  }

  return containers
}

function resolveTypePaths(
  schema: EditorSchema,
  typeName: string,
): Array<{path: string; field: ChildArrayField | undefined}> {
  const entries: Array<{path: string; field: ChildArrayField | undefined}> = []

  const blockObject = schema.blockObjects.find(
    (definition) => definition.name === typeName,
  )

  if (!blockObject || !('fields' in blockObject) || !blockObject.fields) {
    entries.push({path: typeName, field: undefined})
    return entries
  }

  const rootField = resolveFirstChildArrayField(blockObject.fields)
  walkFields(blockObject.fields, typeName, entries)
  entries.unshift({path: typeName, field: rootField})
  return entries
}

function isChildArrayField(field: FieldDefinition): field is ChildArrayField {
  return field.type === 'array' && 'of' in field && Array.isArray(field.of)
}

function resolveFirstChildArrayField(
  fields: ReadonlyArray<FieldDefinition>,
): ChildArrayField | undefined {
  return fields.find(isChildArrayField)
}

function walkFields(
  fields: ReadonlyArray<FieldDefinition>,
  currentPath: string,
  entries: Array<{path: string; field: ChildArrayField | undefined}>,
) {
  for (const field of fields) {
    if (isChildArrayField(field)) {
      for (const ofMember of field.of) {
        if (ofMember.type === 'block') {
          continue
        }
        const scopedPath = `${currentPath}.${ofMember.type}`
        let childField: ChildArrayField | undefined
        if ('fields' in ofMember && ofMember.fields) {
          childField = resolveFirstChildArrayField(ofMember.fields)
          walkFields(ofMember.fields, scopedPath, entries)
        }
        entries.push({path: scopedPath, field: childField})
      }
    }
  }
}
