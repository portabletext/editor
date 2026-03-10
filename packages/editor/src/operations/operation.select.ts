import type {PortableTextBlock} from '@portabletext/schema'
import {applyDeselect, applySelect} from '../internal-utils/apply-selection'
import {toSlateRange} from '../internal-utils/to-slate-range'
import type {OperationImplementation} from './operation.types'

export const selectOperationImplementation: OperationImplementation<
  'select'
> = ({context, operation}) => {
  const newSelection = toSlateRange({
    context: {
      schema: context.schema,
      value: operation.editor.children as Array<PortableTextBlock>,
      selection: operation.at,
    },
  })

  if (newSelection) {
    applySelect(operation.editor, newSelection)
  } else {
    applyDeselect(operation.editor)
  }

  if (operation.editor.focused && operation.editor.readOnly) {
    operation.editor.focused = false
  }
}
