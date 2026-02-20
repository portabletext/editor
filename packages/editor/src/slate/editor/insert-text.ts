import type {EditorInterface} from '../interfaces/editor'
import {Text} from '../interfaces/text'
import {Transforms} from '../interfaces/transforms'

export const insertText: EditorInterface['insertText'] = (
  editor,
  text,
  options = {},
) => {
  const {selection, marks} = editor

  if (selection) {
    if (marks) {
      const node = {text, ...marks}

      // Ensure the node is a valid Text node. When marks is {} (e.g.,
      // cursor on a void element), the spread produces {text} without
      // _type or marks, which Node.isNode won't recognize.
      if (!Text.isText(node)) {
        const record = node as Record<string, unknown>
        if (typeof record['_type'] !== 'string') {
          record['_type'] = editor.createTextNode()._type
        }
        if (!Array.isArray(record['marks'])) {
          record['marks'] = []
        }
      }

      Transforms.insertNodes(editor, node, {
        at: options.at,
        voids: options.voids,
      })
    } else {
      Transforms.insertText(editor, text, options)
    }

    editor.marks = null
  }
}
