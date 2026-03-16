import {isSpan} from '@portabletext/schema'
import type {Editor} from '../interfaces/editor'
import type {Location} from '../interfaces/location'
import {pathEquals} from '../path/path-equals'
import {rangeEdges} from '../range/range-edges'
import {nodes} from './nodes'
import {range} from './range'

export function string(
  editor: Editor,
  at: Location,
  options: {voids?: boolean} = {},
): string {
  const {voids = false} = options
  const editorRange = range(editor, at)
  const [start, end] = rangeEdges(editorRange)
  let text = ''

  for (const [node, path] of nodes(editor, {
    at: editorRange,
    match: (n) => isSpan({schema: editor.schema}, n),
    voids,
  })) {
    let t = node.text

    if (pathEquals(path, end.path)) {
      t = t.slice(0, end.offset)
    }

    if (pathEquals(path, start.path)) {
      t = t.slice(start.offset)
    }

    text += t
  }

  return text
}
