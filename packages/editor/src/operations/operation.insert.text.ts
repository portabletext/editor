import {applySelect} from '../internal-utils/apply-selection'
import {elementReadOnly} from '../slate/editor/element-read-only'
import {getVoid} from '../slate/editor/get-void'
import {hasPath} from '../slate/editor/has-path'
import {getNode} from '../slate/node/get-node'
import {nextPath} from '../slate/path/next-path'
import {isCollapsedRange} from '../slate/range/is-collapsed-range'
import {isText} from '../slate/text/is-text'
import type {OperationImplementation} from './operation.types'

export const insertTextOperationImplementation: OperationImplementation<
  'insert.text'
> = ({operation}) => {
  const {editor} = operation
  const {selection} = editor

  if (!selection || !isCollapsedRange(selection)) {
    return
  }

  let {path, offset} = selection.anchor

  const node = getNode(editor, path, editor.schema)

  // If the selection is at an ObjectNode, move to the adjacent span.
  if (editor.isObjectNode(node)) {
    const next = nextPath(path)

    if (hasPath(editor, next)) {
      const nextNode = getNode(editor, next, editor.schema)

      if (isText(nextNode, editor.schema)) {
        path = next
        offset = 0
        applySelect(editor, {path, offset})
      } else {
        return
      }
    } else {
      return
    }
  } else if (
    getVoid(editor, {at: selection}) ||
    elementReadOnly(editor, {at: selection})
  ) {
    return
  }

  if (operation.text.length > 0) {
    editor.apply({
      type: 'insert_text',
      path,
      offset,
      text: operation.text,
    })
  }
}
