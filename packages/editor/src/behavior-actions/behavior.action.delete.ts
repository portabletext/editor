import {Range} from 'slate'
import {toSlateRange} from '../internal-utils/ranges'
import {getFocusBlock, getFocusChild} from '../internal-utils/slate-utils'
import type {BehaviorActionImplementation} from './behavior.actions'

export const deleteActionImplementation: BehaviorActionImplementation<
  'delete'
> = ({context, action}) => {
  const range = toSlateRange(action.at, action.editor)

  if (!range) {
    throw new Error(
      `Failed to get Slate Range for selection ${JSON.stringify(action.at)}`,
    )
  }

  if (Range.isCollapsed(range)) {
    const [focusBlock] = getFocusBlock({
      editor: {...action.editor, selection: range},
    })
    const [focusChild] = getFocusChild({
      editor: {...action.editor, selection: range},
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

  action.editor.delete({at: range})
}
