import type {BehaviorActionImplementation} from './behavior.actions'

export const deleteBackwardActionImplementation: BehaviorActionImplementation<
  'delete.backward'
> = ({action}) => {
  action.editor.deleteBackward(action.unit)
}
