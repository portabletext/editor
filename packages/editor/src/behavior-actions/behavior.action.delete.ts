import {toSlateRange} from '../internal-utils/ranges'
import type {BehaviorActionImplementation} from './behavior.actions'

export const deleteActionImplementation: BehaviorActionImplementation<
  'delete'
> = ({action}) => {
  const range = toSlateRange(action.selection, action.editor)

  if (!range) {
    throw new Error(
      `Failed to get Slate Range for selection ${JSON.stringify(action.selection)}`,
    )
  }

  action.editor.delete({at: range})
}
