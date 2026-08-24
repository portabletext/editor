import type {Patch} from '@portabletext/patches'
import {withRemoteChanges} from '../engine-plugins/engine-plugin.remote-changes'
import {pluginWithoutHistory} from '../engine-plugins/engine-plugin.without-history'
import {withoutPatching} from '../engine-plugins/engine-plugin.without-patching'
import {normalize} from '../engine/editor/normalize'
import {withoutNormalizing} from '../engine/editor/without-normalizing'
import {pointEquals} from '../engine/point/point-equals'
import {mapPointThroughSteps, type Step} from '../engine/point/step-mapper'
import {applySelect, resolveSelection} from '../internal-utils/apply-selection'
import {createApplyPatch} from '../internal-utils/applyPatch'
import {debug} from '../internal-utils/debug'
import {interpretTransaction} from '../internal-utils/interpret-transaction'
import {safeStringify} from '../internal-utils/safe-json'
import type {EditorSelection} from '../types/editor'
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

    const preApplySelection = editor.snapshot.context.selection
    const steps = preApplySelection
      ? interpretTransaction(editor.snapshot.context.value, patches)
      : null

    withRemoteChanges(editor, () => {
      withoutNormalizing(editor, () => {
        withoutPatching(editor, () => {
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
      })
      if (changed) {
        normalize(editor)

        if (preApplySelection && steps) {
          recoverSelection(editor, steps, preApplySelection)
        }

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

/**
 * Remote patches carry state deltas, not position mappings: a collaborator's
 * span merge or block merge arrives as delete + insert, so the per-operation
 * selection transforms collapse the local caret to a boundary instead of
 * following the content. `interpretTransaction` recognizes those
 * delete+insert pairs as moves, so mapping the pre-batch selection through
 * its steps can recover a caret the per-operation transforms lost.
 */
function recoverSelection(
  editor: PortableTextEditorEngine,
  steps: Array<Step>,
  preApplySelection: NonNullable<EditorSelection>,
): void {
  const mappedAnchor = mapPointThroughSteps(steps, preApplySelection.anchor)
  const mappedFocus = mapPointThroughSteps(steps, preApplySelection.focus)

  if (!mappedAnchor || !mappedFocus) {
    return
  }

  const currentSelection = editor.snapshot.context.selection
  const alreadyMatches =
    currentSelection !== null &&
    pointEquals(mappedAnchor, currentSelection.anchor) &&
    pointEquals(mappedFocus, currentSelection.focus)

  if (alreadyMatches) {
    return
  }

  const resolved = resolveSelection(editor, {
    anchor: mappedAnchor,
    focus: mappedFocus,
    backward: preApplySelection.backward,
  })

  if (resolved) {
    applySelect(editor, resolved)
  }
}
