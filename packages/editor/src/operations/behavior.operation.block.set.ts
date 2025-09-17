import {Transforms, type Element as SlateElement} from 'slate'
import {parseBlock} from '../internal-utils/parse-blocks'
import {toSlateValue} from '../internal-utils/values'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const blockSetOperationImplementation: BehaviorOperationImplementation<
  'block.set'
> = ({context, operation}) => {
  const blockIndex = operation.editor.blockIndexMap.get(operation.at[0]._key)

  if (blockIndex === undefined) {
    throw new Error(
      `Unable to find block index for block at ${JSON.stringify(operation.at)}`,
    )
  }

  const block = operation.editor.value.at(blockIndex)

  if (!block) {
    throw new Error(`Unable to find block at ${JSON.stringify(operation.at)}`)
  }

  const {_type, ...filteredProps} = operation.props

  const updatedBlock = {
    ...block,
    ...filteredProps,
  }

  const parsedBlock = parseBlock({
    context,
    block: updatedBlock,
    options: {
      removeUnusedMarkDefs: false,
      validateFields: true,
    },
  })

  if (!parsedBlock) {
    throw new Error(`Unable to update block at ${JSON.stringify(operation.at)}`)
  }

  const slateBlock = toSlateValue([parsedBlock], {
    schemaTypes: context.schema,
  })?.at(0) as SlateElement | undefined

  if (!slateBlock) {
    throw new Error(`Unable to convert block to Slate value`)
  }

  Transforms.setNodes(operation.editor, slateBlock, {at: [blockIndex]})
}
