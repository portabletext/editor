import {applySetNode} from '../internal-utils/apply-set-node'
import {getNode} from '../node-traversal/get-node'
import {keyedPathToIndexedPath} from '../paths/keyed-path-to-indexed-path'
import type {OperationImplementation} from './operation.types'

export const unsetOperationImplementation: OperationImplementation<'unset'> = ({
  context,
  operation,
}) => {
  const indexedPath = keyedPathToIndexedPath(
    {children: operation.editor.children},
    operation.at,
    operation.editor.blockIndexMap,
  )

  if (!indexedPath) {
    return
  }

  const nodeResult = getNode(
    {
      schema: context.schema,
      editableTypes: operation.editor.editableTypes,
      value: operation.editor.children,
    },
    indexedPath,
  )

  if (!nodeResult) {
    return
  }

  const removedProperties: Record<string, null> = {}
  for (const prop of operation.props) {
    removedProperties[prop] = null
  }

  applySetNode(operation.editor, removedProperties, indexedPath)
}
