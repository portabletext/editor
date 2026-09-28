import {hasRemoteFrame, isInNormalization} from '../engine/core/apply-context'
import {subscribeToOperations} from '../engine/core/operation-channel'
import {addFieldLifecyclePatches} from '../internal-utils/field-lifecycle-patches'
import {operationToPatches} from '../internal-utils/operation-to-patches'
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

    const intakeRepair =
      isInNormalization(event.context) && hasRemoteFrame(event.context)

    for (const patch of patches) {
      editorActor.send({
        type: 'internal.patch',
        patch: {...patch, origin: 'local'},
        operationId: event.undoStepId,
        value: editor.snapshot.context.value,
        intakeRepair,
      })
    }
  })
}
