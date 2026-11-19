import type {PortableTextEditorEngine} from '../types/editor-engine'

export function withRemoteChanges(
  editor: PortableTextEditorEngine,
  fn: () => void,
): void {
  editor.applyContext.push(Object.freeze({kind: 'remote'}))
  try {
    fn()
  } finally {
    editor.applyContext.pop()
  }
}
