import {dataTransferSetActionImplementation} from './behavior.action.data-transfer-set'
import type {BehaviorActionImplementation} from './behavior.actions'

export const serializationSuccessActionImplementation: BehaviorActionImplementation<
  'serialization.success'
> = ({context, action}) => {
  dataTransferSetActionImplementation({
    context,
    action: {
      type: 'data transfer.set',
      data: action.data,
      dataTransfer: action.originEvent.originEvent.dataTransfer,
      mimeType: action.mimeType,
      editor: action.editor,
    },
  })
}
