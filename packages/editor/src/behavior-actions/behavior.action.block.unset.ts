import {omit} from 'lodash'
import {Editor, Transforms} from 'slate'
import {isTextBlock, parseBlock} from '../internal-utils/parse-blocks'
import {toSlateRange} from '../internal-utils/ranges'
import {fromSlateValue} from '../internal-utils/values'
import {KEY_TO_VALUE_ELEMENT} from '../internal-utils/weakMaps'
import type {BehaviorActionImplementation} from './behavior.actions'

export const blockUnsetBehaviorActionImplementation: BehaviorActionImplementation<
  'block.unset'
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

  if (isTextBlock(context.schema, parsedBlock)) {
    const propsToRemove = action.props.filter((prop) => prop !== '_type')

    const updatedTextBlock = parseBlock({
      context,
      block: omit(parsedBlock, propsToRemove),
      options: {refreshKeys: false},
    })

    if (!updatedTextBlock) {
      throw new Error(`Unable to update block at ${JSON.stringify(action.at)}`)
    }

    const propsToSet: Record<string, unknown> = {}

    for (const prop of propsToRemove) {
      if (!(prop in updatedTextBlock)) {
        propsToSet[prop] = undefined
      } else {
        propsToSet[prop] = (updatedTextBlock as Record<string, unknown>)[prop]
      }
    }

    Transforms.setNodes(action.editor, propsToSet, {at: location})

    return
  }

  const updatedBlockObject = parseBlock({
    context,
    block: omit(
      parsedBlock,
      action.props.filter((prop) => prop !== '_type'),
    ),
    options: {refreshKeys: false},
  })

  if (!updatedBlockObject) {
    throw new Error(`Unable to update block at ${JSON.stringify(action.at)}`)
  }

  const {_type, _key, ...props} = updatedBlockObject

  Transforms.setNodes(
    action.editor,
    {
      _type,
      _key,
      value: props,
    },
    {at: location},
  )
}
