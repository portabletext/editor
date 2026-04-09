import {getNode} from '../node-traversal/get-node'
import type {OperationImplementation} from './operation.types'

export const unsetOperationImplementation: OperationImplementation<'unset'> = ({
  operation,
}) => {
  const {editor, at, props} = operation

  const entry = getNode(editor, at)

  if (!entry) {
    console.error(`unset: no node found at path`)
    return
  }

  const nodeRecord = entry.node as Record<string, unknown>
  const properties: Record<string, unknown> = {}
  const newProperties: Record<string, unknown> = {}

  for (const propertyName of props) {
    if (propertyName in nodeRecord) {
      properties[propertyName] = nodeRecord[propertyName]
    }
    newProperties[propertyName] = undefined
  }

  if (
    Object.keys(properties).length === 0 &&
    Object.keys(newProperties).length === 0
  ) {
    return
  }

  editor.apply({
    type: 'set_node',
    path: entry.path,
    properties,
    newProperties,
  })
}
