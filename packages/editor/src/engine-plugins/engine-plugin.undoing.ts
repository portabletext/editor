import type {PortableTextEditorEngine} from '../types/editor-engine'

export function pluginUndoing(
  editor: PortableTextEditorEngine,
  fn: () => void,
) {
  editor.applyContext.push(Object.freeze({kind: 'undo'}))

  try {
    fn()
  } finally {
    editor.applyContext.pop()
  }
}
