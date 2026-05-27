import type {PortableTextEditorEngine} from '../types/editor-engine'

export function pluginUndoing(
  editor: PortableTextEditorEngine,
  fn: () => void,
) {
  const prev = editor.isUndoing

  editor.isUndoing = true

  fn()

  editor.isUndoing = prev
}
