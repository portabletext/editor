import {insertBlockActionImplementation} from './behavior.action.insert.block'
import type {BehaviorActionImplementation} from './behavior.actions'

export const insertBlockObjectActionImplementation: BehaviorActionImplementation<
  'insert.block object'
> = ({context, action}) => {
  insertBlockActionImplementation({
    context,
    action: {
      type: 'insert.block',
      block: {
        _key: context.keyGenerator(),
        _type: action.blockObject.name,
        ...(action.blockObject.value ? action.blockObject.value : {}),
      },
      editor: action.editor,
      placement: action.placement,
    },
  })
}
