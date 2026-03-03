import {Editor, type EditorInterface} from '../interfaces/editor'
import {Node} from '../interfaces/node'

export const getVoid: EditorInterface['void'] = (editor, options = {}) => {
  const {at = editor.selection} = options
  if (!at) {
    return
  }

  const path = Editor.path(editor, at)
  const node = Node.get(editor, path, editor.schema)

  if (editor.isObjectNode(node)) {
    return [node, path] as any
  }

  return Editor.above(editor, {
    ...options,
    match: (n) => editor.isObjectNode(n),
  })
}
