import type {OfDefinition} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import {resolveChildArrayField} from '../schema/resolve-child-array-field'
import type {Node} from '../slate/interfaces/node'
import {isObjectNode} from '../slate/node/is-object-node'
import type {KeyedSegment, Path} from '../types/paths'

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
): Path | undefined {
  if (path.length === 0) {
    return []
  }

  const keyedPath: Array<KeyedSegment | string> = []
  let currentChildren: Array<Node> = root.children
  let currentScope: ReadonlyArray<OfDefinition> | undefined

  for (let i = 0; i < path.length; i++) {
    const index = path[i]

    if (index === undefined) {
      return undefined
    }

    const node = currentChildren[index]

    if (!node || !node._key) {
      return undefined
    }

    keyedPath.push({_key: node._key})

    if (i < path.length - 1) {
      if (isTextBlock({schema}, node)) {
        keyedPath.push('children')
        currentChildren = node.children
        currentScope = undefined
      } else if (isObjectNode({schema}, node)) {
        const arrayField = resolveChildArrayField(
          {schema, scope: currentScope},
          node,
        )

        if (!arrayField) {
          return undefined
        }

        keyedPath.push(arrayField.name)
        currentChildren = (node as Record<string, unknown>)[
          arrayField.name
        ] as Array<Node>
        currentScope = arrayField.of
      }
    }
  }

  return keyedPath
}
