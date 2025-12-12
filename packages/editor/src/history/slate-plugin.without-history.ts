import type {PortableTextSlateEditor} from '../types/slate-editor'

export function pluginWithoutHistory(
  editor: PortableTextSlateEditor,
  fn: () => void,
): void {
  const prev = editor.withHistory

  editor.withHistory = false

  fn()

  editor.withHistory = prev
}
