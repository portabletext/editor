import type {FieldDefinition} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'

/**
 * Given a registered renderer type name, walk the schema tree and return
 * all scoped type paths that should be editable.
 *
 * For 'table' with schema: table > rows > row > cells > cell > content > block
 * Returns: ['table', 'table.row', 'table.row.cell']
 */
export function getEditableTypePaths(
  schema: EditorSchema,
  typeName: string,
): Array<string> {
  const paths: Array<string> = [typeName]

  const blockObject = schema.blockObjects.find(
    (definition) => definition.name === typeName,
  )

  if (!blockObject || !('fields' in blockObject) || !blockObject.fields) {
    return paths
  }

  walkFields(blockObject.fields, typeName, paths)
  return paths
}

function walkFields(
  fields: ReadonlyArray<FieldDefinition>,
  currentPath: string,
  paths: Array<string>,
) {
  for (const field of fields) {
    if (field.type === 'array' && 'of' in field && field.of) {
      for (const ofMember of field.of) {
        if (ofMember.type === 'block') {
          continue
        }
        const scopedPath = `${currentPath}.${ofMember.type}`
        paths.push(scopedPath)
        if ('fields' in ofMember && ofMember.fields) {
          walkFields(
            ofMember.fields as ReadonlyArray<FieldDefinition>,
            scopedPath,
            paths,
          )
        }
      }
    }
  }
}
