import {Transforms, type Range} from 'slate'
import {getKeyedSelection, isIndexedSelection} from '../editor/editor-selection'
import {editorSelectionToSlateRange} from '../editor/editor-selection-to-slate-range'
import {getBlockPath} from '../internal-utils/slate-utils'
import {fromSlateValue} from '../internal-utils/values'
import {isKeyedSegment} from '../utils'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const deleteOperationImplementation: BehaviorOperationImplementation<
  'delete'
> = ({context, operation}) => {
  let anchorBlockKey: string | undefined
  let focusBlockKey: string | undefined

  if (isIndexedSelection(operation.at)) {
    const anchorBlockIndex = operation.at.anchor.path.at(0)
    anchorBlockKey =
      anchorBlockIndex !== undefined
        ? operation.editor.children.at(anchorBlockIndex)?._key
        : undefined

    const focusBlockIndex = operation.at.focus.path.at(0)
    focusBlockKey =
      focusBlockIndex !== undefined
        ? operation.editor.children.at(focusBlockIndex)?._key
        : undefined
  } else {
    anchorBlockKey = isKeyedSegment(operation.at.anchor.path[0])
      ? operation.at.anchor.path[0]._key
      : undefined
    focusBlockKey = isKeyedSegment(operation.at.focus.path[0])
      ? operation.at.focus.path[0]._key
      : undefined
  }

  const anchorBlockPath = anchorBlockKey
    ? getBlockPath({
        editor: operation.editor,
        _key: anchorBlockKey,
      })
    : undefined
  const focusBlockPath = focusBlockKey
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

  let range: Range | null = null

  if (isIndexedSelection(operation.at)) {
    const value = fromSlateValue(
      operation.editor.children,
      context.schema.block.name,
    )

    const editorSelection = getKeyedSelection(
      context.schema,
      value,
      operation.at,
    )

    range = editorSelectionToSlateRange(
      context.schema,
      editorSelection,
      operation.editor,
    )
  } else {
    range = editorSelectionToSlateRange(
      context.schema,
      operation.at,
      operation.editor,
    )
  }

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
