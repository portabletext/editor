import {toSlateRange} from '../internal-utils/to-slate-range'
import {Transforms} from '../slate'
import type {OperationImplementation} from './operation.types'

export const selectOperationImplementation: OperationImplementation<
  'select'
> = ({context, operation}) => {
  const newSelection = toSlateRange({
    context: {
      schema: context.schema,
      value: operation.editor.value,
      selection: operation.at,
    },
    blockIndexMap: operation.editor.blockIndexMap,
  })

  if (newSelection) {
    Transforms.select(operation.editor, newSelection)
  } else {
    Transforms.deselect(operation.editor)
  }

  if (operation.editor.focused && operation.editor.readOnly) {
    operation.editor.focused = false
  }
}
