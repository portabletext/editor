import {Transforms} from 'slate'
import {getEditorSelection} from '../editor/editor-selection'
import {editorSelectionToSlateRange} from '../editor/editor-selection-to-slate-range'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const selectOperationImplementation: BehaviorOperationImplementation<
  'select'
> = ({context, operation}) => {
  const indexedSelection = getEditorSelection({
    type: 'indexed',
    schema: context.schema,
    value: operation.editor.value,
    selection: operation.at,
  })
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
