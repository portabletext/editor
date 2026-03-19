import {isTextBlock} from '@portabletext/schema'
import type {OfDefinition} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import {resolveChildArrayField} from '../schema/resolve-child-array-field'
import type {Node} from '../slate/interfaces/node'
import {isObjectNode} from '../slate/node/is-object-node'

export function getChildren(
  root: {children: Array<Node>},
  path: Array<number>,
  schema: EditorSchema,
): Array<Node> {
  let currentChildren: Array<Node> = root.children
  let currentScope: ReadonlyArray<OfDefinition> | undefined

  for (const index of path) {
    const node = currentChildren[index]

    if (!node) {
      return []
    }

    if (isTextBlock({schema}, node)) {
      currentChildren = node.children
      currentScope = undefined
    } else if (isObjectNode({schema}, node)) {
      const arrayField = resolveChildArrayField(
        {schema, scope: currentScope},
        node,
      )

      if (!arrayField) {
        return []
      }

      currentChildren = (node as Record<string, unknown>)[
        arrayField.name
      ] as Array<Node>
      currentScope = arrayField.of
    } else {
      return []
    }
  }

  return currentChildren
}
