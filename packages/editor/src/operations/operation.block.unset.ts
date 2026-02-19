import {isTextBlock} from '@portabletext/schema'
import {Transforms} from '../slate'
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

  if (isTextBlock(context, slateBlock)) {
    const propsToRemove = operation.props.filter(
      (prop) => prop !== '_type' && prop !== '_key' && prop !== 'children',
    )

    Transforms.unsetNodes(operation.editor, propsToRemove, {at: [blockIndex]})

    if (operation.props.includes('_key')) {
      Transforms.setNodes(
        operation.editor,
        {_key: context.keyGenerator()},
        {at: [blockIndex]},
      )
    }

    return
  }

  const propsToRemove = operation.props.filter(
    (prop) => prop !== '_type' && prop !== '_key',
  )

  Transforms.unsetNodes(operation.editor, propsToRemove, {at: [blockIndex]})

  if (operation.props.includes('_key')) {
    Transforms.setNodes(
      operation.editor,
      {_key: context.keyGenerator()},
      {at: [blockIndex]},
    )
  }
}
