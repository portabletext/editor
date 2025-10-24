import {Transforms, type Element as SlateElement} from 'slate'
import {toSlateBlock} from '../internal-utils/values'
import {parseBlock} from '../utils/parse-blocks'
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

  const slateBlock = toSlateBlock(parsedBlock, {
    schemaTypes: context.schema,
  }) as SlateElement

  Transforms.setNodes(operation.editor, slateBlock, {at: [blockIndex]})
}
