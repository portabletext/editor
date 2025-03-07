import type {BehaviorActionImplementation} from './behavior.actions'

export const deserializationFailureActionImplementation: BehaviorActionImplementation<
  'deserialization.failure'
> = ({action}) => {
  console.warn(
    `Deserialization of ${action.mimeType} failed with reason "${action.reason}"`,
  )
}
