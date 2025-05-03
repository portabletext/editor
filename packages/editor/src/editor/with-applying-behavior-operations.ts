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

////////

const CURRENT_UNDO_STEP: WeakMap<Editor, {undoStepId: string} | undefined> =
  new WeakMap()

export function withUndoStep(editor: Editor, fn: () => void) {
  const current = CURRENT_UNDO_STEP.get(editor)

  if (current) {
    fn()
    return
  }

  CURRENT_UNDO_STEP.set(
    editor,
    current ?? {
      undoStepId: defaultKeyGenerator(),
    },
  )
  fn()
  CURRENT_UNDO_STEP.set(editor, undefined)
}

export function getCurrentUndoStepId(editor: Editor) {
  return CURRENT_UNDO_STEP.get(editor)?.undoStepId
}
