/**
 * This plugin will make the editor support undo/redo on the local state only.
 * The undo/redo steps are rebased against incoming patches since the step occurred.
 */

import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorActor} from '../editor/editor-machine'
import {createUndoSteps} from '../editor/undo-step'
import type {Operation} from '../slate'
import type {PortableTextSlateEditor} from '../types/slate-editor'

const UNDO_STEP_LIMIT = 1000

export function createHistoryPlugin({
  editorActor,
  subscriptions,
}: {
  editorActor: EditorActor
  subscriptions: Array<() => () => void>
}): (editor: PortableTextSlateEditor) => PortableTextSlateEditor {
  return function historyPlugin(editor: PortableTextSlateEditor) {
    let previousSnapshot: Array<PortableTextBlock> | undefined = editor.children
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

    const {apply} = editor

    editor.apply = (op: Operation) => {
      if (editorActor.getSnapshot().matches({'edit mode': 'read only'})) {
        apply(op)
        return
      }

      /**
       * We don't want to run any side effects when the editor is processing
       * remote changes.
       */
      if (editor.isProcessingRemoteChanges) {
        apply(op)
        return
      }

      /**
       * We don't want to run any side effects when the editor is undoing or
       * redoing operations.
       */
      if (editor.isUndoing || editor.isRedoing) {
        apply(op)
        return
      }

      const withHistory = editor.withHistory
      const currentUndoStepId = editor.undoStepId

      if (!withHistory) {
        // If we are bypassing saving undo steps, then we can just move along.

        previousUndoStepId = currentUndoStepId

        apply(op)

        return
      }

      if (op.type !== 'set_selection') {
        // Clear the repo steps if any actual changes are made
        editor.history.redos = []
      }

      editor.history.undos = createUndoSteps({
        steps: editor.history.undos,
        op,
        editor,
        currentUndoStepId,
        previousUndoStepId,
      })

      // Make sure we don't exceed the maximum number of undo steps we want
      // to store.
      while (editor.history.undos.length > UNDO_STEP_LIMIT) {
        editor.history.undos.shift()
      }

      previousUndoStepId = currentUndoStepId

      apply(op)
    }

    return editor
  }
}
