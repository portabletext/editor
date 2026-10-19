import {getValue} from '../../internal-utils/get-value'
import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {Editor} from '../interfaces/editor'
import type {
  SetOperationData,
  UnsetOperationData,
} from '../interfaces/operation'
import type {Path} from '../interfaces/path'

/**
 * The operation that undoes a `set` of `value` at `path`: restores the
 * value there now, or removes it when there is none.
 */
export function getSetInverse(
  editor: Editor,
  path: Path,
  value: unknown,
): SetOperationData | UnsetOperationData {
  const previousValue: unknown = getValue(editor.snapshot.context.value, path)
  const lastSegment = path[path.length - 1]

  // Renaming a node's own `_key` moves how it resolves: from here on it's
  // found by the new key, so the inverse (which runs after the rename) has
  // to target that key too, or it can never find the node to restore.
  const inversePath =
    lastSegment === '_key' &&
    typeof value === 'string' &&
    isKeyedSegment(path[path.length - 2])
      ? [...path.slice(0, -2), {_key: value}, '_key']
      : path

  return previousValue === undefined
    ? {type: 'unset', path: inversePath}
    : {type: 'set', path: inversePath, value: previousValue}
}
