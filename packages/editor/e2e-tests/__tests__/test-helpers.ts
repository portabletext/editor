import {getTextSelection} from '../../gherkin-spec/gherkin-step-helpers'
import type {Editor} from '../setup/globals.jest'

function selectEditorText(editor: Editor, text: string) {
  return editor
    .getValue()
    .then((value) => getTextSelection(value, text))
    .then(editor.setSelection)
}

export function selectBeforeEditorText(editor: Editor, text: string) {
  return selectEditorText(editor, text).then(() => editor.pressKey('ArrowLeft'))
}

export function selectAfterEditorText(editor: Editor, text: string) {
  return selectEditorText(editor, text).then(() =>
    editor.pressKey('ArrowRight'),
  )
}
