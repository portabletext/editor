import {resolveOperationPath} from '../internal-utils/resolve-operation-path'
import {hasUsableKey} from '../paths/node-segment'
import {isRecord} from '../utils/asserters'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import type {OperationImplementation} from './operation.types'

export const setOperationImplementation: OperationImplementation<'set'> = ({
  snapshot,
  operation,
}) => {
  const path = resolveOperationPath(
    operation.editor.snapshot.context.value,
    operation.at,
  )

  if (!path) {
    return
  }

  const lastSegment = path.at(-1)

  // Normalization doesn't key a whole-node replacement, and undo can only
  // find a keyless one by its index, which remote inserts shift.
  const value =
    (isKeyedSegment(lastSegment) || typeof lastSegment === 'number') &&
    isRecord(operation.value) &&
    !Array.isArray(operation.value) &&
    !hasUsableKey(operation.value['_key'])
      ? {...operation.value, _key: snapshot.context.keyGenerator()}
      : operation.value

  operation.editor.apply({type: 'set', path, value})
}
