import type {PortableTextEditorEngine} from '../types/editor-engine'

export function pluginRedoing(
  editor: PortableTextEditorEngine,
  fn: () => void,
) {
  const prev = editor.isRedoing

  editor.isRedoing = true

  try {
    fn()
  } finally {
    editor.isRedoing = prev
  }
}
