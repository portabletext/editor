import type {Editor, EditorInterface} from '../interfaces/editor'
import {Operation} from '../interfaces/operation'
import {Range} from '../interfaces/range'
import {isObject} from '../utils'

export const isEditor: EditorInterface['isEditor'] = (
  value: any,
): value is Editor => {
  if (!isObject(value)) {
    return false
  }

  const isEditor =
    typeof value.apply === 'function' &&
    typeof value.insertBreak === 'function' &&
    typeof value.insertFragment === 'function' &&
    typeof value.insertText === 'function' &&
    typeof value.isElementReadOnly === 'function' &&
    typeof value.isInline === 'function' &&
    typeof value.isSelectable === 'function' &&
    typeof value.normalizeNode === 'function' &&
    typeof value.onChange === 'function' &&
    typeof value.getDirtyPaths === 'function' &&
    (value.marks === null || isObject(value.marks)) &&
    (value.selection === null || Range.isRange(value.selection)) &&
    Operation.isOperationList(value.operations)

  return isEditor
}
