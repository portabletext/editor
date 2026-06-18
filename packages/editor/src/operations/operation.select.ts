import {
  applyDeselect,
  applySelect,
  resolveSelection,
} from '../internal-utils/apply-selection'
import type {OperationImplementation} from './operation.types'

export const selectOperationImplementation: OperationImplementation<
  'select'
> = ({operation}) => {
  const newSelection = resolveSelection(operation.editor, operation.at, {
    selectContainerAsBlockObject: operation.selectContainerAsBlockObject,
  })

  if (newSelection) {
    applySelect(operation.editor, newSelection)
  } else {
    applyDeselect(operation.editor)
  }

  if (operation.editor.focused && operation.editor.snapshot.context.readOnly) {
    operation.editor.focused = false
  }
}
