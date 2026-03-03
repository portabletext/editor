import {applySelect} from '../internal-utils/apply-selection'
import {Editor, Node, Path, Range, Text} from '../slate'
import type {OperationImplementation} from './operation.types'

export const insertTextOperationImplementation: OperationImplementation<
  'insert.text'
> = ({operation}) => {
  const {editor} = operation
  const {selection} = editor

  if (!selection || !Range.isCollapsed(selection)) {
    return
  }

  if (
    Editor.void(editor, {at: selection}) ||
    Editor.elementReadOnly(editor, {at: selection})
  ) {
    return
  }

  let {path, offset} = selection.anchor

  const node = Node.get(editor, path, editor.schema)

  // If the selection is at an ObjectNode, move to the adjacent span.
  if (editor.isObjectNode(node)) {
    const nextPath = Path.next(path)

    if (Editor.hasPath(editor, nextPath)) {
      const nextNode = Node.get(editor, nextPath, editor.schema)

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
