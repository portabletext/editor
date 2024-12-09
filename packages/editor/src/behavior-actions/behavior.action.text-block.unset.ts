import {Transforms} from 'slate'
import {toSlateRange} from '../utils/ranges'
import type {BehaviorActionImplementation} from './behavior.actions'

export const textBlockUnsetActionImplementation: BehaviorActionImplementation<
  'text block.unset'
> = ({action}) => {
  const at = toSlateRange(
    {
      anchor: {path: action.at, offset: 0},
      focus: {path: action.at, offset: 0},
    },
    action.editor,
  )!

  Transforms.unsetNodes(action.editor, action.props, {at})
}
