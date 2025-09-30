import {slateRangeToSelection} from '../../internal-utils/slate-utils'
import type {PortableTextSlateEditor} from '../../types/editor'
import type {EditorActor} from '../editor-machine'
import {SLATE_TO_PORTABLE_TEXT_RANGE} from '../weakMaps'

export function pluginUpdateSelection({
  editor,
  editorActor,
}: {
  editor: PortableTextSlateEditor
  editorActor: EditorActor
}) {
  const updateSelection = () => {
    if (editor.selection) {
      const existingSelection = SLATE_TO_PORTABLE_TEXT_RANGE.get(
        editor.selection,
      )

      if (existingSelection) {
        editorActor.send({
          type: 'update selection',
          selection: existingSelection,
        })
      } else {
        const selection = slateRangeToSelection({
          schema: editorActor.getSnapshot().context.schema,
          editor,
          range: editor.selection,
        })

        SLATE_TO_PORTABLE_TEXT_RANGE.set(editor.selection, selection)

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
