import type {Patch} from '@portabletext/patches'
import {withRemoteChanges} from '../engine-plugins/engine-plugin.remote-changes'
import {pluginWithoutHistory} from '../engine-plugins/engine-plugin.without-history'
import {withoutPatching} from '../engine-plugins/engine-plugin.without-patching'
import {normalize} from '../engine/editor/normalize'
import {withoutNormalizing} from '../engine/editor/without-normalizing'
import {createApplyPatch} from '../internal-utils/applyPatch'
import {debug} from '../internal-utils/debug'
import {safeStringify} from '../internal-utils/safe-json'
import {isEqualToEmptyEditor} from '../internal-utils/values'
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
  const context = editorActor.getSnapshot().context
  const applyPatch = createApplyPatch(context)

  let bufferedPatches: Patch[] = []

  const handleBufferedRemotePatches = () => {
    if (bufferedPatches.length === 0) {
      return
    }
    const patches = bufferedPatches
    bufferedPatches = []
    let batchChanged = false
    let rootMaterializingPatchApplied = false

    const engineWasEmptyOrPlaceholder =
      editor.snapshot.context.value.length === 0 ||
      (editor.snapshot.context.value.length === 1 &&
        isEqualToEmptyEditor(
          context.initialValue,
          editor.snapshot.context.value,
          context.schema,
        ))

    withRemoteChanges(editor, 'patches', () => {
      withoutNormalizing(editor, () => {
        withoutPatching(editor, () => {
          pluginWithoutHistory(editor, () => {
            for (const patch of patches) {
              try {
                const patchChanged = applyPatch(editor, patch)

                if (patchChanged) {
                  batchChanged = true

                  // A `setIfMissing` never counts on its own: it can leave
                  // the editor holding only its normalization-minted
                  // placeholder, and recording that would claim the host
                  // persists a block it does not have.
                  if (
                    (patch.type === 'insert' && patch.path.length === 1) ||
                    (patch.type === 'set' &&
                      patch.path.length === 0 &&
                      Array.isArray(patch.value) &&
                      patch.value.length > 0)
                  ) {
                    rootMaterializingPatchApplied = true
                  }
                }

                if (debug.syncPatch.enabled) {
                  if (patchChanged) {
                    debug.syncPatch(`(applied) ${safeStringify(patch, 2)}`)
                  } else {
                    debug.syncPatch(`(ignored) ${safeStringify(patch, 2)}`)
                  }
                }
              } catch (error) {
                console.error(
                  `Applying patch ${safeStringify(patch)} failed due to: ${error instanceof Error ? error.message : error}`,
                )
              }
            }
          })
        })
      })
      if (batchChanged) {
        normalize(editor)
        editor.onChange()

        if (engineWasEmptyOrPlaceholder && rootMaterializingPatchApplied) {
          editor.lastSyncedValue = editor.snapshot.context.value
          editor.valueUnsetEmitted = false
        }
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
