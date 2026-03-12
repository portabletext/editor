import type {Editor} from '../interfaces/editor'
import {Node} from '../interfaces/node'
import {Path} from '../interfaces/path'
import {Text} from '../interfaces/text'
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

      // PTE paths with non-numeric segments target deep block object
      // properties. Only the numeric prefix matters for normalization
      // since block objects are opaque to Slate.
      if (path.some((s) => typeof s !== 'number')) {
        const numericPrefix = []
        for (const s of path) {
          if (typeof s !== 'number') {
            break
          }
          numericPrefix.push(s)
        }
        return Path.levels(numericPrefix)
      }

      return Path.levels(path as Path)
    }

    case 'insert_node': {
      const {node, path} = op
      const levels = Path.levels(path)
      const descendants = Text.isText(node, _editor.schema)
        ? []
        : Array.from(Node.nodes(node, _editor.schema), ([, p]) =>
            path.concat(p),
          )

      return [...levels, ...descendants]
    }

    case 'remove_node': {
      const {path} = op
      const ancestors = Path.ancestors(path)
      return [...ancestors]
    }

    default: {
      return []
    }
  }
}
