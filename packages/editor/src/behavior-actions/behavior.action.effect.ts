import type {BehaviorActionImplementation} from './behavior.actions'

export const effectActionImplementation: BehaviorActionImplementation<
  'effect'
> = ({action}) => {
  action.effect()
}
