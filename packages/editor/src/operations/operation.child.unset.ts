import {isSpan} from '@portabletext/schema'
import {isObjectNode} from '../engine/node/is-object-node'
import {safeStringify} from '../internal-utils/safe-json'
import {setNodeProperties} from '../internal-utils/set-node-properties'
import {getNode} from '../node-traversal/get-node'
import type {OperationImplementation} from './operation.types'

export const childUnsetOperationImplementation: OperationImplementation<
  'child.unset'
> = ({snapshot, operation}) => {
  const {context} = snapshot
  const childEntry = getNode(operation.editor, operation.at)

  if (!childEntry) {
    throw new Error(
      `Could not find a valid child at ${safeStringify(operation.at)}`,
    )
  }

  const {node: child, path: childPath} = childEntry

  if (isSpan({schema: operation.editor.schema}, child)) {
    const newNode: Record<string, unknown> = {}

    for (const prop of operation.props) {
      if (prop === '_type') {
        continue
      }

      if (prop === '_key') {
        newNode['_key'] = context.keyGenerator()
        continue
      }

      newNode[prop] = null
    }

    setNodeProperties(operation.editor, newNode, childPath)

    return
  }

  if (isObjectNode({schema: operation.editor.schema}, child)) {
    const unsetProps: Record<string, unknown> = {}
    for (const prop of operation.props) {
      if (prop === '_type') {
        continue
      }
      if (prop === '_key') {
        unsetProps['_key'] = context.keyGenerator()
      } else {
        unsetProps[prop] = null
      }
    }
    setNodeProperties(operation.editor, unsetProps, childPath)

    return
  }

  throw new Error(
    `Unable to determine the type of child at ${safeStringify(operation.at)}`,
  )
}
