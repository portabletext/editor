import {elementReadOnly} from '../editor/element-read-only'
import {getObjectNode} from '../editor/get-object-node'
import {pointRef} from '../editor/point-ref'
import {range as editorRange} from '../editor/range'
import {withoutNormalizing} from '../editor/without-normalizing'
import type {Editor} from '../interfaces/editor'
import type {Location} from '../interfaces/location'
import {isPath} from '../path/is-path'
import {isCollapsedRange} from '../range/is-collapsed-range'
import {isRange} from '../range/is-range'
import {rangeEnd} from '../range/range-end'
import {rangeStart} from '../range/range-start'
import {getDefaultInsertLocation} from '../utils/get-default-insert-location'
import {deleteText} from './delete-text'

interface TextInsertTextOptions {
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

    if (isPath(at)) {
      at = editorRange(editor, at)
    }

    if (isRange(at)) {
      if (isCollapsedRange(at)) {
        at = at.anchor
      } else {
        const end = rangeEnd(at)
        if (!voids && getObjectNode(editor, {at: end})) {
          return
        }
        const start = rangeStart(at)
        const startRef = pointRef(editor, start)
        const endRef = pointRef(editor, end)
        deleteText(editor, {at, voids})
        const startPoint = startRef.unref()
        const endPoint = endRef.unref()

        at = startPoint || endPoint!
        editor.setSelection({anchor: at, focus: at})
      }
    }

    if (
      (!voids && getObjectNode(editor, {at})) ||
      elementReadOnly(editor, {at})
    ) {
      return
    }

    const {path, offset} = at
    if (text.length > 0) {
      editor.apply({type: 'insert_text', path, offset, text})
    }
  })
}
