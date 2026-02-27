import {applySetNode} from '../internal-utils/apply-set-node'
import type {OperationImplementation} from './operation.types'

export const blockUnsetOperationImplementation: OperationImplementation<
  'block.unset'
> = ({context, operation}) => {
  const blockKey = operation.at[0]._key
  const blockIndex = operation.editor.blockIndexMap.get(blockKey)

  if (blockIndex === undefined) {
    throw new Error(`Unable to find block index for block key ${blockKey}`)
  }

  const slateBlock =
    blockIndex !== undefined
      ? operation.editor.children.at(blockIndex)
      : undefined

  if (!slateBlock) {
    throw new Error(`Unable to find block at ${JSON.stringify(operation.at)}`)
  }

  const propsToRemove = operation.props.filter(
    (prop) => prop !== '_type' && prop !== '_key' && prop !== 'children',
  )

  const unsetProps: Record<string, null> = {}
  for (const prop of propsToRemove) {
    unsetProps[prop] = null
  }

  if (Object.keys(unsetProps).length > 0) {
    applySetNode(operation.editor, unsetProps, [blockIndex])
  }

  if (operation.props.includes('_key')) {
    applySetNode(operation.editor, {_key: context.keyGenerator()}, [blockIndex])
  }
}
