import {Range} from 'slate'
import {toSlateRange} from '../internal-utils/ranges'
import {getFocusBlock, getFocusChild} from '../internal-utils/slate-utils'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const deleteOperationImplementation: BehaviorOperationImplementation<
  'delete'
> = ({context, operation}) => {
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
