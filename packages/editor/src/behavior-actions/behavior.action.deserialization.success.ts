import {insertBlocksActionImplementation} from './behavior.action.insert-blocks'
import type {BehaviorActionImplementation} from './behavior.actions'

export const deserializationSuccessActionImplementation: BehaviorActionImplementation<
  'deserialization.success'
> = ({context, action}) => {
  insertBlocksActionImplementation({
    context,
    action: {
      type: 'insert.blocks',
      blocks: action.data,
      editor: action.editor,
      placement: 'auto',
    },
  })
}
