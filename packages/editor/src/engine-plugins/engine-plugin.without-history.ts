import type {PortableTextEditorEngine} from '../types/editor-engine'

export function pluginWithoutHistory(
  editor: PortableTextEditorEngine,
  fn: () => void,
): void {
  const prev = editor.withHistory

  editor.withHistory = false

  try {
    fn()
  } finally {
    editor.withHistory = prev
  }
}
