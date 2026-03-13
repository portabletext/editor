import {isElement} from '../element/is-element'
import type {Range} from '../interfaces'
import type {Editor} from '../interfaces/editor'
import {isBeforePath} from '../path/is-before-path'
import {pathHasPrevious} from '../path/path-has-previous'
import {isCollapsedRange} from '../range/is-collapsed-range'
import {rangeEdges} from '../range/range-edges'
import {isText} from '../text/is-text'
import {above} from './above'
import {isBlock} from './is-block'
import {nodes} from './nodes'
import {start as editorStart} from './start'

export function unhangRange(
  editor: Editor,
  range: Range,
  options: {voids?: boolean} = {},
): Range {
  const {voids = false} = options
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
    match: (n) => isElement(n, editor.schema) && isBlock(editor, n),
    voids,
  })
  const blockPath = endBlock ? endBlock[1] : []
  const first = editorStart(editor, start)
  const before = {anchor: first, focus: end}
  let skip = true

  for (const [node, path] of nodes(editor, {
    at: before,
    match: (n) => isText(n, editor.schema),
    reverse: true,
    voids,
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
