import type {PortableTextEditorEngine} from '../types/editor-engine'

export function pluginUndoing(
  editor: PortableTextEditorEngine,
  fn: () => void,
) {
  const prev = editor.isUndoing

  editor.isUndoing = true
  editor.applyContext.push(Object.freeze({kind: 'undo'}))

  try {
    fn()
  } finally {
    editor.applyContext.pop()
    editor.isUndoing = prev
  }
}
