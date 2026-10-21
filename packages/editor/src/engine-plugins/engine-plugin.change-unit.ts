import type {PortableTextEditorEngine} from '../types/editor-engine'

export function withChangeUnit(
  editor: PortableTextEditorEngine,
  fn: () => void,
): void {
  if (editor.withChangeUnit === undefined) {
    fn()
    return
  }

  editor.withChangeUnit(fn)
}
