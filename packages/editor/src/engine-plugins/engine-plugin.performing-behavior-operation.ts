import type {PortableTextEditorEngine} from '../types/editor-engine'

export function withPerformingBehaviorOperation(
  editor: PortableTextEditorEngine,
  fn: () => void,
) {
  const prev = editor.isPerformingBehaviorOperation

  editor.isPerformingBehaviorOperation = true

  fn()

  editor.isPerformingBehaviorOperation = prev
}
