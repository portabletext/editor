import type {Range} from '../interfaces'
import type {Editor} from '../interfaces/editor'
import {Element} from '../interfaces/element'
import {Path} from '../interfaces/path'
import {Range as RangeUtils} from '../interfaces/range'
import {Text} from '../interfaces/text'
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
  let [start, end] = RangeUtils.edges(range)

  // PERF: exit early if we can guarantee that the range isn't hanging.
  if (
    start.offset !== 0 ||
    end.offset !== 0 ||
    RangeUtils.isCollapsed(range) ||
    Path.hasPrevious(end.path)
  ) {
    return range
  }

  const endBlock = above(editor, {
    at: end,
    match: (n) => Element.isElement(n, editor.schema) && isBlock(editor, n),
    voids,
  })
  const blockPath = endBlock ? endBlock[1] : []
  const first = editorStart(editor, start)
  const before = {anchor: first, focus: end}
  let skip = true

  for (const [node, path] of nodes(editor, {
    at: before,
    match: (n) => Text.isText(n, editor.schema),
    reverse: true,
    voids,
  })) {
    if (skip) {
      skip = false
      continue
    }

    if (node.text !== '' || Path.isBefore(path, blockPath)) {
      end = {path, offset: node.text.length}
      break
    }
  }

  return {anchor: start, focus: end}
}
