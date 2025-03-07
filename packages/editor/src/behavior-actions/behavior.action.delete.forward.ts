import type {BehaviorActionImplementation} from './behavior.actions'

export const deleteForwardActionImplementation: BehaviorActionImplementation<
  'delete.forward'
> = ({action}) => {
  action.editor.deleteForward(action.unit)
}
