import {toSlateValue} from '../../utils/values'
import {insertBlock} from './behavior.action-utils.insert-block'
import {BehaviorActionImplementation} from './behavior.actions'

export const insertBlockObjectActionImplementation: BehaviorActionImplementation<
  'insert block object'
> = ({context, action}) => {
  const block = toSlateValue(
    [
      {
        _key: context.keyGenerator(),
        _type: action.name,
        ...(action.value ? action.value : {}),
      },
    ],
    {schemaTypes: context.schema},
  )[0]

  insertBlock({
    block,
    editor: action.editor,
    schema: context.schema,
  })
}
