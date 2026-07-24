import type {Patch} from '@portabletext/patches'
import {subscribeToOperations} from '../engine/core/operation-channel'
import {
  getPendingLocalTextEditsKey,
  pruneStaleLocalTextEdits,
} from '../internal-utils/pending-local-text-edits'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {EditorActor} from './editor-machine'

/**
 * Tracks local text edits, so an incoming remote `diffMatchPatch` for the
 * same span can be positioned relative to this editor's own edit instead
 * of only against whatever `@sanity/diff-match-patch`'s fuzzy string match
 * finds in the live, already-locally-edited text. See
 * `internal-utils/applyPatch.ts`'s `diffMatchPatch` handler for where this
 * ledger gets read, and `pruneStaleLocalTextEdits` for how entries expire.
 */
export function subscribeLocalTextEdits({
  editorActor,
  subscriptions,
  editor,
}: {
  editorActor: EditorActor
  subscriptions: Array<() => () => void>
  editor: PortableTextEditorEngine
}): () => void {
  subscriptions.push(() => {
    const subscription = editorActor.on('patches', ({patches}) => {
      if (
        patches.some(
          (patch: Patch) => patch.type === 'unset' && patch.path.length === 0,
        )
      ) {
        editor.pendingLocalTextEdits.clear()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  })

  return subscribeToOperations(editor, (event) => {
    // Normalization triggered by a local edit is still part of that local
    // edit from the user's point of view — e.g. pasting text next to an
    // existing span inserts a new span node, then normalization merges it
    // into the existing one via an `insert.text` that carries the pasted
    // text itself. `isProcessingRemoteChanges` takes precedence in
    // `createOperationEvent`, so normalization triggered by a remote patch
    // is already excluded here (it comes through as `origin: 'remote'`).
    if (event.origin !== 'local' && event.origin !== 'normalization') {
      return
    }

    const operation = event.operation
    if (operation.type !== 'insert.text' && operation.type !== 'remove.text') {
      return
    }

    const key = getPendingLocalTextEditsKey(operation.path)
    const now = Date.now()
    const edits = pruneStaleLocalTextEdits(
      editor.pendingLocalTextEdits.get(key) ?? [],
      now,
    )
    edits.push({
      type: operation.type,
      offset: operation.offset,
      text: operation.text,
      time: now,
    })
    editor.pendingLocalTextEdits.set(key, edits)
  })
}
