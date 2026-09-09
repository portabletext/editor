import {
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import {subscribeToOperations} from '../engine/core/operation-channel'
import {isEqualValues} from '../internal-utils/equality'
import {
  insertNodePatch,
  textPatch,
} from '../internal-utils/operation-to-patches'
import {isEqualToEmptyEditor} from '../internal-utils/values'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {EditorActor} from './editor-machine'

/**
 * Converts every applied operation into `@portabletext/patches` and sends
 * them to the editor actor as `internal.patch` events.
 */
export function subscribePatchGeneration({
  editorActor,
  editor,
}: {
  editorActor: EditorActor
  editor: PortableTextEditorEngine
}): () => void {
  return subscribeToOperations(editor, (event) => {
    if (!event.isPatching) {
      // Remote patch application and value sync apply operations with
      // patching suppressed; bail before computing anything so those hot
      // paths pay nothing here.
      return
    }

    const operation = event.operation
    // The pre-apply value is needed to figure out the `_key` of deleted
    // nodes. The editor.snapshot.context.value would no longer contain
    // that information if the node is already deleted.
    const previousValue = event.beforeValue
    let patches: Patch[] = []

    const snapshot = editorActor.getSnapshot()
    const {initialValue, schema} = snapshot.context

    const editorWasEmpty =
      previousValue.length === 1 &&
      isEqualToEmptyEditor(initialValue, previousValue, schema) &&
      // After this editor emits `unset([])`, its own stream must
      // re-materialize the field before targeting it again, no matter what
      // value sync recorded in between: a mirroring host's echo of the
      // cleared state that has aged out of the emitted-values ledger
      // still syncs as a genuine write and would otherwise pass the
      // placeholder off as persisted content.
      (editor.valueUnsetEmitted ||
        !isEqualValues({schema}, editor.lastSyncedValue, previousValue))

    const editorIsEmpty =
      editor.snapshot.context.value.length === 1 &&
      isEqualToEmptyEditor(
        initialValue,
        editor.snapshot.context.value,
        schema,
      ) &&
      !isEqualValues(
        {schema},
        editor.lastSyncedValue,
        editor.snapshot.context.value,
      )

    // If the editor was empty and now isn't, insert the placeholder into it.
    if (
      editorWasEmpty &&
      !editorIsEmpty &&
      operation.type !== 'set.selection'
    ) {
      patches.push(insert(previousValue, 'before', [0]))
    }

    switch (operation.type) {
      case 'insert.text':
        patches = [
          ...patches,
          ...textPatch(editor.snapshot, operation, previousValue),
        ]
        break
      case 'remove.text':
        patches = [
          ...patches,
          ...textPatch(editor.snapshot, operation, previousValue),
        ]
        break
      case 'insert':
        patches = [...patches, ...insertNodePatch(operation)]
        break
      case 'set':
        patches = [...patches, set(operation.value, operation.path)]
        break
      case 'unset':
        patches = [...patches, unset(operation.path)]
        break
      default:
      // Do nothing
    }

    // Unset the value if a operation made the editor empty
    if (
      !editorWasEmpty &&
      editorIsEmpty &&
      ['set', 'unset', 'remove.text'].includes(operation.type)
    ) {
      patches = [...patches, unset([])]
    }

    // Prepend patches with setIfMissing if going from empty editor to something involving a patch.
    if (editorWasEmpty && patches.length > 0) {
      patches = [setIfMissing([], []), ...patches]
      if (isEqualValues({schema}, editor.lastSyncedValue, previousValue)) {
        // Rebuilding right over the recorded value proves the recording
        // was a stale echo of the cleared state; keeping it would make the
        // next became-empty transition skip its `unset([])`.
        editor.lastSyncedValue = undefined
      }
    }

    // Prepend patches with setIfMissing when a root `unset` earlier in this
    // editor's emitted stream destroyed the field: the store cannot apply
    // patches into a destroyed field until something rebuilds it, and these
    // patches are neither the destroy nor the rebuild themselves.
    const [firstPatch] = patches
    if (
      previousValue.length === 0 &&
      editor.valueUnsetEmitted &&
      firstPatch &&
      !(
        (firstPatch.type === 'unset' && firstPatch.path.length === 0) ||
        ((firstPatch.type === 'setIfMissing' || firstPatch.type === 'set') &&
          firstPatch.path.length === 0)
      )
    ) {
      patches = [setIfMissing([], []), ...patches]
    }

    // The stream's own truth about whether the field is currently
    // destroyed, derived after every prepend/append above has had its say:
    // a root `unset` destroys it, a root `setIfMissing` or `set` rebuilds
    // it, and nothing else changes the verdict.
    for (const patch of patches) {
      if (patch.type === 'unset' && patch.path.length === 0) {
        editor.valueUnsetEmitted = true
      } else if (
        (patch.type === 'setIfMissing' || patch.type === 'set') &&
        patch.path.length === 0
      ) {
        editor.valueUnsetEmitted = false
      }
    }

    // Emit all patches
    if (patches.length > 0) {
      for (const patch of patches) {
        editorActor.send({
          type: 'internal.patch',
          patch: {...patch, origin: 'local'},
          operationId: event.undoStepId,
          value: editor.snapshot.context.value,
        })
      }
    }
  })
}
