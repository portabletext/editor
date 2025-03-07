import type {BehaviorActionImplementation} from './behavior.actions'

export const serializationFailureActionImplementation: BehaviorActionImplementation<
  'serialization.failure'
> = ({action}) => {
  console.warn(
    `Serialization of ${action.mimeType} failed with reason "${action.reason}"`,
  )
}
