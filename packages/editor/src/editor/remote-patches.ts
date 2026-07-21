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

    withRemoteChanges(editor, () => {
      // `withoutPatching` must wrap `withoutNormalizing`, not the other way
      // around: `withoutNormalizing` runs a final normalize pass on exit,
      // and with the previous nesting that pass ran after patching was
      // restored. Normalization fallout of remote application (e.g. merging
      // adjacent same-mark spans a collaborator's formatting toggle left
      // behind) was then emitted as local patches and pushed back to the
      // server. Every receiving client pushed its own competing "cleanup"
      // of the same structure, and the interleaved merges corrupted the
      // shared document (fragments deleted after their text had moved,
      // text applied twice). Normalization fallout of remote changes must
      // stay local; the originating client runs the same normalization as
      // a genuine local edit and pushes it, so the server still converges
      // to the normalized form.
      //
      // NOTE (draft): blanket suppression conflicts with the self-solving
      // documents contract; see the PR description for the enumeration and
      // the proposed hold-and-discard alternative.
      withoutPatching(editor, () => {
        withoutNormalizing(editor, () => {
          pluginWithoutHistory(editor, () => {
            for (const patch of patches) {
              try {
                changed = applyPatch(editor, patch)

                if (debug.syncPatch.enabled) {
                  if (changed) {
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
        if (changed) {
          normalize(editor)
        }
      })
      if (changed) {
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
