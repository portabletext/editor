import {Editor, Transforms, type Element as SlateElement} from 'slate'
import {parseBlock} from '../internal-utils/parse-blocks'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {fromSlateValue, toSlateValue} from '../internal-utils/values'
import {KEY_TO_VALUE_ELEMENT} from '../internal-utils/weakMaps'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const blockSetOperationImplementation: BehaviorOperationImplementation<
  'block.set'
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

  const {_type, ...filteredProps} = operation.props

  const updatedBlock = parseBlock({
    context,
    block: {
      ...parsedBlock,
      ...filteredProps,
    },
    options: {refreshKeys: false, validateFields: true},
  })

  if (!updatedBlock) {
    throw new Error(`Unable to update block at ${JSON.stringify(operation.at)}`)
  }

  const slateBlock = toSlateValue([updatedBlock], {
    schemaTypes: context.schema,
  })?.at(0) as SlateElement | undefined

  if (!slateBlock) {
    throw new Error(`Unable to convert block to Slate value`)
  }

  Transforms.setNodes(operation.editor, slateBlock, {at: location})
}
