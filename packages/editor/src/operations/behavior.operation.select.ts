import {Transforms} from 'slate'
import {getIndexedSelection} from '../editor/editor-selection'
import {editorSelectionToSlateRange} from '../editor/editor-selection-to-slate-range'
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
    ? editorSelectionToSlateRange(
        context.schema,
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
