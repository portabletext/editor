import {applyAll, set, unset} from '@portabletext/patches'
import {isTextBlock} from '@portabletext/schema'
import {Transforms, type Node} from 'slate'
import type {OperationImplementation} from './operation.types'

export const blockUnsetOperationImplementation: OperationImplementation<
  'block.unset'
> = ({context, operation}) => {
  const blockKey = operation.at[0]._key
  const blockEntry = operation.editor.blockMap.get(blockKey)

  if (!blockEntry) {
    throw new Error(`Unable to find block entry for block key ${blockKey}`)
  }

  const blockIndex = blockEntry.index
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
