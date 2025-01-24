import {parseBlock} from '../internal-utils/parse-blocks'
import {toSlateValue} from '../internal-utils/values'
import {insertBlock} from './behavior.action-utils.insert-block'
import type {BehaviorActionImplementation} from './behavior.actions'

export const insertBlockActionImplementation: BehaviorActionImplementation<
  'insert.block'
> = ({context, action}) => {
  const parsedBlock = parseBlock({
    block: action.block,
    context,
    options: {refreshKeys: false},
  })

  if (!parsedBlock) {
    throw new Error(`Failed to parse block ${JSON.stringify(action.block)}`)
  }

  const fragment = toSlateValue([parsedBlock], {schemaTypes: context.schema})[0]

  if (!fragment) {
    throw new Error(
      `Failed to convert block to Slate fragment ${JSON.stringify(parsedBlock)}`,
    )
  }

  insertBlock({
    block: fragment,
    placement: action.placement,
    editor: action.editor,
    schema: context.schema,
  })
}
