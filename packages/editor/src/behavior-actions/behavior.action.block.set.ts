import {Editor, Transforms, type Element as SlateElement} from 'slate'
import {parseBlock} from '../internal-utils/parse-blocks'
import {toSlateRange} from '../internal-utils/ranges'
import {fromSlateValue, toSlateValue} from '../internal-utils/values'
import {KEY_TO_VALUE_ELEMENT} from '../internal-utils/weakMaps'
import type {BehaviorActionImplementation} from './behavior.actions'

export const blockSetBehaviorActionImplementation: BehaviorActionImplementation<
  'block.set'
> = ({context, action}) => {
  const location = toSlateRange(
    {
      anchor: {path: action.at, offset: 0},
      focus: {path: action.at, offset: 0},
    },
    action.editor,
  )

  if (!location) {
    throw new Error(
      `Unable to convert ${JSON.stringify(action.at)} into a Slate Range`,
    )
  }

  const blockEntry = Editor.node(action.editor, location, {depth: 1})
  const block = blockEntry?.[0]

  if (!block) {
    throw new Error(`Unable to find block at ${JSON.stringify(action.at)}`)
  }

  const parsedBlock = fromSlateValue(
    [block],
    context.schema.block.name,
    KEY_TO_VALUE_ELEMENT.get(action.editor),
  ).at(0)

  if (!parsedBlock) {
    throw new Error(`Unable to parse block at ${JSON.stringify(action.at)}`)
  }

  const {_type, ...filteredProps} = action.props

  const updatedBlock = parseBlock({
    context,
    block: {
      ...parsedBlock,
      ...filteredProps,
    },
    options: {refreshKeys: false},
  })

  if (!updatedBlock) {
    throw new Error(`Unable to update block at ${JSON.stringify(action.at)}`)
  }

  const slateBlock = toSlateValue([updatedBlock], {
    schemaTypes: context.schema,
  })?.at(0) as SlateElement | undefined

  if (!slateBlock) {
    throw new Error(`Unable to convert block to Slate value`)
  }

  Transforms.setNodes(action.editor, slateBlock, {at: location})
}
