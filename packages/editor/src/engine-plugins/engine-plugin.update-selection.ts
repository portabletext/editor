import type {EditorActor} from '../editor/editor-machine'
import type {PortableTextEditorEngine} from '../types/editor-engine'

export function updateSelectionPlugin({
  editor,
  editorActor,
}: {
  editor: PortableTextEditorEngine
  editorActor: EditorActor
}) {
  const updateSelection = () => {
    editorActor.send({
      type: 'update selection',
      selection: editor.selection,
    })
  }

  const {onChange} = editor

  editor.onChange = () => {
    onChange()

    if (!editorActor.getSnapshot().matches({setup: 'setting up'})) {
      updateSelection()
    }
  }

  return editor
}
