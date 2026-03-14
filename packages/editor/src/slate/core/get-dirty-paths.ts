import type {Editor} from '../interfaces/editor'
import {getNodes} from '../node/get-nodes'
import {pathAncestors} from '../path/path-ancestors'
import {pathLevels} from '../path/path-levels'
import {isText} from '../text/is-text'
import {resolveKeyedPath} from '../utils/resolve-keyed-path'
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
      const descendants = isText(node, _editor.schema)
        ? []
        : Array.from(getNodes(node, _editor.schema), ([, p]) => path.concat(p))

      return [...levels, ...descendants]
    }

    case 'remove_node': {
      const {path} = op
      const ancestors = pathAncestors(path)
      return [...ancestors]
    }

    case 'set_node_keyed': {
      const indexedPath = resolveKeyedPath(
        _editor,
        op.path,
        _editor.blockIndexMap,
      )
      if (!indexedPath) {
        return []
      }
      return pathLevels(indexedPath)
    }

    default: {
      return []
    }
  }
}
