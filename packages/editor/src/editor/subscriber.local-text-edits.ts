import type {Patch} from '@portabletext/patches'
import {subscribeToOperations} from '../engine/core/operation-channel'
import {getValue} from '../internal-utils/get-value'
import {
  deletePendingLocalTextEditsInPath,
  getPendingLocalTextEditsKey,
  PENDING_LOCAL_TEXT_EDIT_MAX_AGE_MS,
  pruneStaleLocalTextEdits,
} from '../internal-utils/pending-local-text-edits'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {EditorActor} from './editor-machine'

export function subscribeLocalTextEdits({
  editorActor,
  subscriptions,
  editor,
}: {
  editorActor: EditorActor
  subscriptions: Array<() => () => void>
  editor: PortableTextEditorEngine
}): void {
  subscriptions.push(() => {
    let cleanupTimeout: ReturnType<typeof setTimeout> | undefined

    const scheduleCleanup = () => {
      if (cleanupTimeout !== undefined) {
        clearTimeout(cleanupTimeout)
        cleanupTimeout = undefined
      }

      if (editor.pendingLocalTextEdits.size === 0) {
        return
      }

      const now = Date.now()
      const earliestExpiration = Math.min(
        ...Array.from(
          editor.pendingLocalTextEdits.values(),
          (edit) => edit.lastEditTime + PENDING_LOCAL_TEXT_EDIT_MAX_AGE_MS + 1,
        ),
      )
      cleanupTimeout = setTimeout(
        () => {
          cleanupTimeout = undefined
          pruneStaleLocalTextEdits(editor.pendingLocalTextEdits, Date.now())
          scheduleCleanup()
        },
        Math.max(0, earliestExpiration - now),
      )
    }

    const patchSubscription = editorActor.on('patches', ({patches}) => {
      if (
        patches.some(
          (patch: Patch) =>
            (patch.type === 'set' || patch.type === 'unset') &&
            patch.path.length === 0,
        )
      ) {
        editor.pendingLocalTextEdits.clear()
        scheduleCleanup()
      }
    })

    const unsubscribeFromOperations = subscribeToOperations(editor, (event) => {
      const now = Date.now()
      pruneStaleLocalTextEdits(editor.pendingLocalTextEdits, now)

      const operation = event.operation
      if (
        operation.type === 'insert.text' ||
        operation.type === 'remove.text'
      ) {
        if (
          event.origin !== 'local' &&
          event.origin !== 'normalization' &&
          event.origin !== 'undo' &&
          event.origin !== 'redo'
        ) {
          return
        }

        const key = getPendingLocalTextEditsKey(operation.path)
        const existingEdit = editor.pendingLocalTextEdits.get(key)

        if (existingEdit) {
          existingEdit.lastEditTime = now
        } else {
          const baseText = getValue(event.beforeValue, [
            ...operation.path,
            'text',
          ])
          if (typeof baseText !== 'string') {
            return
          }

          editor.pendingLocalTextEdits.set(key, {
            path: [...operation.path],
            baseText,
            lastEditTime: now,
          })
        }

        scheduleCleanup()
        return
      }

      if (operation.type === 'set' || operation.type === 'unset') {
        deletePendingLocalTextEditsInPath(
          editor.pendingLocalTextEdits,
          operation.path,
        )
        scheduleCleanup()
      }
    })

    return () => {
      patchSubscription.unsubscribe()
      unsubscribeFromOperations()
      if (cleanupTimeout !== undefined) {
        clearTimeout(cleanupTimeout)
      }
    }
  })
}
