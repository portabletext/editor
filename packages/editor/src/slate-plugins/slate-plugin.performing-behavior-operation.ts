import type {PortableTextSlateEditor} from '../types/slate-editor'

export function withPerformingBehaviorOperation(
  editor: PortableTextSlateEditor,
  fn: () => void,
) {
  const prev = editor.isPerformingBehaviorOperation

  editor.isPerformingBehaviorOperation = true

  fn()

  editor.isPerformingBehaviorOperation = prev
}
