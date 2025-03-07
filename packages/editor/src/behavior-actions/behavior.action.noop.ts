import type {BehaviorActionImplementation} from './behavior.actions'

export const noopActionImplementation: BehaviorActionImplementation<
  'noop'
> = () => {}
