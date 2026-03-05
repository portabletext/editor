import {isTextBlock} from '@portabletext/schema'
import {applySetNode} from '../internal-utils/apply-set-node'
import {resolveBlock} from '../internal-utils/resolve-key-path'
import type {OperationImplementation} from './operation.types'

export const blockUnsetOperationImplementation: OperationImplementation<
  'block.unset'
> = ({context, operation}) => {
  const blockKey = operation.at[0]._key
  const resolved = resolveBlock(operation.editor, blockKey)

  if (!resolved) {
    throw new Error(
      `Unable to find block with key "${blockKey}" at ${JSON.stringify(operation.at)}`,
    )
  }

  const {node: slateBlock, index: blockIndex} = resolved

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

  const unsetProps: Record<string, unknown> = {}
  for (const key of operation.props) {
    if (key === '_type') {
      continue
    }
    if (key === '_key') {
      unsetProps['_key'] = context.keyGenerator()
    } else {
      unsetProps[key] = null
    }
  }
  applySetNode(operation.editor, unsetProps, [blockIndex])
}
