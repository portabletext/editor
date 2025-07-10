import {omit} from 'lodash'
import {Editor, Transforms} from 'slate'
import {isTextBlock, parseBlock} from '../internal-utils/parse-blocks'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {fromSlateValue} from '../internal-utils/values'
import {KEY_TO_VALUE_ELEMENT} from '../internal-utils/weakMaps'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const blockUnsetOperationImplementation: BehaviorOperationImplementation<
  'block.unset'
> = ({context, operation}) => {
  const location = toSlateRange({
    context: {
      schema: context.schema,
      value: operation.editor.value,
      selection: {
        anchor: {path: operation.at, offset: 0},
        focus: {path: operation.at, offset: 0},
      },
    },
    blockIndexMap: operation.editor.blockIndexMap,
  })

  if (!location) {
    throw new Error(
      `Unable to convert ${JSON.stringify(operation.at)} into a Slate Range`,
    )
  }

  const blockEntry = Editor.node(operation.editor, location, {depth: 1})
  const block = blockEntry?.[0]

  if (!block) {
    throw new Error(`Unable to find block at ${JSON.stringify(operation.at)}`)
  }

  const parsedBlock = fromSlateValue(
    [block],
    context.schema.block.name,
    KEY_TO_VALUE_ELEMENT.get(operation.editor),
  ).at(0)

  if (!parsedBlock) {
    throw new Error(`Unable to parse block at ${JSON.stringify(operation.at)}`)
  }

  if (isTextBlock(context, parsedBlock)) {
    const propsToRemove = operation.props.filter((prop) => prop !== '_type')

    const updatedTextBlock = parseBlock({
      context,
      block: omit(parsedBlock, propsToRemove),
      options: {refreshKeys: false, validateFields: true},
    })

    if (!updatedTextBlock) {
      throw new Error(
        `Unable to update block at ${JSON.stringify(operation.at)}`,
      )
    }

    const propsToSet: Record<string, unknown> = {}

    for (const prop of propsToRemove) {
      if (!(prop in updatedTextBlock)) {
        propsToSet[prop] = undefined
      } else {
        propsToSet[prop] = (updatedTextBlock as Record<string, unknown>)[prop]
      }
    }

    Transforms.setNodes(operation.editor, propsToSet, {at: location})

    return
  }

  const updatedBlockObject = parseBlock({
    context,
    block: omit(
      parsedBlock,
      operation.props.filter((prop) => prop !== '_type'),
    ),
    options: {refreshKeys: false, validateFields: true},
  })

  if (!updatedBlockObject) {
    throw new Error(`Unable to update block at ${JSON.stringify(operation.at)}`)
  }

  const {_type, _key, ...props} = updatedBlockObject

  Transforms.setNodes(
    operation.editor,
    {
      _type,
      _key,
      value: props,
    },
    {at: location},
  )
}
