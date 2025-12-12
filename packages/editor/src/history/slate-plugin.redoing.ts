import type {PortableTextSlateEditor} from '../types/slate-editor'

export function pluginRedoing(editor: PortableTextSlateEditor, fn: () => void) {
  const prev = editor.isRedoing

  editor.isRedoing = true

  fn()

  editor.isRedoing = prev
}
