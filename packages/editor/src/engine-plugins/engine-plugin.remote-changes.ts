import type {ApplyContextFrame} from '../engine/core/apply-context'
import type {PortableTextEditorEngine} from '../types/editor-engine'

export function withRemoteChanges(
  editor: PortableTextEditorEngine,
  source: Extract<ApplyContextFrame, {kind: 'remote'}>['source'],
  fn: () => void,
): void {
  editor.applyContext.push(Object.freeze({kind: 'remote', source}))
  try {
    fn()
  } finally {
    editor.applyContext.pop()
  }
}
