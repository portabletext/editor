import {isSpan} from '@portabletext/schema'
import {getAncestorTextBlock} from '../../node-traversal/get-ancestor-text-block'
import {getNodes} from '../../node-traversal/get-nodes'
import type {Editor} from '../interfaces/editor'
import type {Range} from '../interfaces/range'
import {isBeforePath} from '../path/is-before-path'
import {pathHasPrevious} from '../path/path-has-previous'
import {isCollapsedRange} from '../range/is-collapsed-range'
import {rangeEdges} from '../range/range-edges'
import {start as editorStart} from './start'

export function unhangRange(editor: Editor, range: Range): Range {
  let [start, end] = rangeEdges(range)

  // PERF: exit early if we can guarantee that the range isn't hanging.
  if (
    start.offset !== 0 ||
    end.offset !== 0 ||
    isCollapsedRange(range) ||
    pathHasPrevious(end.path)
  ) {
    return range
  }

  const endBlock = getAncestorTextBlock(editor, end.path)
  const blockPath = endBlock ? endBlock.path : []
  const first = editorStart(editor, start)
  const before = {anchor: first, focus: end}
  const [beforeStart, beforeEnd] = rangeEdges(before)
  let skip = true

  for (const {node, path: nodePath} of getNodes(editor, {
    from: beforeStart.path,
    to: beforeEnd.path,
    match: (n) => isSpan({schema: editor.schema}, n),
    reverse: true,
  })) {
    if (skip) {
      skip = false
      continue
    }

    if (!isSpan({schema: editor.schema}, node)) {
      continue
    }

    if (node.text !== '' || isBeforePath(nodePath, blockPath)) {
      end = {path: nodePath, offset: node.text.length}
      break
    }
  }

  return {anchor: start, focus: end}
}
