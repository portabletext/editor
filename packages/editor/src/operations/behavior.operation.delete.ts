import {Transforms} from 'slate'
import {createPlaceholderBlock} from '../internal-utils/create-placeholder-block'
import {isTextBlock} from '../internal-utils/parse-blocks'
import {getBlockPath} from '../internal-utils/slate-utils'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {getBlockKeyFromSelectionPoint} from '../selection/selection-point'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const deleteOperationImplementation: BehaviorOperationImplementation<
  'delete'
> = ({context, operation}) => {
  const anchorBlockKey = getBlockKeyFromSelectionPoint(operation.at.anchor)
  const focusBlockKey = getBlockKeyFromSelectionPoint(operation.at.focus)
  const endBlockKey = operation.at.backward ? anchorBlockKey : focusBlockKey
  const endOffset = operation.at.backward
    ? operation.at.focus.offset
    : operation.at.anchor.offset

  if (!endBlockKey) {
    throw new Error('Failed to get end block key')
  }

  const endBlockIndex = operation.editor.blockIndexMap.get(endBlockKey)

  if (endBlockIndex === undefined) {
    throw new Error('Failed to get end block index')
  }

  const endBlock = operation.editor.value.at(endBlockIndex)

  if (!endBlock) {
    throw new Error('Failed to get end block')
  }

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

  const range = toSlateRange({
    context: {
      schema: context.schema,
      value: operation.editor.value,
      selection: operation.at,
    },
    blockIndexMap: operation.editor.blockIndexMap,
  })

  if (!range) {
    throw new Error(
      `Failed to get Slate Range for selection ${JSON.stringify(operation.at)}`,
    )
  }

  const hanging = isTextBlock(context, endBlock) && endOffset === 0

  operation.editor.delete({
    at: range,
    reverse: operation.direction === 'backward',
    unit: operation.unit,
    hanging,
  })
}
