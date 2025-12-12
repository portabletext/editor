import {slateRangeToSelection} from '../internal-utils/slate-utils'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import type {EditorActor} from './editor-machine'

export function pluginUpdateSelection({
  editor,
  editorActor,
}: {
  editor: PortableTextSlateEditor
  editorActor: EditorActor
}) {
  const updateSelection = () => {
    if (editor.selection) {
      if (editor.selection === editor.lastSlateSelection) {
        editorActor.send({
          type: 'update selection',
          selection: editor.lastSelection,
        })
      } else {
        const selection = slateRangeToSelection({
          schema: editorActor.getSnapshot().context.schema,
          editor,
          range: editor.selection,
        })

        editor.lastSlateSelection = editor.selection
        editor.lastSelection = selection

        editorActor.send({type: 'update selection', selection})
      }
    } else {
      editorActor.send({type: 'update selection', selection: null})
    }
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
