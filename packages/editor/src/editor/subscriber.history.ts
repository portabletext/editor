/**
 * Makes the editor support undo/redo on the local state only. The undo/redo
 * steps are rebased against incoming patches since the step occurred.
 */

import type {PortableTextBlock} from '@portabletext/schema'
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
  subscriptions,
  editor,
}: {
  editorActor: EditorActor
  subscriptions: Array<() => () => void>
  editor: PortableTextEditorEngine
}): () => void {
  let previousSnapshot: Array<PortableTextBlock> | undefined =
    editor.snapshot.context.value
  let previousUndoStepId = editor.undoStepId

  subscriptions.push(() => {
    const subscription = editorActor.on('patches', ({patches, snapshot}) => {
      let reset = false

      for (const patch of patches) {
        if (reset) {
          continue
        }

        if (patch.origin === 'local') {
          continue
        }

        if (patch.type === 'unset' && patch.path.length === 0) {
          editor.history = {undos: [], redos: []}
          editor.remotePatches.splice(0, editor.remotePatches.length)
          editor.withHistory = true
          reset = true
          return
        }

        editor.remotePatches.push({
          patch,
          time: new Date(),
          snapshot,
          previousSnapshot,
        })
      }

      previousSnapshot = snapshot
    })

    return () => {
      subscription.unsubscribe()
    }
  })

  return subscribeToOperations(editor, (event) => {
    if (editorActor.getSnapshot().matches({'edit mode': 'read only'})) {
      return
    }

    if (event.isProcessingRemoteChanges) {
      // We don't want to run any side effects when the editor is processing
      // remote changes.
      return
    }

    if (event.isUndoing || event.isRedoing) {
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

    const operation = event.operation

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
      isNormalizingNode: event.isNormalizingNode,
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
