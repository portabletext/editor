import {isSpan} from '@portabletext/schema'
import {applySetNode} from '../internal-utils/apply-set-node'
import {safeStringify} from '../internal-utils/safe-json'
import {getNode} from '../node-traversal/get-node'
import {isObjectNode} from '../slate/node/is-object-node'
import type {OperationImplementation} from './operation.types'

export const childUnsetOperationImplementation: OperationImplementation<
  'child.unset'
> = ({context, operation}) => {
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

    applySetNode(operation.editor, newNode, childPath)

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
    applySetNode(operation.editor, unsetProps, childPath)

    return
  }

  throw new Error(
    `Unable to determine the type of child at ${safeStringify(operation.at)}`,
  )
}
