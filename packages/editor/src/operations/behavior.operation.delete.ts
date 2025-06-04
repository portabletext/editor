import {Transforms} from 'slate'
import {toSlateRange} from '../internal-utils/ranges'
import {getBlockPath} from '../internal-utils/slate-utils'
import {getBlockKeyFromSelectionPoint} from '../selection/selection-point'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const deleteOperationImplementation: BehaviorOperationImplementation<
  'delete'
> = ({operation}) => {
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
