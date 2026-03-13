import type {Location} from '../interfaces'
import {Editor} from '../interfaces/editor'
import {Range} from '../interfaces/range'
import {Scrubber} from '../interfaces/scrubber'

export function select(editor: Editor, target: Location): void {
  const {selection} = editor
  target = Editor.range(editor, target)

  if (selection) {
    editor.setSelection(target)
    return
  }

  if (!Range.isRange(target)) {
    throw new Error(
      `When setting the selection and the current selection is \`null\` you must provide at least an \`anchor\` and \`focus\`, but you passed: ${Scrubber.stringify(
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
