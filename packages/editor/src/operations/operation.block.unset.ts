import {isTextBlockNode} from '../engine/node/is-text-block-node'
import {safeStringify} from '../internal-utils/safe-json'
import {setNodeProperties} from '../internal-utils/set-node-properties'
import {getNode} from '../node-traversal/get-node'
import type {OperationImplementation} from './operation.types'

export const blockUnsetOperationImplementation: OperationImplementation<
  'block.unset'
> = ({snapshot, operation}) => {
  const {context} = snapshot
  const blockEntry = getNode(operation.editor, operation.at)

  if (!blockEntry) {
    throw new Error(`Unable to find block at ${safeStringify(operation.at)}`)
  }

  const engineBlock = blockEntry.node

  if (isTextBlockNode(context, engineBlock)) {
    const propsToRemove = operation.props.filter(
      (prop) => prop !== '_type' && prop !== '_key',
    )

    const unsetProps: Record<string, null> = {}
    for (const prop of propsToRemove) {
      unsetProps[prop] = null
    }
    setNodeProperties(operation.editor, unsetProps, blockEntry.path)

    if (operation.props.includes('_key')) {
      setNodeProperties(
        operation.editor,
        {_key: context.keyGenerator()},
        blockEntry.path,
      )
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
  setNodeProperties(operation.editor, unsetProps, blockEntry.path)
}
