import {Transforms} from 'slate'
import type {BehaviorActionImplementation} from './behavior.actions'

export const moveBackwardActionImplementation: BehaviorActionImplementation<
  'move.backward'
> = ({action}) => {
  Transforms.move(action.editor, {
    unit: 'character',
    distance: action.distance,
    reverse: true,
  })
}
