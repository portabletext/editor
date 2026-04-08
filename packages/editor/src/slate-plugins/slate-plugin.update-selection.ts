import type {EditorActor} from '../editor/editor-machine'
import type {PortableTextSlateEditor} from '../types/slate-editor'

export function updateSelectionPlugin({
  editor,
  editorActor,
}: {
  editor: PortableTextSlateEditor
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
