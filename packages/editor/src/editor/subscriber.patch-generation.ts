import {setChangeEntryPatches} from '../engine/core/change'
import {subscribeToOperations} from '../engine/core/operation-channel'
import {addFieldLifecyclePatches} from '../internal-utils/field-lifecycle-patches'
import {operationToPatches} from '../internal-utils/operation-to-patches'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {EditorActor} from './editor-machine'

/**
 * Converts every applied operation into `@portabletext/patches`, sends them
 * to the editor actor as `internal.patch` events and sets them on the
 * change recording the operation.
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

    const {initialValue, schema} = editorActor.getSnapshot().context
    const {operation, beforeValue} = event

    const {patches, state} = addFieldLifecyclePatches(
      {
        lastSyncedValue: editor.lastSyncedValue,
        valueUnsetEmitted: editor.valueUnsetEmitted,
      },
      {
        operation,
        beforeValue,
        afterValue: editor.snapshot.context.value,
        patches: operationToPatches(operation, {
          beforeValue,
          afterSnapshot: editor.snapshot,
        }),
      },
      {schema, initialValue},
    )

    editor.lastSyncedValue = state.lastSyncedValue
    editor.valueUnsetEmitted = state.valueUnsetEmitted

    const localPatches = patches.map((patch) => ({
      ...patch,
      origin: 'local' as const,
    }))

    setChangeEntryPatches(editor, event, localPatches)

    for (const patch of localPatches) {
      editorActor.send({
        type: 'internal.patch',
        patch,
        operationId: event.undoStepId,
        value: editor.snapshot.context.value,
      })
    }
  })
}
