import type {Editor} from '../interfaces/editor'

export function deselect(editor: Editor): void {
  const selection = editor.snapshot.context.selection

  if (selection) {
    editor.apply({
      type: 'set.selection',
      properties: selection,
      newProperties: null,
    })
  }
}
