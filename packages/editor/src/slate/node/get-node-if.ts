import {isTextBlock, type OfDefinition} from '@portabletext/schema'
import type {EditorSchema} from '../../editor/editor-schema'
import {
  findFieldsForType,
  findFirstArrayField,
} from '../../paths/indexed-path-to-keyed-path'
import type {Node} from '../interfaces/node'
import type {Path} from '../interfaces/path'
import {isLeaf} from './is-leaf'
import {isObjectNode} from './is-object-node'

export function getNodeIf(
  root: {children: Array<Node>} | Node,
  path: Path,
  schema: EditorSchema,
): Node | undefined {
  if (path.length === 0) {
    return undefined
  }

  let currentScope: ReadonlyArray<OfDefinition> | undefined
  let node: {children: Array<Node>} | Node = root

  for (let i = 0; i < path.length; i++) {
    const p = path[i]!

    if (isTextBlock({schema}, node)) {
      return node.children[p]!
    }

    if (isObjectNode({schema}, node)) {
      const objectFields = findFieldsForType(node._type, schema, currentScope)

      if (!objectFields) {
        return
      }

      const arrayField = findFirstArrayField(objectFields)

      console.log('arrayField', arrayField)
      if (!arrayField) {
        return
      }

      const array = (node as Record<string, unknown>)[
        arrayField.name
      ] as Array<Node>

      node = array[p]!
      currentScope = arrayField ? arrayField.of : undefined
      continue
    }

    if (isLeaf(node, schema)) {
      return
    }

    const children = node.children

    if (!children[p]) {
      return
    }

    node = children[p]!
  }

  return node as Node
}
