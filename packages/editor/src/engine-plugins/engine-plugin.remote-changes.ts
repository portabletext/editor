import type {PortableTextEditorEngine} from '../types/editor-engine'

export function withRemoteChanges(
  editor: PortableTextEditorEngine,
  fn: () => void,
): void {
  const prev = editor.isProcessingRemoteChanges
  editor.isProcessingRemoteChanges = true
  fn()
  editor.isProcessingRemoteChanges = prev
}
