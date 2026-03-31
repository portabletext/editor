import {isSpan} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import {getNodeDescendants} from '../node-traversal/get-nodes'
import type {Node} from '../slate/interfaces/node'
import type {Operation} from '../slate/interfaces/operation'
import {pathLevels} from '../slate/path/path-levels'
import {getChildFieldName} from './get-child-field-name'

/**
 * Get the "dirty" indexed paths generated from an operation.
 */
export function getDirtyIndexedPaths(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
    value: Array<Node>
  },
  op: Operation,
): Array<Array<number>> {
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
        const childFieldName = getChildFieldName(context, path)

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

              for (const entry of getNodeDescendants(context, child as Node)) {
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

      if (isSpan(context, node)) {
        return levels
      }

      for (const entry of getNodeDescendants(context, node)) {
        levels.push(path.concat(entry.path))
      }

      return levels
    }

    case 'remove_node': {
      const {path} = op
      const ancestors = pathLevels(path).slice(0, -1)
      return [...ancestors]
    }

    default: {
      return []
    }
  }
}
