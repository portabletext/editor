import {Transforms} from 'slate'
import {toSlatePath} from '../internal-utils/paths'
import type {BehaviorActionImplementation} from './behavior.actions'

export const moveBlockActionImplementation: BehaviorActionImplementation<
  'move.block'
> = ({action}) => {
  const at = [toSlatePath(action.at, action.editor)[0]]
  const to = [toSlatePath(action.to, action.editor)[0]]

  Transforms.moveNodes(action.editor, {
    at,
    to,
    mode: 'highest',
  })
}
