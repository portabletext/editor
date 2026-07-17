import type {Patch} from '@portabletext/patches'
import {withRemoteChanges} from '../engine-plugins/engine-plugin.remote-changes'
import {pluginWithoutHistory} from '../engine-plugins/engine-plugin.without-history'
import {withoutPatching} from '../engine-plugins/engine-plugin.without-patching'
import {normalize} from '../engine/editor/normalize'
import {withoutNormalizing} from '../engine/editor/without-normalizing'
import {createApplyPatch} from '../internal-utils/applyPatch'
import {debug} from '../internal-utils/debug'
import {safeStringify} from '../internal-utils/safe-json'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {EditorActor} from './editor-machine'

/**
 * Applies incoming remote patches to the editor. Registered on the
 * `subscriptions` array before `subscribeHistory`'s remote-rebase handler —
 * activation order is subscription order.
 */
export function setupRemotePatches({
  editorActor,
  subscriptions,
  editor,
}: {
  editorActor: EditorActor
  subscriptions: Array<() => () => void>
  editor: PortableTextEditorEngine
}): void {
  const applyPatch = createApplyPatch(editorActor.getSnapshot().context)

  let bufferedPatches: Patch[] = []

  const handleBufferedRemotePatches = () => {
    if (bufferedPatches.length === 0) {
      return
    }
    const patches = bufferedPatches
    bufferedPatches = []
    let changed = false
    let failed = false

    // Remote patch batches are applied atomically. Operational patches from a
    // concurrent editor can reference a node this client has already changed —
    // e.g. a keyed `unset` for a span the sibling tab already removed throws
    // `node not found`. Dropping just that op and applying the rest of the
    // batch (the previous behaviour) leaves the tree inconsistent: the editors
    // diverge and broken Portable Text (an orphaned mark, a stale span) can be
    // persisted. So if any patch throws we discard the WHOLE batch and restore
    // the pre-batch value; the whole-value sync channel then reconciles to the
    // authoritative value — last-writer-wins for that edit, but never a crash
    // or a half-applied batch.
    //
    // Only thrown patches trigger a rollback. A patch that applies cleanly but
    // yields a value this client's schema doesn't recognise (an unknown
    // decorator or object `_type` from another client / a newer schema) is
    // valid remote data and is intentionally kept.
    const valueBefore = editor.snapshot.context.value

    withRemoteChanges(editor, () => {
      withoutNormalizing(editor, () => {
        withoutPatching(editor, () => {
          pluginWithoutHistory(editor, () => {
            for (const patch of patches) {
              try {
                if (applyPatch(editor, patch)) {
                  changed = true
                }

                if (debug.syncPatch.enabled) {
                  debug.syncPatch(`(applied) ${safeStringify(patch, 2)}`)
                }
              } catch (error) {
                failed = true
                debug.syncPatch(
                  `(failed — rolling back batch) ${safeStringify(patch)}: ${
                    error instanceof Error ? error.message : error
                  }`,
                )
                break
              }
            }
          })
        })
      })

      if (failed) {
        editor.snapshot.context.value = valueBefore
        return
      }

      if (changed) {
        normalize(editor)
        editor.onChange()
      }
    })
  }

  const handlePatches = ({patches}: {patches: Patch[]}) => {
    const remotePatches = patches.filter((patch) => patch.origin !== 'local')
    if (remotePatches.length === 0) {
      return
    }
    bufferedPatches = bufferedPatches.concat(remotePatches)
    handleBufferedRemotePatches()
  }

  subscriptions.push(() => {
    debug.syncPatch('subscribing to remote patches')
    const subscription = editorActor.on('patches', handlePatches)
    return () => {
      debug.syncPatch('unsubscribing to remote patches')
      subscription.unsubscribe()
    }
  })
}
