/**
 * This plugin will make the editor support undo/redo on the local state only.
 * The undo/redo steps are rebased against incoming patches since the step occurred.
 */

import type {PortableTextBlock} from '@portabletext/schema'
import {Path, type Editor, type Operation, type SelectionOperation} from 'slate'
import type {EditorActor} from '../editor/editor-machine'
import {isNormalizingNode} from '../editor/with-normalizing-node'
import {isChangingRemotely} from '../editor/withChanges'
import {debugWithName} from '../internal-utils/debug'
import {fromSlateValue} from '../internal-utils/values'
import type {PortableTextSlateEditor} from '../types/editor'
import {getRemotePatches} from './remote-patches'
import {isRedoing} from './slate-plugin.redoing'
import {isUndoing} from './slate-plugin.undoing'
import {isWithHistory, setWithHistory} from './slate-plugin.without-history'
import {getCurrentUndoStepId} from './undo-step'

const debug = debugWithName('plugin:history')

const UNDO_STEP_LIMIT = 1000

export interface Options {
  editorActor: EditorActor
  subscriptions: Array<() => () => void>
}

export function pluginHistory(
  options: Options,
): (editor: PortableTextSlateEditor) => PortableTextSlateEditor {
  const {editorActor} = options

  return (editor: PortableTextSlateEditor) => {
    let previousSnapshot: PortableTextBlock[] | undefined = fromSlateValue(
      editor.children,
      editorActor.getSnapshot().context.schema.block.name,
    )
    const remotePatches = getRemotePatches(editor)
    let previousUndoStepId = getCurrentUndoStepId(editor)

    options.subscriptions.push(() => {
      debug('Subscribing to patches')
      const sub = editorActor.on('patches', ({patches, snapshot}) => {
        let reset = false
        patches.forEach((patch) => {
          if (!reset && patch.origin !== 'local' && remotePatches) {
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
        })
        previousSnapshot = snapshot
      })
      return () => {
        debug('Unsubscribing to patches')
        sub.unsubscribe()
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

      const step = editor.history.undos.at(editor.history.undos.length - 1)

      if (!step) {
        // If the undo stack is empty, then we can just create a new step and
        // move along.

        editor.history.undos.push({
          operations: [
            ...(editor.selection === null
              ? []
              : [createSelectOperation(editor)]),
            op,
          ],
          timestamp: new Date(),
        })

        apply(op)

        previousUndoStepId = currentUndoStepId

        return
      }

      const selectingWithoutUndoStepId =
        op.type === 'set_selection' &&
        currentUndoStepId === undefined &&
        previousUndoStepId !== undefined
      const selectingWithDifferentUndoStepId =
        op.type === 'set_selection' &&
        currentUndoStepId !== undefined &&
        previousUndoStepId !== undefined &&
        previousUndoStepId !== currentUndoStepId

      const lastOp = step.operations.at(-1)
      const mergeOpIntoPreviousStep =
        editor.operations.length > 0
          ? currentUndoStepId === previousUndoStepId ||
            isNormalizingNode(editor)
          : selectingWithoutUndoStepId ||
              selectingWithDifferentUndoStepId ||
              (currentUndoStepId === undefined &&
                previousUndoStepId === undefined)
            ? shouldMerge(op, lastOp) ||
              (lastOp?.type === 'set_selection' && op.type === 'set_selection')
            : currentUndoStepId === previousUndoStepId ||
              isNormalizingNode(editor)

      if (mergeOpIntoPreviousStep) {
        step.operations.push(op)
      } else {
        editor.history.undos.push({
          operations: [
            ...(editor.selection === null
              ? []
              : [createSelectOperation(editor)]),
            op,
          ],
          timestamp: new Date(),
        })
      }

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

const shouldMerge = (op: Operation, prev: Operation | undefined): boolean => {
  if (op.type === 'set_selection') {
    return true
  }

  // Text input
  if (
    prev &&
    op.type === 'insert_text' &&
    prev.type === 'insert_text' &&
    op.offset === prev.offset + prev.text.length &&
    Path.equals(op.path, prev.path) &&
    op.text !== ' ' // Tokenize between words
  ) {
    return true
  }

  // Text deletion
  if (
    prev &&
    op.type === 'remove_text' &&
    prev.type === 'remove_text' &&
    op.offset + op.text.length === prev.offset &&
    Path.equals(op.path, prev.path)
  ) {
    return true
  }

  // Don't merge
  return false
}

function createSelectOperation(editor: Editor): SelectionOperation {
  return {
    type: 'set_selection',
    properties: {...editor.selection},
    newProperties: {...editor.selection},
  }
}
