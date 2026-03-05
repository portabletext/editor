import type {Editor, Location, Node, Path} from '../../index'
import type {MaximizeMode, RangeMode} from '../../types/types'
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
   * Merge a node at a location with the previous node of the same depth,
   * removing any empty containing nodes after the merge if necessary.
   */
  mergeNodes: <T extends Node>(
    editor: Editor,
    options?: {
      at?: Location
      match?: NodeMatch<T>
      mode?: RangeMode
      hanging?: boolean
      voids?: boolean
    },
  ) => void

  /**
   * Move the nodes at a location to a new location.
   */
  moveNodes: <T extends Node>(
    editor: Editor,
    options: {
      at?: Location
      match?: NodeMatch<T>
      mode?: MaximizeMode
      to: Path
      voids?: boolean
    },
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

  /**
   * Split the nodes at a specific location.
   */
  splitNodes: <T extends Node>(
    editor: Editor,
    options?: {
      at?: Location
      match?: NodeMatch<T>
      mode?: RangeMode
      always?: boolean
      height?: number
      voids?: boolean
    },
  ) => void
}

// eslint-disable-next-line no-redeclare
export const NodeTransforms: NodeTransforms = {
  insertNodes(editor, nodes, options) {
    editor.insertNodes(nodes, options)
  },
  mergeNodes(editor, options) {
    editor.mergeNodes(options)
  },
  moveNodes(editor, options) {
    editor.moveNodes(options)
  },
  removeNodes(editor, options) {
    editor.removeNodes(options)
  },
  splitNodes(editor, options) {
    editor.splitNodes(options)
  },
}
