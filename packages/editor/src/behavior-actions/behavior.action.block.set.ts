import {Transforms} from 'slate'
import {toSlateRange} from '../internal-utils/ranges'
import type {BehaviorActionImplementation} from './behavior.actions'

export const blockSetBehaviorActionImplementation: BehaviorActionImplementation<
  'block.set'
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

  const {at, editor, type, ...payload} = action

  Transforms.setNodes(action.editor, payload, {at: location})
}
