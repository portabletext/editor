import {applyDeselect, applySelect} from '../internal-utils/apply-selection'
import {editorToSlateRange} from '../internal-utils/to-slate-range'
import type {OperationImplementation} from './operation.types'

export const selectOperationImplementation: OperationImplementation<
  'select'
> = ({operation}) => {
  const newSelection = editorToSlateRange(operation.editor, operation.at)

  if (newSelection) {
    applySelect(operation.editor, newSelection)
  } else {
    applyDeselect(operation.editor)
  }

  if (operation.editor.focused && operation.editor.readOnly) {
    operation.editor.focused = false
  }
}
