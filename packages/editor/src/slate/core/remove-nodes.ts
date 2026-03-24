import {isTextBlock} from '@portabletext/schema'
import {getNode} from '../../node-traversal/get-node'
import {getNodes} from '../../node-traversal/get-nodes'
import {path as editorPath} from '../editor/path'
import {pathRef} from '../editor/path-ref'
import {unhangRange} from '../editor/unhang-range'
import {withoutNormalizing} from '../editor/without-normalizing'
import type {Editor, NodeMatch} from '../interfaces/editor'
import type {Location} from '../interfaces/location'
import type {Node} from '../interfaces/node'
import {comparePaths} from '../path/compare-paths'
import {isPath} from '../path/is-path'
import {isRange} from '../range/is-range'
import {rangeEdges} from '../range/range-edges'
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
    const {hanging = false, mode = 'lowest'} = options
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
      at = unhangRange(editor, at)
    }

    // Resolve location to from/to paths
    let from: Array<number>
    let to: Array<number>

    if (isRange(at)) {
      const [start, end] = rangeEdges(at)
      from = start.path
      to = end.path
    } else if (isPath(at)) {
      from = editorPath(editor, at, {edge: 'start'})
      to = editorPath(editor, at, {edge: 'end'})
    } else {
      // Point
      from = at.path
      to = at.path
    }

    // Apply mode filtering (replicating old nodes() behavior)
    const depths: Array<[Node, Array<number>]> = []
    let hit: [Node, Array<number>] | undefined

    for (const {node, path: nodePath} of getNodes(editor, {
      from,
      to,
      match: (n, p) => match!(n, p),
    })) {
      const isLower = hit && comparePaths(nodePath, hit[1]) === 0

      if (mode === 'highest' && isLower) {
        continue
      }

      if (mode === 'lowest' && isLower) {
        hit = [node, nodePath]
        continue
      }

      const emit = mode === 'lowest' ? hit : [node, nodePath]

      if (emit) {
        depths.push(emit as [Node, Array<number>])
      }

      hit = [node, nodePath]
    }

    if (mode === 'lowest' && hit) {
      depths.push(hit)
    }

    const pathRefs = Array.from(depths, ([, p]) => pathRef(editor, p))

    for (const ref of pathRefs) {
      const path = ref.unref()!

      if (path) {
        const removedEntry = getNode(editor, path)
        if (removedEntry) {
          const removedNode = removedEntry.node
          editor.apply({type: 'remove_node', path, node: removedNode})
        }
      }
    }
  })
}
