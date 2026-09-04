import type {ApplyContextFrame} from '../engine/core/apply-context'
import type {PortableTextEditorEngine} from '../types/editor-engine'

export function withRemoteChanges(
  editor: PortableTextEditorEngine,
  source: Extract<ApplyContextFrame, {kind: 'remote'}>['source'],
  fn: () => void,
): void {
  const prev = editor.isProcessingRemoteChanges
  editor.isProcessingRemoteChanges = true
  editor.applyContext.push(Object.freeze({kind: 'remote', source}))
  try {
    fn()
  } finally {
    editor.applyContext.pop()
    editor.isProcessingRemoteChanges = prev
  }
}
