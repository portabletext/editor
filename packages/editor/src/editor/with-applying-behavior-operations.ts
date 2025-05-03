import {Editor} from 'slate'
import {defaultKeyGenerator} from './key-generator'

const CURRENT_OPERATION_ID: WeakMap<Editor, string | undefined> = new WeakMap()

export function withApplyingBehaviorOperations(editor: Editor, fn: () => void) {
  CURRENT_OPERATION_ID.set(editor, defaultKeyGenerator())
  Editor.withoutNormalizing(editor, fn)
  CURRENT_OPERATION_ID.set(editor, undefined)
}

export function getCurrentOperationId(editor: Editor) {
  return CURRENT_OPERATION_ID.get(editor)
}

export function isApplyingBehaviorOperations(editor: Editor) {
  return getCurrentOperationId(editor) !== undefined
}
