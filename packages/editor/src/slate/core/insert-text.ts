import {elementReadOnly} from '../editor/element-read-only'
import {getVoid} from '../editor/get-void'
import {pointRef} from '../editor/point-ref'
import {range as editorRange} from '../editor/range'
import {withoutNormalizing} from '../editor/without-normalizing'
import type {Location} from '../index'
import type {Editor} from '../interfaces/editor'
import {Path} from '../interfaces/path'
import {Range} from '../interfaces/range'
import {getDefaultInsertLocation} from '../utils'
import {deleteText} from './delete-text'
import {setSelection} from './set-selection'

export interface TextInsertTextOptions {
  at?: Location
  voids?: boolean
}

export function insertText(
  editor: Editor,
  text: string,
  options: TextInsertTextOptions = {},
): void {
  withoutNormalizing(editor, () => {
    const {voids = false} = options
    let {at = getDefaultInsertLocation(editor)} = options

    if (Path.isPath(at)) {
      at = editorRange(editor, at)
    }

    if (Range.isRange(at)) {
      if (Range.isCollapsed(at)) {
        at = at.anchor
      } else {
        const end = Range.end(at)
        if (!voids && getVoid(editor, {at: end})) {
          return
        }
        const start = Range.start(at)
        const startRef = pointRef(editor, start)
        const endRef = pointRef(editor, end)
        deleteText(editor, {at, voids})
        const startPoint = startRef.unref()
        const endPoint = endRef.unref()

        at = startPoint || endPoint!
        setSelection(editor, {anchor: at, focus: at})
      }
    }

    if ((!voids && getVoid(editor, {at})) || elementReadOnly(editor, {at})) {
      return
    }

    const {path, offset} = at
    if (text.length > 0) {
      editor.apply({type: 'insert_text', path, offset, text})
    }
  })
}
