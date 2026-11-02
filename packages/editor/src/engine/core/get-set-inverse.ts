import {getValue} from '../../internal-utils/get-value'
import {hasUsableKey, isAddressableByKey} from '../../paths/node-segment'
import {isRecord} from '../../utils/asserters'
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
  const inversePath = getInversePath(editor, path, value)

  return previousValue === undefined
    ? {type: 'unset', path: inversePath}
    : {type: 'set', path: inversePath, value: previousValue}
}

/**
 * The inverse runs after the `set`, so a path through the array member the
 * `set` replaces or renames must address that member as it will be then:
 * by its new `_key` when that singles it out, otherwise by its index.
 */
function getInversePath(editor: Editor, path: Path, value: unknown): Path {
  const isRename = path.at(-1) === '_key'
  const memberPath = isRename ? path.slice(0, -1) : path
  const memberSegment = memberPath.at(-1)

  if (!isKeyedSegment(memberSegment) && typeof memberSegment !== 'number') {
    return path
  }

  const parentPath = memberPath.slice(0, -1)
  const elements = getValue(editor.snapshot.context.value, parentPath)

  if (!Array.isArray(elements)) {
    return path
  }

  const index = isKeyedSegment(memberSegment)
    ? elements.findIndex(
        (element) =>
          isRecord(element) && element['_key'] === memberSegment._key,
      )
    : memberSegment

  if (
    index < 0 ||
    index >= elements.length ||
    (isRename && !isRecord(elements[index]))
  ) {
    // The `set` writes nothing, so its inverse must not touch any member.
    return path
  }

  const member: unknown = isRename ? {...elements[index], _key: value} : value
  const key =
    isRecord(member) && hasUsableKey(member['_key'])
      ? member['_key']
      : undefined
  const elementsAfterSet = elements.map((element, elementIndex) =>
    elementIndex === index ? member : element,
  )
  const memberSegmentAfterSet =
    key !== undefined && isAddressableByKey(elementsAfterSet, key)
      ? {_key: key}
      : index

  return [
    ...parentPath,
    memberSegmentAfterSet,
    ...path.slice(memberPath.length),
  ]
}
