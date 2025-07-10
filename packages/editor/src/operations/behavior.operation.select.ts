import {Transforms} from 'slate'
import {toSlateRange} from '../internal-utils/to-slate-range'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const selectOperationImplementation: BehaviorOperationImplementation<
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
}
