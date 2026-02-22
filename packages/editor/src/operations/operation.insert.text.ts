import {Transforms} from 'slate'
import {toSlateRange} from '../internal-utils/to-slate-range'
import type {OperationImplementation} from './operation.types'

export const insertTextOperationImplementation: OperationImplementation<
  'insert.text'
> = ({context, operation}) => {
  const at = operation.at
    ? toSlateRange({
        context: {
          schema: context.schema,
          value: operation.editor.value,
          selection: operation.at,
        },
        blockIndexMap: operation.editor.blockIndexMap,
      })
    : undefined

  if (at) {
    Transforms.insertText(operation.editor, operation.text, {at})
  } else {
    Transforms.insertText(operation.editor, operation.text)
  }
}
