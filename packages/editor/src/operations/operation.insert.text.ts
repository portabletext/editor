import {applySelect} from '../internal-utils/apply-selection'
import {Path, Range, Text} from '../slate'
import {elementReadOnly} from '../slate/editor/element-read-only'
import {getVoid} from '../slate/editor/get-void'
import {hasPath} from '../slate/editor/has-path'
import {getNode} from '../slate/node/get-node'
import type {OperationImplementation} from './operation.types'

export const insertTextOperationImplementation: OperationImplementation<
  'insert.text'
> = ({operation}) => {
  const {editor} = operation
  const {selection} = editor

  if (!selection || !Range.isCollapsed(selection)) {
    return
  }

  let {path, offset} = selection.anchor

  const node = getNode(editor, path, editor.schema)

  // If the selection is at an ObjectNode, move to the adjacent span.
  if (editor.isObjectNode(node)) {
    const nextPath = Path.next(path)

    if (hasPath(editor, nextPath)) {
      const nextNode = getNode(editor, nextPath, editor.schema)

      if (Text.isText(nextNode, editor.schema)) {
        path = nextPath
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
