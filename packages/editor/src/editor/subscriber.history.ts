import {wholeNodeGuardState} from '../internal-utils/whole-node-guard-state'
import {getValue} from '../internal-utils/get-value'
/**
 * Makes the editor support undo/redo on the local state only. The undo/redo
 * steps are rebased past each operation a remote patch applies.
 */

import {hasRemoteFrame, isInNormalization} from '../engine/core/apply-context'
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
  let previousUndoStepId = editor.undoStepId

  subscriptions.push(() => {
    const subscription = editorActor.on('internal.apply', ({patches}) => {
      for (const patch of patches) {
        if (patch.origin === 'local') {
          continue
        }

        if (patch.type === 'unset' && patch.path.length === 0) {
          editor.history = {undos: [], redos: []}
          editor.withHistory = true
          return
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  })

  return subscribeToOperations(editor, (event) => {
    if (hasRemoteFrame(event.context)) {
      return
    }

    if (editorActor.getSnapshot().matches({'edit mode': 'read only'})) {
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

    if ((import.meta.env.VITE_HISTORY_CHECK === '1' || wholeNodeGuardState.enabled) && operation.type !== 'set.selection') {
      const targetPath = operation.type === 'insert' && operation.inverse ? operation.inverse.path : operation.path
      const before = getValue(event.beforeValue, targetPath as never)
      const after = getValue(editor.snapshot.context.value, targetPath as never)
      Object.assign(operation, {historyExpected: {
        before: operation.type === 'insert.text' || operation.type === 'remove.text' ? (before as any)?.text : before,
        after: operation.type === 'insert.text' || operation.type === 'remove.text' ? (after as any)?.text : after,
      }})
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
