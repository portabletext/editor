import {isTextBlock} from '@portabletext/schema'
import {node as editorNode} from '../editor/node'
import {nodes} from '../editor/nodes'
import {pathRef} from '../editor/path-ref'
import {unhangRange} from '../editor/unhang-range'
import {withoutNormalizing} from '../editor/without-normalizing'
import type {Editor, NodeMatch} from '../interfaces/editor'
import type {Location} from '../interfaces/location'
import type {Node} from '../interfaces/node'
import {isPath} from '../path/is-path'
import {isRange} from '../range/is-range'
import type {RangeMode} from '../types/types'
import {matchPath} from '../utils/match-path'

interface RemoveNodesOptions<T extends Node> {
  at?: Location
  match?: NodeMatch<T>
  mode?: RangeMode
  hanging?: boolean
  includeObjectNodes?: boolean
}

export function removeNodes<T extends Node>(
  editor: Editor,
  options: RemoveNodesOptions<T> = {},
): void {
  withoutNormalizing(editor, () => {
    const {
      hanging = false,
      includeObjectNodes = false,
      mode = 'lowest',
    } = options
    let {at = editor.selection, match} = options

    if (!at) {
      return
    }

    if (match == null) {
      match = isPath(at)
        ? matchPath(editor, at)
        : (n) => isTextBlock({schema: editor.schema}, n)
    }

    if (!hanging && isRange(at)) {
      at = unhangRange(editor, at, {includeObjectNodes})
    }

    const depths = nodes(editor, {at, match, mode, includeObjectNodes})
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
