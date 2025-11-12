import type {Editor} from 'slate'
import {defaultKeyGenerator} from '../utils/key-generator'

const CURRENT_UNDO_STEP: WeakMap<Editor, {undoStepId: string} | undefined> =
  new WeakMap()

export function getCurrentUndoStepId(editor: Editor) {
  return CURRENT_UNDO_STEP.get(editor)?.undoStepId
}

export function createUndoStep(editor: Editor) {
  CURRENT_UNDO_STEP.set(editor, {
    undoStepId: defaultKeyGenerator(),
  })
}

export function clearUndoStep(editor: Editor) {
  CURRENT_UNDO_STEP.set(editor, undefined)
}
