import {getAncestorObjectNode} from '../../node-traversal/get-ancestor-object-node'
import {getNode} from '../../node-traversal/get-node'
import {path as editorPath} from '../editor/path'
import {pointRef} from '../editor/point-ref'
import {range as editorRange} from '../editor/range'
import {withoutNormalizing} from '../editor/without-normalizing'
import type {Editor} from '../interfaces/editor'
import type {Location} from '../interfaces/location'
import {isVoidNode} from '../node/is-void-node'
import {isPath} from '../path/is-path'
import {isCollapsedRange} from '../range/is-collapsed-range'
import {isRange} from '../range/is-range'
import {rangeEnd} from '../range/range-end'
import {rangeStart} from '../range/range-start'
import {getDefaultInsertLocation} from '../utils/get-default-insert-location'
import {deleteText} from './delete-text'

interface TextInsertTextOptions {
  at?: Location
  includeObjectNodes?: boolean
}

export function insertText(
  editor: Editor,
  text: string,
  options: TextInsertTextOptions = {},
): void {
  withoutNormalizing(editor, () => {
    const {includeObjectNodes = false} = options
    let {at = getDefaultInsertLocation(editor)} = options

    if (isPath(at)) {
      at = editorRange(editor, at)
    }

    if (isRange(at)) {
      if (isCollapsedRange(at)) {
        at = at.anchor
      } else {
        const end = rangeEnd(at)
        if (!includeObjectNodes) {
          const endPath = editorPath(editor, end)
          const endEntry = getNode(editor, endPath)
          const endObjectNode =
            endEntry && isVoidNode(editor, endEntry.node, endPath)
              ? endEntry
              : getAncestorObjectNode(editor, end.path)
          if (endObjectNode) {
            return
          }
        }
        const start = rangeStart(at)
        const startRef = pointRef(editor, start)
        const endRef = pointRef(editor, end)
        deleteText(editor, {at, includeObjectNodes})
        const startPoint = startRef.unref()
        const endPoint = endRef.unref()

        at = startPoint || endPoint!
        editor.setSelection({anchor: at, focus: at})
      }
    }

    if (!includeObjectNodes) {
      const atPath = editorPath(editor, at)
      const atEntry = getNode(editor, atPath)
      const atObjectNode =
        atEntry && isVoidNode(editor, atEntry.node, atPath)
          ? atEntry
          : getAncestorObjectNode(editor, at.path)
      if (atObjectNode) {
        return
      }
    }
    const {path, offset} = at
    if (text.length > 0) {
      editor.apply({type: 'insert_text', path, offset, text})
    }
  })
}
