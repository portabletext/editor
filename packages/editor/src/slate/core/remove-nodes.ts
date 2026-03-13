import type {Location} from '../interfaces'
import {Editor, type NodeMatch} from '../interfaces/editor'
import {Element} from '../interfaces/element'
import {Node} from '../interfaces/node'
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
  Editor.withoutNormalizing(editor, () => {
    const {hanging = false, voids = false, mode = 'lowest'} = options
    let {at = editor.selection, match} = options

    if (!at) {
      return
    }

    if (match == null) {
      match = Path.isPath(at)
        ? matchPath(editor, at)
        : (n) =>
            Element.isElement(n, editor.schema) && Editor.isBlock(editor, n)
    }

    if (!hanging && Range.isRange(at)) {
      at = Editor.unhangRange(editor, at, {voids})
    }

    const depths = Editor.nodes(editor, {at, match, mode, voids})
    const pathRefs = Array.from(depths, ([, p]) => Editor.pathRef(editor, p))

    for (const pathRef of pathRefs) {
      const path = pathRef.unref()!

      if (path) {
        const [node] = Editor.node(editor, path)
        editor.apply({type: 'remove_node', path, node})
      }
    }
  })
}
