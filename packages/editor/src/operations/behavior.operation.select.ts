import {Transforms} from 'slate'
import {
  getIndexedSelection,
  indexedSelectionToSlateRange,
} from '../editor/indexed-selection'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const selectOperationImplementation: BehaviorOperationImplementation<
  'select'
> = ({context, operation}) => {
  const indexedSelection = getIndexedSelection(
    context.schema,
    operation.editor.value,
    operation.at,
  )
  const newSelection = indexedSelection
    ? indexedSelectionToSlateRange(
        context.schema,
        operation.editor.value,
        indexedSelection,
        operation.editor,
      )
    : null

  if (newSelection) {
    Transforms.select(operation.editor, newSelection)
  } else {
    Transforms.deselect(operation.editor)
  }
}
