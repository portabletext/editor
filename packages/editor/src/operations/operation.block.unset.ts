import {applyAll, set, unset} from '@portabletext/patches'
import {isTextBlock} from '@portabletext/schema'
import {Transforms, type Node} from 'slate'
import type {OperationImplementation} from './operation.types'

export const blockUnsetOperationImplementation: OperationImplementation<
  'block.unset'
> = ({context, operation}) => {
  const blockKey = operation.at[operation.at.length - 1]?._key
  const entry = blockKey
    ? operation.editor.blockIndexMap.get(blockKey)
    : undefined

  if (entry === undefined) {
    throw new Error(
      `Unable to find block index for block at ${JSON.stringify(operation.at)}`,
    )
  }

  const blockIndex = entry.index
  const slateBlock = operation.editor.children.at(blockIndex)

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

  const patches = operation.props.flatMap((key) =>
    key === '_type'
      ? []
      : key === '_key'
        ? set(context.keyGenerator(), ['_key'])
        : unset(['value', key]),
  )

  const updatedSlateBlock = applyAll(slateBlock, patches) as Partial<Node>

  Transforms.setNodes(operation.editor, updatedSlateBlock, {at: [blockIndex]})
}
