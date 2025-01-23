import {Transforms} from 'slate'
import {toSlateRange} from '../internal-utils/ranges'
import type {BehaviorActionImplementation} from './behavior.actions'

export const blockUnsetBehaviorActionImplementation: BehaviorActionImplementation<
  'block.unset'
> = ({action}) => {
  const location = toSlateRange(
    {
      anchor: {path: action.at, offset: 0},
      focus: {path: action.at, offset: 0},
    },
    action.editor,
  )

  if (!location) {
    return
  }

  Transforms.unsetNodes(action.editor, action.props, {at: location})
}
