import {Transforms} from 'slate'
import {createPlaceholderBlock} from '../internal-utils/create-placeholder-block'
import {toSlateRange} from '../internal-utils/ranges'
import {getBlockPath} from '../internal-utils/slate-utils'
import {getBlockKeyFromSelectionPoint} from '../selection/selection-point'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const deleteOperationImplementation: BehaviorOperationImplementation<
  'delete'
> = ({context, operation}) => {
  const anchorBlockKey = getBlockKeyFromSelectionPoint(operation.at.anchor)
  const focusBlockKey = getBlockKeyFromSelectionPoint(operation.at.focus)

  const anchorBlockPath =
    anchorBlockKey !== undefined
      ? getBlockPath({
          editor: operation.editor,
          _key: anchorBlockKey,
        })
      : undefined
  const focusBlockPath =
    focusBlockKey !== undefined
      ? getBlockPath({
          editor: operation.editor,
          _key: focusBlockKey,
        })
      : undefined

  if (
    operation.at.anchor.path.length === 1 &&
    operation.at.focus.path.length === 1 &&
    anchorBlockPath &&
    focusBlockPath &&
    anchorBlockPath[0] === focusBlockPath[0]
  ) {
    Transforms.removeNodes(operation.editor, {
      at: [anchorBlockPath[0]],
    })

    if (operation.editor.children.length === 0) {
      Transforms.insertNodes(operation.editor, createPlaceholderBlock(context))
    }

    return
  }

  const range = toSlateRange(operation.at, operation.editor)

  if (!range) {
    throw new Error(
      `Failed to get Slate Range for selection ${JSON.stringify(operation.at)}`,
    )
  }

  operation.editor.delete({
    at: range,
    reverse: operation.direction === 'backward',
    unit: operation.unit,
  })
}
