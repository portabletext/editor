import {isTextBlock} from '@portabletext/schema'
import {applySetNodeKeyed} from '../internal-utils/apply-set-node-keyed'
import {safeStringify} from '../internal-utils/safe-json'
import {getNode} from '../slate/node/get-node'
import {resolveKeyedPath} from '../slate/utils/resolve-keyed-path'
import type {OperationImplementation} from './operation.types'

export const blockUnsetOperationImplementation: OperationImplementation<
  'block.unset'
> = ({context, operation}) => {
  const indexedPath = resolveKeyedPath(
    operation.editor,
    [operation.at[0]],
    operation.editor.blockIndexMap,
  )

  if (!indexedPath) {
    throw new Error(
      `Unable to find block index for block key ${operation.at[0]._key}`,
    )
  }

  const slateBlock = getNode(
    operation.editor,
    indexedPath,
    operation.editor.schema,
  )

  if (!slateBlock) {
    throw new Error(`Unable to find block at ${safeStringify(operation.at)}`)
  }

  if (isTextBlock(context, slateBlock)) {
    const propsToRemove = operation.props.filter(
      (prop) => prop !== '_type' && prop !== '_key' && prop !== 'children',
    )

    const unsetProps: Record<string, null> = {}
    for (const prop of propsToRemove) {
      unsetProps[prop] = null
    }
    applySetNodeKeyed(operation.editor, unsetProps, [operation.at[0]])

    if (operation.props.includes('_key')) {
      applySetNodeKeyed(operation.editor, {_key: context.keyGenerator()}, [
        operation.at[0],
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
  applySetNodeKeyed(operation.editor, unsetProps, [operation.at[0]])
}
