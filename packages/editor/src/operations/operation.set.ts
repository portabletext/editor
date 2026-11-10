import {toKeyedPatchPath} from '../internal-utils/operation-to-patches'
import {getNode} from '../traversal/get-node'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import type {OperationImplementation} from './operation.types'

export const setOperationImplementation: OperationImplementation<'set'> = ({
  snapshot,
  operation,
}) => {
  const lastSegment = operation.at.at(-1)
  const isNodePath =
    isKeyedSegment(lastSegment) ||
    (typeof lastSegment === 'number' &&
      Number.isInteger(lastSegment) &&
      lastSegment >= 0)

  if (
    isNodePath &&
    (operation.value === null || typeof operation.value !== 'object')
  ) {
    const node = getNode(snapshot, operation.at)

    if (node && node.path.length === operation.at.length) {
      // A shorter returned path means the set addresses a property of a node,
      // not the node itself.
      const path = toKeyedPatchPath(snapshot.context.value, operation.at)

      if (!path.slice(0, -1).some((segment) => typeof segment === 'number')) {
        // Removal resolves containers by key, so every ancestor must have
        // become a key. A numeric ancestor keeps the set as it was.
        operation.editor.apply({type: 'unset', path})
        return
      }
    }
  }

  operation.editor.apply({
    type: 'set',
    path: operation.at,
    value: operation.value,
  })
}
