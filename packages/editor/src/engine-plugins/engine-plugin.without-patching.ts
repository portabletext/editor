import type {PortableTextEditorEngine} from '../types/editor-engine'

export function withoutPatching(
  editor: PortableTextEditorEngine,
  fn: () => void,
): void {
  const prev = editor.isPatching
  editor.isPatching = false
  fn()
  editor.isPatching = prev
}
