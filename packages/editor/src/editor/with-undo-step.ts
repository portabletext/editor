import type {Editor} from 'slate'
import {defaultKeyGenerator} from './key-generator'

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
