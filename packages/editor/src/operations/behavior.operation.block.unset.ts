import {applyAll, set, unset} from '@portabletext/patches'
import {isTextBlock} from '@portabletext/schema'
import {Transforms, type Node} from 'slate'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const blockUnsetOperationImplementation: BehaviorOperationImplementation<
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
