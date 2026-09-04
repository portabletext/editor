import type {PortableTextEditorEngine} from '../types/editor-engine'

export function pluginRedoing(
  editor: PortableTextEditorEngine,
  fn: () => void,
) {
  editor.applyContext.push(Object.freeze({kind: 'redo'}))

  try {
    fn()
  } finally {
    editor.applyContext.pop()
  }
}
