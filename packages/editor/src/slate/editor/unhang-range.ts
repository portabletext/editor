import {isSpan, isTextBlock} from '@portabletext/schema'
import type {Editor} from '../interfaces/editor'
import type {Range} from '../interfaces/range'
import {isBeforePath} from '../path/is-before-path'
import {pathHasPrevious} from '../path/path-has-previous'
import {isCollapsedRange} from '../range/is-collapsed-range'
import {rangeEdges} from '../range/range-edges'
import {above} from './above'
import {nodes} from './nodes'
import {start as editorStart} from './start'

export function unhangRange(
  editor: Editor,
  range: Range,
  options: {includeObjectNodes?: boolean} = {},
): Range {
  const {includeObjectNodes = false} = options
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

  const endBlock = above(editor, {
    at: end,
    match: (n) => isTextBlock({schema: editor.schema}, n),
    includeObjectNodes,
  })
  const blockPath = endBlock ? endBlock[1] : []
  const first = editorStart(editor, start)
  const before = {anchor: first, focus: end}
  let skip = true

  for (const [node, path] of nodes(editor, {
    at: before,
    match: (n) => isSpan({schema: editor.schema}, n),
    reverse: true,
    includeObjectNodes,
  })) {
    if (skip) {
      skip = false
      continue
    }

    if (node.text !== '' || isBeforePath(path, blockPath)) {
      end = {path, offset: node.text.length}
      break
    }
  }

  return {anchor: start, focus: end}
}
