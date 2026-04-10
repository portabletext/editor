import {safeStringify} from '../internal-utils/safe-json'
import {setNodeProperties} from '../internal-utils/set-node-properties'
import {isTextBlockNode} from '../slate/node/is-text-block-node'
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
    setNodeProperties(operation.editor, unsetProps, [{_key: blockKey}])

    if (operation.props.includes('_key')) {
      setNodeProperties(operation.editor, {_key: context.keyGenerator()}, [
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
  setNodeProperties(operation.editor, unsetProps, [{_key: blockKey}])
}
