import {
  applyDeselect,
  applySelect,
  resolveSelection,
} from '../internal-utils/apply-selection'
import type {OperationImplementation} from './operation.types'

export const selectOperationImplementation: OperationImplementation<
  'select'
> = ({operation}) => {
  const newSelection = resolveSelection(operation.editor, operation.at)

  if (newSelection) {
    applySelect(operation.editor, newSelection)
  } else {
    applyDeselect(operation.editor)
  }

  if (operation.editor.focused && operation.editor.readOnly) {
    operation.editor.focused = false
  }
}
