import {toSlateRange} from '../internal-utils/to-slate-range'
import {Transforms} from '../slate'
import {IS_FOCUSED, IS_READ_ONLY} from '../slate-dom'
import type {OperationImplementation} from './operation.types'

export const selectOperationImplementation: OperationImplementation<
  'select'
> = ({context, operation}) => {
  const newSelection = toSlateRange({
    context: {
      schema: context.schema,
      value: operation.editor.children,
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
