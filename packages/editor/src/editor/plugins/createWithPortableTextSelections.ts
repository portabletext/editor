import type {BaseRange} from 'slate'
import type {
  EditorSelection,
  PortableTextMemberSchemaTypes,
  PortableTextSlateEditor,
} from '../../types/editor'
import {debugWithName} from '../../utils/debug'
import {
  toPortableTextRange,
  type ObjectWithKeyAndType,
} from '../../utils/ranges'
import {SLATE_TO_PORTABLE_TEXT_RANGE} from '../../utils/weakMaps'
import type {EditorActor} from '../editor-machine'

const debug = debugWithName('plugin:withPortableTextSelections')
const debugVerbose = debug.enabled && false

// This plugin will make sure that we emit a PT selection whenever the editor has changed.
export function createWithPortableTextSelections(
  editorActor: EditorActor,
  types: PortableTextMemberSchemaTypes,
): (editor: PortableTextSlateEditor) => PortableTextSlateEditor {
  let prevSelection: BaseRange | null = null
  return function withPortableTextSelections(
    editor: PortableTextSlateEditor,
  ): PortableTextSlateEditor {
    const emitPortableTextSelection = () => {
      if (prevSelection !== editor.selection) {
        let ptRange: EditorSelection = null
        if (editor.selection) {
          const existing = SLATE_TO_PORTABLE_TEXT_RANGE.get(editor.selection)
          if (existing) {
            ptRange = existing
          } else {
            const value = editor.children satisfies ObjectWithKeyAndType[]
            ptRange = toPortableTextRange(value, editor.selection, types)
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
          editorActor.send({type: 'selection', selection: ptRange})
        } else {
          editorActor.send({type: 'selection', selection: null})
        }
      }
      prevSelection = editor.selection
    }

    const {onChange} = editor
    editor.onChange = () => {
      const hasChanges = editor.operations.length > 0
      onChange()
      if (hasChanges) {
        emitPortableTextSelection()
      }
    }
    return editor
  }
}
