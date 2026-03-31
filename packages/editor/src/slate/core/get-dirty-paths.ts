import {isSpan} from '@portabletext/schema'
import {getNodeDescendants} from '../../node-traversal/get-nodes'
import {getChildFieldName} from '../../paths/get-child-field-name'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
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
        const childFieldName = getChildFieldName(editor, path)

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
