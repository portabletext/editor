import type {Editor} from '../interfaces/editor'

export function deselect(editor: Editor): void {
  const {selection} = editor

  if (selection) {
    editor.apply({
      type: 'set_selection',
      properties: selection,
      newProperties: null,
    })
  }
}
