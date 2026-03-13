import type {Location} from '../interfaces'
import type {Editor} from '../interfaces/editor'
import {Path} from '../interfaces/path'
import {Range} from '../interfaces/range'
import {Text} from '../interfaces/text'
import {nodes} from './nodes'
import {range} from './range'

export function string(
  editor: Editor,
  at: Location,
  options: {voids?: boolean} = {},
): string {
  const {voids = false} = options
  const editorRange = range(editor, at)
  const [start, end] = Range.edges(editorRange)
  let text = ''

  for (const [node, path] of nodes(editor, {
    at: editorRange,
    match: (n) => Text.isText(n, editor.schema),
    voids,
  })) {
    let t = node.text

    if (Path.equals(path, end.path)) {
      t = t.slice(0, end.offset)
    }

    if (Path.equals(path, start.path)) {
      t = t.slice(start.offset)
    }

    text += t
  }

  return text
}
