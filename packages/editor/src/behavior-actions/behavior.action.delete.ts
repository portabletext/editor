import {toSlateRange} from '../internal-utils/ranges'
import type {BehaviorActionImplementation} from './behavior.actions'

export const deleteActionImplementation: BehaviorActionImplementation<
  'delete'
> = ({action}) => {
  const range = toSlateRange(action.at, action.editor)

  if (!range) {
    throw new Error(
      `Failed to get Slate Range for selection ${JSON.stringify(action.at)}`,
    )
  }

  action.editor.delete({at: range})
}
