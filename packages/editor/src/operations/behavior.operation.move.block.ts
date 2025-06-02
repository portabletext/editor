import {Transforms} from 'slate'
import {editorSelectionToSlateRange} from '../editor/editor-selection-to-slate-range'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const moveBlockOperationImplementation: BehaviorOperationImplementation<
  'move.block'
> = ({context, operation}) => {
  const sourceBlockIndex = editorSelectionToSlateRange(
    context.schema,
    {
      anchor: {
        path: operation.at,
        offset: 0,
      },
      focus: {
        path: operation.at,
        offset: 0,
      },
    },
    operation.editor,
  )?.focus.path?.at(0)

  if (sourceBlockIndex === undefined) {
    throw new Error(`Unable to convert ${operation.at} to a Slate Range`)
  }

  const targetBlockIndex = editorSelectionToSlateRange(
    context.schema,
    {
      anchor: {
        path: operation.to,
        offset: 0,
      },
      focus: {
        path: operation.to,
        offset: 0,
      },
    },
    operation.editor,
  )?.focus.path?.at(0)

  if (targetBlockIndex === undefined) {
    throw new Error(`Unable to convert ${operation.to} to a Slate Range`)
  }

  Transforms.moveNodes(operation.editor, {
    at: [sourceBlockIndex],
    to: [targetBlockIndex],
    mode: 'highest',
  })
}
