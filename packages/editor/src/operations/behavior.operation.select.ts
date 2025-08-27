import {Transforms} from 'slate'
import {IS_FOCUSED, IS_READ_ONLY} from 'slate-dom'
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

  if (IS_FOCUSED.get(operation.editor) && IS_READ_ONLY.get(operation.editor)) {
    IS_FOCUSED.set(operation.editor, false)
  }
}
