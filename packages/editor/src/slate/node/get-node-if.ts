import {isTextBlock, type OfDefinition} from '@portabletext/schema'
import type {EditorSchema} from '../../editor/editor-schema'
import {resolveChildArrayField} from '../../schema/resolve-child-array-field'
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
      const arrayField = resolveChildArrayField(
        {schema, scope: currentScope},
        node,
      )

      if (!arrayField) {
        return undefined
      }

      const array = (node as Record<string, unknown>)[
        arrayField.name
      ] as Array<Node>

      node = array[p]!
      currentScope = arrayField.of
      continue
    }

    if (isLeaf(node, schema)) {
      return undefined
    }

    const children = node.children

    if (!children[p]) {
      return undefined
    }

    node = children[p]!
  }

  return node as Node
}
