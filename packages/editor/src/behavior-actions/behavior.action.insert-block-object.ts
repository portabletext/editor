import {toSlateValue} from '../internal-utils/values'
import {insertBlock} from './behavior.action-utils.insert-block'
import type {BehaviorActionImplementation} from './behavior.actions'

export const insertBlockObjectActionImplementation: BehaviorActionImplementation<
  'insert.block object'
> = ({context, action}) => {
  const block = toSlateValue(
    [
      {
        _key: context.keyGenerator(),
        _type: action.blockObject.name,
        ...(action.blockObject.value ? action.blockObject.value : {}),
      },
    ],
    {schemaTypes: context.schema},
  )[0]

  insertBlock({
    block,
    placement: action.placement,
    editor: action.editor,
    schema: context.schema,
  })
}
