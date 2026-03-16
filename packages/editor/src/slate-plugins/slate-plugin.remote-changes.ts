import type {PortableTextSlateEditor} from '../types/slate-editor'

export function withRemoteChanges(
  editor: PortableTextSlateEditor,
  fn: () => void,
): void {
  const prev = editor.isProcessingRemoteChanges
  editor.isProcessingRemoteChanges = true
  fn()
  editor.isProcessingRemoteChanges = prev
}
