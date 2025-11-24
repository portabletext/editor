import {isTextBlock} from '@portabletext/schema'
import {omit} from 'lodash'
import {Transforms} from 'slate'
import {parseBlock} from '../utils/parse-blocks'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const blockUnsetOperationImplementation: BehaviorOperationImplementation<
  'block.unset'
> = ({context, operation}) => {
  const blockKey = operation.at[0]._key
  const blockIndex = operation.editor.blockIndexMap.get(blockKey)

  if (blockIndex === undefined) {
    throw new Error(`Unable to find block index for block key ${blockKey}`)
  }

  const block =
    blockIndex !== undefined ? operation.editor.value.at(blockIndex) : undefined

  if (!block) {
    throw new Error(`Unable to find block at ${JSON.stringify(operation.at)}`)
  }

  if (isTextBlock(context, block)) {
    const propsToRemove = operation.props.filter((prop) => prop !== '_type')

    const updatedTextBlock = parseBlock({
      context,
      block: omit(block, propsToRemove),
      options: {
        normalize: false,
        removeUnusedMarkDefs: true,
        validateFields: true,
      },
    })

    if (!updatedTextBlock) {
      throw new Error(
        `Unable to update block at ${JSON.stringify(operation.at)}`,
      )
    }

    const propsToSet: Record<string, unknown> = {}

    for (const prop of propsToRemove) {
      if (!(prop in updatedTextBlock)) {
        propsToSet[prop] = undefined
      } else {
        propsToSet[prop] = (updatedTextBlock as Record<string, unknown>)[prop]
      }
    }

    Transforms.setNodes(operation.editor, propsToSet, {at: [blockIndex]})

    return
  }

  const updatedBlockObject = parseBlock({
    context,
    block: omit(
      block,
      operation.props.filter((prop) => prop !== '_type'),
    ),
    options: {
      normalize: false,
      removeUnusedMarkDefs: true,
      validateFields: true,
    },
  })

  if (!updatedBlockObject) {
    throw new Error(`Unable to update block at ${JSON.stringify(operation.at)}`)
  }

  const {_type, _key, ...props} = updatedBlockObject

  Transforms.setNodes(
    operation.editor,
    {
      _type,
      _key,
      value: props,
    },
    {at: [blockIndex]},
  )
}
