import {Range, Transforms} from 'slate'
import {toSlateRange} from '../internal-utils/ranges'
import {
  getBlockPath,
  getFocusBlock,
  getFocusChild,
} from '../internal-utils/slate-utils'
import {isKeyedSegment} from '../utils'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const deleteOperationImplementation: BehaviorOperationImplementation<
  'delete'
> = ({context, operation}) => {
  const anchorBlockPath = isKeyedSegment(operation.at.anchor.path[0])
    ? getBlockPath({
        editor: operation.editor,
        _key: operation.at.anchor.path[0]._key,
      })
    : undefined
  const focusBlockPath = isKeyedSegment(operation.at.focus.path[0])
    ? getBlockPath({
        editor: operation.editor,
        _key: operation.at.focus.path[0]._key,
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

  if (Range.isCollapsed(range)) {
    const [focusBlock] = getFocusBlock({
      editor: {...operation.editor, selection: range},
    })
    const [focusChild] = getFocusChild({
      editor: {...operation.editor, selection: range},
    })

    if (
      focusBlock &&
      focusBlock._type === context.schema.block.name &&
      focusChild &&
      focusChild._type === context.schema.span.name
    ) {
      return
    }
  }

  operation.editor.delete({at: range})
}
