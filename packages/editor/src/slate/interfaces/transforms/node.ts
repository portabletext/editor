import type {Editor, Location, Node} from '../../index'
import type {RangeMode} from '../../types/types'
import type {NodeMatch} from '../editor'

export interface NodeInsertNodesOptions<T extends Node> {
  at?: Location
  match?: NodeMatch<T>
  mode?: RangeMode
  hanging?: boolean
  select?: boolean
  voids?: boolean
  batchDirty?: boolean
}

export interface NodeTransforms {
  /**
   * Insert nodes in the editor
   * at the specified location or (if not defined) the current selection or (if not defined) the end of the document.
   */
  insertNodes: <T extends Node>(
    editor: Editor,
    nodes: Node | Node[],
    options?: NodeInsertNodesOptions<T>,
  ) => void

  /**
   * Remove the nodes at a specific location in the document.
   */
  removeNodes: <T extends Node>(
    editor: Editor,
    options?: {
      at?: Location
      match?: NodeMatch<T>
      mode?: RangeMode
      hanging?: boolean
      voids?: boolean
    },
  ) => void
}

// eslint-disable-next-line no-redeclare
export const NodeTransforms: NodeTransforms = {
  insertNodes(editor, nodes, options) {
    editor.insertNodes(nodes, options)
  },
  removeNodes(editor, options) {
    editor.removeNodes(options)
  },
}
