import {safeStringify} from '../../internal-utils/safe-json'
import {range as editorRange} from '../editor/range'
import type {Editor} from '../interfaces/editor'
import type {Location} from '../interfaces/location'
import {isRange} from '../range/is-range'

export function select(editor: Editor, target: Location): void {
  const {selection} = editor
  target = editorRange(editor, target)

  if (selection) {
    editor.setSelection(target)
    return
  }

  if (!isRange(target)) {
    throw new Error(
      `When setting the selection and the current selection is \`null\` you must provide at least an \`anchor\` and \`focus\`, but you passed: ${safeStringify(
        target,
      )}`,
    )
  }

  editor.apply({
    type: 'set_selection',
    properties: selection,
    newProperties: target,
  })
}
