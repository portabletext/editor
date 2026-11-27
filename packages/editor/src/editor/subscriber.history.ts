/**
 * Makes the editor support undo/redo on the local state only. The undo/redo
 * steps are rebased against incoming patches since the step occurred.
 */

import {
  hasRemoteFrame,
  isInNormalization,
  isPlaceholder,
} from '../engine/core/apply-context'
import {subscribeToOperations} from '../engine/core/operation-channel'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {EditorActor} from './editor-machine'
import {createUndoSteps} from './undo-step'

const UNDO_STEP_LIMIT = 1000

/**
 * Builds undo steps from applied operations.
 */
export function subscribeHistory({
  editorActor,
  editor,
}: {
  editorActor: EditorActor
  editor: PortableTextEditorEngine
}): () => void {
  let previousUndoStepId = editor.undoStepId

  return subscribeToOperations(editor, (event) => {
    if (editorActor.getSnapshot().matches({'edit mode': 'read only'})) {
      return
    }

    if (hasRemoteFrame(event.context)) {
      return
    }

    if (event.origin === 'undo' || event.origin === 'redo') {
      // We don't want to run any side effects when the editor is undoing or
      // redoing operations.
      return
    }

    const currentUndoStepId = event.undoStepId

    if (!event.withHistory) {
      // If we are bypassing saving undo steps, then we can just move along.
      previousUndoStepId = currentUndoStepId
      return
    }

    const operation =
      event.operation.type === 'insert' && isPlaceholder(event.context)
        ? {...event.operation, patching: false as const}
        : event.operation

    const isNoOp =
      ((operation.type === 'set' ||
        operation.type === 'unset' ||
        operation.type === 'insert') &&
        !operation.inverse) ||
      ((operation.type === 'insert.text' || operation.type === 'remove.text') &&
        operation.text.length === 0)

    if (isNoOp) {
      previousUndoStepId = currentUndoStepId
      return
    }

    if (operation.type !== 'set.selection') {
      // Clear the redo steps if any actual changes are made
      if (editor.history.redos.length > 0) {
        editor.history.redos = []
      }
    }

    editor.history.undos = createUndoSteps({
      steps: editor.history.undos,
      op: operation,
      currentUndoStepId,
      previousUndoStepId,
      operationsInProgress: event.operationsInProgress,
      isInNormalization: isInNormalization(event.context),
      selectionBeforeApply: event.beforeSelection,
    })

    // Make sure we don't exceed the maximum number of undo steps we want
    // to store.
    while (editor.history.undos.length > UNDO_STEP_LIMIT) {
      editor.history.undos.shift()
    }

    previousUndoStepId = currentUndoStepId
  })
}
