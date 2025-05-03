import {Transforms} from 'slate'
import {toSlateRange} from '../internal-utils/ranges'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const deleteBlockOperationImplementation: BehaviorOperationImplementation<
  'delete.block'
> = ({operation}) => {
  const range = toSlateRange(
    {
      anchor: {path: operation.at, offset: 0},
      focus: {path: operation.at, offset: 0},
    },
    operation.editor,
  )

  if (!range) {
    console.error('Unable to find Slate range from selection points')
    return
  }

  Transforms.removeNodes(operation.editor, {
    at: range,
  })
}
