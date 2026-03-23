import {isSpan} from '@portabletext/schema'
import type {Editor} from '../interfaces/editor'
import {getNodes} from '../node/get-nodes'
import {pathAncestors} from '../path/path-ancestors'
import {pathLevels} from '../path/path-levels'
import type {WithEditorFirstArg} from '../utils/types'

/**
 * Get the "dirty" paths generated from an operation.
 */
export const getDirtyPaths: WithEditorFirstArg<Editor['getDirtyPaths']> = (
  _editor,
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
      const descendants = isSpan({schema: _editor.schema}, node)
        ? []
        : Array.from(getNodes(node, _editor.schema), ([, p]) => path.concat(p))

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
