import {applySetNode} from '../internal-utils/apply-set-node'
import {safeStringify} from '../internal-utils/safe-json'
import {isTextBlockNode} from '../slate/node/is-text-block-node'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import type {OperationImplementation} from './operation.types'

export const blockUnsetOperationImplementation: OperationImplementation<
  'block.unset'
> = ({context, operation}) => {
  const firstSegment = operation.at[0]
  const blockKey = isKeyedSegment(firstSegment) ? firstSegment._key : undefined

  if (blockKey === undefined) {
    throw new Error(
      `Unable to find block key at ${safeStringify(operation.at)}`,
    )
  }

  const blockIndex = operation.editor.blockIndexMap.get(blockKey)

  if (blockIndex === undefined) {
    throw new Error(`Unable to find block index for block key ${blockKey}`)
  }

  const slateBlock =
    blockIndex !== undefined
      ? operation.editor.children.at(blockIndex)
      : undefined

  if (!slateBlock) {
    throw new Error(`Unable to find block at ${safeStringify(operation.at)}`)
  }

  if (isTextBlockNode(context, slateBlock)) {
    const propsToRemove = operation.props.filter(
      (prop) => prop !== '_type' && prop !== '_key',
    )

    const unsetProps: Record<string, null> = {}
    for (const prop of propsToRemove) {
      unsetProps[prop] = null
    }
    applySetNode(operation.editor, unsetProps, [{_key: blockKey}])

    if (operation.props.includes('_key')) {
      applySetNode(operation.editor, {_key: context.keyGenerator()}, [
        {_key: blockKey},
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
  applySetNode(operation.editor, unsetProps, [{_key: blockKey}])
}
