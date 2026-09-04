import type {PortableTextEditorEngine} from '../types/editor-engine'

export function pluginRedoing(
  editor: PortableTextEditorEngine,
  fn: () => void,
) {
  const prev = editor.isRedoing

  editor.isRedoing = true
  editor.applyContext.push(Object.freeze({kind: 'redo'}))

  try {
    fn()
  } finally {
    editor.applyContext.pop()
    editor.isRedoing = prev
  }
}
