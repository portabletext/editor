import {Transforms, type Element as SlateElement} from 'slate'
import {
  blockPathToSlatePath,
  getBlockByPath,
} from '../internal-utils/block-path-utils'
import {toSlateBlock} from '../internal-utils/values'
import {getDeepestBlockKey} from '../selectors/selector.get-selected-value'
import {parseBlock} from '../utils/parse-blocks'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const blockSetOperationImplementation: BehaviorOperationImplementation<
  'block.set'
> = ({context, operation}) => {
  const blockKey = getDeepestBlockKey(
    operation.at,
    operation.editor.blockIndexMap,
  )

  if (!blockKey) {
    throw new Error(
      `Unable to find block key in path ${JSON.stringify(operation.at)}`,
    )
  }

  const blockPath = operation.editor.blockIndexMap.get(blockKey)

  if (blockPath === undefined) {
    throw new Error(
      `Unable to find block index for block at ${JSON.stringify(operation.at)}`,
    )
  }

  const block = getBlockByPath(
    {schema: context.schema, value: operation.editor.value},
    blockPath,
  )

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

  Transforms.setNodes(operation.editor, slateBlock, {
    at: blockPathToSlatePath(blockPath),
  })
}
