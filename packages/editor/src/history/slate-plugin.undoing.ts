import type {PortableTextSlateEditor} from '../types/slate-editor'

export function pluginUndoing(editor: PortableTextSlateEditor, fn: () => void) {
  const prev = editor.isUndoing

  editor.isUndoing = true

  fn()

  editor.isUndoing = prev
}
