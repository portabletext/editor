import {Editor} from '../interfaces/editor'
import {Path} from '../interfaces/path'
import {Range} from '../interfaces/range'
import type {TextTransforms} from '../interfaces/transforms/text'
import {getDefaultInsertLocation} from '../utils'

export const insertTextTransform: TextTransforms['insertText'] = (
  editor,
  text,
  options = {},
) => {
  Editor.withoutNormalizing(editor, () => {
    const {voids = false} = options
    let {at = getDefaultInsertLocation(editor)} = options

    if (Path.isPath(at)) {
      at = Editor.range(editor, at)
    }

    if (Range.isRange(at)) {
      if (Range.isCollapsed(at)) {
        at = at.anchor
      } else {
        const end = Range.end(at)
        if (!voids && Editor.void(editor, {at: end})) {
          return
        }
        const start = Range.start(at)
        const startRef = Editor.pointRef(editor, start)
        const endRef = Editor.pointRef(editor, end)
        editor.delete({at, voids})
        const startPoint = startRef.unref()
        const endPoint = endRef.unref()

        at = startPoint || endPoint!
        editor.setSelection({anchor: at, focus: at})
      }
    }

    if (
      (!voids && Editor.void(editor, {at})) ||
      Editor.elementReadOnly(editor, {at})
    ) {
      return
    }

    const {path, offset} = at
    if (text.length > 0) {
      editor.apply({type: 'insert_text', path, offset, text})
    }
  })
}
