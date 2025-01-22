import type {BehaviorActionImplementation} from './behavior.actions'

export const dataTransferSetActionImplementation: BehaviorActionImplementation<
  'data transfer.set'
> = ({action}) => {
  action.dataTransfer.setData(action.mimeType, action.data)
}
