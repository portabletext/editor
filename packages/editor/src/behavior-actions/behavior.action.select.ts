import {Transforms} from 'slate'
import {toSlateRange} from '../internal-utils/ranges'
import type {BehaviorActionImplementation} from './behavior.actions'

export const selectActionImplementation: BehaviorActionImplementation<
  'select'
> = ({action}) => {
  const newSelection = toSlateRange(action.selection, action.editor)

  if (newSelection) {
    Transforms.select(action.editor, newSelection)
  } else {
    Transforms.deselect(action.editor)
  }
}
