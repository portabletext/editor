import {isSpan, isTextBlock} from '@portabletext/schema'
import {getNodeDescendants} from '../../node-traversal/get-nodes'
import {resolveChildArrayField} from '../../schema/resolve-child-array-field'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import {isObjectNode} from '../node/is-object-node'
import {pathAncestors} from '../path/path-ancestors'
import {pathLevels} from '../path/path-levels'
import type {WithEditorFirstArg} from '../utils/types'

/**
 * Get the "dirty" paths generated from an operation.
 */
export const getDirtyPaths: WithEditorFirstArg<Editor['getDirtyPaths']> = (
  editor,
  op,
) => {
  switch (op.type) {
    case 'insert_text':
    case 'remove_text':
    case 'set_node': {
      const {path} = op
      const levels = pathLevels(path)

      // When set_node replaces a child array field, the new children
      // need normalization. Dirty their paths and their descendants'
      // paths so the normalizer visits them.
      if (op.type === 'set_node') {
        const childFieldName = resolveChildFieldNameAtPath(editor, path)

        if (childFieldName) {
          const newChildren = (op.newProperties as Record<string, unknown>)[
            childFieldName
          ]

          if (Array.isArray(newChildren)) {
            for (let i = 0; i < newChildren.length; i++) {
              const child = newChildren[i]

              if (typeof child !== 'object' || child === null) {
                continue
              }

              const childPath = [...path, i]
              levels.push(childPath)

              for (const entry of getNodeDescendants(editor, child as Node)) {
                levels.push(childPath.concat(entry.path))
              }
            }
          }
        }
      }

      return levels
    }

    case 'insert_node': {
      const {node, path} = op
      const levels = pathLevels(path)

      if (isSpan(editor, node)) {
        return levels
      }

      for (const entry of getNodeDescendants(editor, node)) {
        levels.push(path.concat(entry.path))
      }

      return levels
    }

    case 'remove_node': {
      const {path} = op
      const ancestors = pathAncestors(path)
      return [...ancestors]
    }

    default: {
      return []
    }
  }
}

/**
 * Resolve the child field name for the node at a given indexed path.
 *
 * Text blocks always use 'children'. Container types use the schema-resolved
 * child array field name. Spans and leaf nodes return undefined.
 */
function resolveChildFieldNameAtPath(
  editor: Editor,
  path: Array<number>,
): string | undefined {
  let node: Node | undefined = editor.children[path[0]!]

  for (let i = 1; i < path.length; i++) {
    if (!node || typeof node !== 'object') {
      return undefined
    }

    if (isTextBlock(editor, node)) {
      node = node.children[path[i]!]
    } else if (isObjectNode(editor, node)) {
      const field = resolveChildArrayField({schema: editor.schema}, node)

      if (!field) {
        return undefined
      }

      node = (node as Record<string, unknown>)[field.name] as Node | undefined
    } else {
      return undefined
    }
  }

  if (!node || typeof node !== 'object') {
    return undefined
  }

  if (isTextBlock(editor, node)) {
    return 'children'
  }

  if (isObjectNode(editor, node)) {
    const field = resolveChildArrayField({schema: editor.schema}, node)
    return field?.name
  }

  return undefined
}
