import type {PortableTextEditorEngine} from '../types/editor-engine'

export function pluginRedoing(
  editor: PortableTextEditorEngine,
  fn: () => void,
) {
  const prev = editor.isRedoing

  editor.isRedoing = true

  fn()

  editor.isRedoing = prev
}
