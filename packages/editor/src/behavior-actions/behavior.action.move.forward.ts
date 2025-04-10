import {Transforms} from 'slate'
import type {BehaviorActionImplementation} from './behavior.actions'

export const moveForwardActionImplementation: BehaviorActionImplementation<
  'move.forward'
> = ({action}) => {
  Transforms.move(action.editor, {
    unit: 'character',
    distance: action.distance,
  })
}
