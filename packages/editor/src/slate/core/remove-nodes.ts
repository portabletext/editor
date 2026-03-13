import {isBlock} from '../editor/is-block'
import {node as editorNode} from '../editor/node'
import {nodes} from '../editor/nodes'
import {pathRef} from '../editor/path-ref'
import {unhangRange} from '../editor/unhang-range'
import {withoutNormalizing} from '../editor/without-normalizing'
import type {Location} from '../interfaces'
import type {Editor, NodeMatch} from '../interfaces/editor'
import {Element} from '../interfaces/element'
import type {Node} from '../interfaces/node'
import {Path} from '../interfaces/path'
import {Range} from '../interfaces/range'
import type {RangeMode} from '../types/types'
import {matchPath} from '../utils/match-path'

export interface RemoveNodesOptions<T extends Node> {
  at?: Location
  match?: NodeMatch<T>
  mode?: RangeMode
  hanging?: boolean
  voids?: boolean
}

export function removeNodes<T extends Node>(
  editor: Editor,
  options: RemoveNodesOptions<T> = {},
): void {
  withoutNormalizing(editor, () => {
    const {hanging = false, voids = false, mode = 'lowest'} = options
    let {at = editor.selection, match} = options

    if (!at) {
      return
    }

    if (match == null) {
      match = Path.isPath(at)
        ? matchPath(editor, at)
        : (n) => Element.isElement(n, editor.schema) && isBlock(editor, n)
    }

    if (!hanging && Range.isRange(at)) {
      at = unhangRange(editor, at, {voids})
    }

    const depths = nodes(editor, {at, match, mode, voids})
    const pathRefs = Array.from(depths, ([, p]) => pathRef(editor, p))

    for (const ref of pathRefs) {
      const path = ref.unref()!

      if (path) {
        const [removedNode] = editorNode(editor, path)
        editor.apply({type: 'remove_node', path, node: removedNode})
      }
    }
  })
}
