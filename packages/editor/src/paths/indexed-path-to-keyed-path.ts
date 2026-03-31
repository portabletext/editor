import type {EditorSchema} from '../editor/editor-schema'
import {getNodeChildren} from '../node-traversal/get-children'
import type {Node} from '../slate/interfaces/node'
import type {KeyedSegment, Path} from '../types/paths'

/**
 * Converts an indexed path to a keyed path by recursively walking the tree.
 *
 * At each level, the node at the indexed position is resolved and its `_key`
 * is added to the keyed path. If there are more path segments, the child
 * array field name (resolved via `getNodeChildren`) is added as a string
 * segment and the walk continues into that field's children.
 */
export function indexedPathToKeyedPath(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
    value: Array<Node>
  },
  path: Array<number>,
): Path | undefined {
  if (path.length === 0) {
    return []
  }

  const keyedPath: Array<KeyedSegment | string> = []
  let nodeChildren = getNodeChildren(
    {schema: context.schema, editableTypes: context.editableTypes},
    {value: context.value},
    undefined,
    '',
  )

  for (let i = 0; i < path.length; i++) {
    if (!nodeChildren) {
      return undefined
    }

    const index = path.at(i)

    if (index === undefined) {
      return undefined
    }

    const node = nodeChildren.children.at(index)

    if (!node || !node._key) {
      return undefined
    }

    keyedPath.push({_key: node._key})

    if (i < path.length - 1) {
      const childInfo = getNodeChildren(
        {schema: context.schema, editableTypes: context.editableTypes},
        node,
        nodeChildren.scope,
        nodeChildren.scopePath,
      )

      if (!childInfo) {
        return undefined
      }

      keyedPath.push(childInfo.fieldName)
      nodeChildren = childInfo
    }
  }

  return keyedPath
}
