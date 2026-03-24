import {isSpan} from '@portabletext/schema'
import {getNodeDescendants} from '../../node-traversal/get-nodes'
import type {Editor} from '../interfaces/editor'
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
      return pathLevels(path)
    }

    case 'insert_node': {
      const {node, path} = op
      const levels = pathLevels(path)

      if (isSpan(editor, node)) {
        return levels
      }

      const descendants = Array.from(
        getNodeDescendants(editor, node),
        (entry) => path.concat(entry.path),
      )

      return [...levels, ...descendants]
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
