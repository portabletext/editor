/**
 * This plugin will make the editor support undo/redo on the local state only.
 * The undo/redo steps are rebased against incoming patches since the step occurred.
 */

import type {PortableTextBlock} from '@portabletext/schema'
import type {Operation} from 'slate'
import type {EditorActor} from '../editor/editor-machine'
import {isChangingRemotely} from '../editor/withChanges'
import {debugWithName} from '../internal-utils/debug'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {getRemotePatches} from './remote-patches'
import {isRedoing} from './slate-plugin.redoing'
import {isUndoing} from './slate-plugin.undoing'
import {isWithHistory, setWithHistory} from './slate-plugin.without-history'
import {createUndoSteps, getCurrentUndoStepId} from './undo-step'

const debug = debugWithName('plugin:history')

const UNDO_STEP_LIMIT = 1000

export function pluginHistory({
  editorActor,
  subscriptions,
}: {
  editorActor: EditorActor
  subscriptions: Array<() => () => void>
}): (editor: PortableTextSlateEditor) => PortableTextSlateEditor {
  return (editor: PortableTextSlateEditor) => {
    const remotePatches = getRemotePatches(editor)
    let previousSnapshot: Array<PortableTextBlock> | undefined = editor.value
    let previousUndoStepId = getCurrentUndoStepId(editor)

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
            debug(
              'Someone else cleared the content, resetting undo/redo history',
            )

            editor.history = {undos: [], redos: []}
            remotePatches.splice(0, remotePatches.length)
            setWithHistory(editor, true)
            reset = true
            return
          }

          remotePatches.push({
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

    editor.history = {undos: [], redos: []}

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
      if (isChangingRemotely(editor)) {
        apply(op)
        return
      }

      /**
       * We don't want to run any side effects when the editor is undoing or
       * redoing operations.
       */
      if (isUndoing(editor) || isRedoing(editor)) {
        apply(op)
        return
      }

      const withHistory = isWithHistory(editor)
      const currentUndoStepId = getCurrentUndoStepId(editor)

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
