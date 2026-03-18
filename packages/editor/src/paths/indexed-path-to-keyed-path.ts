import {isTextBlock} from '@portabletext/schema'
import type {FieldDefinition, OfDefinition} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import {isObjectNode} from '../slate/node/is-object-node'
import type {KeyedSegment} from '../types/paths'

/**
 * Converts an indexed path to a keyed path by recursively walking the tree.
 *
 * For text blocks, children are stored in the `children` field.
 *
 * For object nodes, the first array field with an `of` property is used,
 * resolved by looking up the node's type in the current scope of `of`
 * definitions or the top-level schema.
 */
export function indexedPathToKeyedPath(
  root: {children: Array<Node>},
  path: Array<number>,
  schema: EditorSchema,
): Array<KeyedSegment | string> | null {
  if (path.length === 0) {
    return null
  }

  const keyedPath: Array<KeyedSegment | string> = []
  let currentChildren: Array<Node> = root.children
  let currentScope: ReadonlyArray<OfDefinition> | undefined

  for (let i = 0; i < path.length; i++) {
    const index = path[i]

    if (index === undefined) {
      return null
    }

    const node = currentChildren[index]

    if (!node || !node._key) {
      return null
    }

    keyedPath.push({_key: node._key})

    if (i < path.length - 1) {
      if (isTextBlock({schema}, node)) {
        keyedPath.push('children')
        currentChildren = node.children
        currentScope = undefined
      } else if (isObjectNode({schema}, node)) {
        const objectFields = findFieldsForType(node._type, schema, currentScope)

        if (!objectFields) {
          return keyedPath
        }

        const arrayField = findFirstArrayField(objectFields)

        if (!arrayField) {
          return keyedPath
        }

        keyedPath.push(arrayField.name)
        currentChildren = (node as Record<string, unknown>)[
          arrayField.name
        ] as Array<Node>
        currentScope = arrayField ? arrayField.of : undefined
      }
    }
  }

  return keyedPath
}

function findFieldsForType(
  typeName: string,
  schema: EditorSchema,
  scope?: ReadonlyArray<OfDefinition>,
): ReadonlyArray<FieldDefinition> | undefined {
  if (scope) {
    for (const ofDefinition of scope) {
      if (
        ofDefinition.type === typeName &&
        'fields' in ofDefinition &&
        ofDefinition.fields
      ) {
        return ofDefinition.fields
      }
    }
  }

  const blockObject = schema.blockObjects.find(
    (definition) => definition.name === typeName,
  )

  if (blockObject) {
    return blockObject.fields
  }

  return undefined
}

function findFirstArrayField(
  fields: ReadonlyArray<FieldDefinition>,
): (FieldDefinition & {type: 'array'}) | undefined {
  for (const field of fields) {
    if (field.type === 'array') {
      return field
    }
  }

  return undefined
}
