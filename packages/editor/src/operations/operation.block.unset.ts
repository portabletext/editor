import {applyAll, set, unset} from '@portabletext/patches'
import {isTextBlock} from '@portabletext/schema'
import {applySetNode} from '../internal-utils/apply-set-node'
import type {Node} from '../slate'
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

    const unsetProps: Record<string, null> = {}
    for (const prop of propsToRemove) {
      unsetProps[prop] = null
    }
    applySetNode(operation.editor, unsetProps, [blockIndex])

    if (operation.props.includes('_key')) {
      applySetNode(operation.editor, {_key: context.keyGenerator()}, [
        blockIndex,
      ])
    }

    return
  }

  const patches = operation.props.flatMap((key) =>
    key === '_type'
      ? []
      : key === '_key'
        ? set(context.keyGenerator(), ['_key'])
        : unset([key]),
  )

  const updatedSlateBlock = applyAll(slateBlock, patches) as Partial<Node>

  applySetNode(operation.editor, updatedSlateBlock as Record<string, unknown>, [
    blockIndex,
  ])
}
