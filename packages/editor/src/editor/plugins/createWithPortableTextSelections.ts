import {debugWithName} from '../../internal-utils/debug'
import {slateRangeToSelection} from '../../internal-utils/slate-utils'
import {SLATE_TO_PORTABLE_TEXT_RANGE} from '../../internal-utils/weakMaps'
import type {EditorSelection, PortableTextSlateEditor} from '../../types/editor'
import type {EditorActor} from '../editor-machine'

const debug = debugWithName('plugin:withPortableTextSelections')
const debugVerbose = debug.enabled && false

// This plugin will make sure that we emit a PT selection whenever the editor has changed.
export function createWithPortableTextSelections(
  editorActor: EditorActor,
): (editor: PortableTextSlateEditor) => PortableTextSlateEditor {
  return function withPortableTextSelections(
    editor: PortableTextSlateEditor,
  ): PortableTextSlateEditor {
    const emitPortableTextSelection = () => {
      let ptRange: EditorSelection | null = null

      if (editor.selection) {
        const existing = SLATE_TO_PORTABLE_TEXT_RANGE.get(editor.selection)
        if (existing) {
          ptRange = existing
        } else {
          ptRange = slateRangeToSelection({
            schema: editorActor.getSnapshot().context.schema,
            editor,
            range: editor.selection,
          })
          SLATE_TO_PORTABLE_TEXT_RANGE.set(editor.selection, ptRange)
        }
      }

      if (debugVerbose) {
        debug(
          `Emitting selection ${JSON.stringify(ptRange || null)} (${JSON.stringify(
            editor.selection,
          )})`,
        )
      }

      if (ptRange) {
        editorActor.send({type: 'update selection', selection: ptRange})
      } else {
        editorActor.send({type: 'update selection', selection: null})
      }
    }

    const {onChange} = editor
    editor.onChange = () => {
      onChange()
      if (!editorActor.getSnapshot().matches({setup: 'setting up'})) {
        emitPortableTextSelection()
      }
    }
    return editor
  }
}
