import type {Patch} from '@portabletext/patches'
import {hasRemoteFrame, isInNormalization} from '../engine/core/apply-context'
import {setChangeEntryPatches} from '../engine/core/change'
import {
  subscribeToOperations,
  type OperationEvent,
} from '../engine/core/operation-channel'
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
      // Remote patch application and load apply operations with
      // patching suppressed; bail before computing anything so those hot
      // paths pay nothing here.
      return
    }

    const patches = addFieldLifecyclePatchesToEngine(
      editorActor,
      editor,
      event,
      'patch',
    )
    const changePatches = addFieldLifecyclePatchesToEngine(
      editorActor,
      editor,
      event,
      'change',
    )

    const localPatches = patches.map((patch) => ({
      ...patch,
      origin: 'local' as const,
    }))

    setChangeEntryPatches(
      editor,
      event,
      changePatches.map((patch) => ({...patch, origin: 'local' as const})),
    )

    for (const patch of localPatches) {
      editorActor.send({
        type: 'internal.patch',
        patch,
        operationId: event.undoStepId,
      })
    }
  })
}

function addFieldLifecyclePatchesToEngine(
  editorActor: EditorActor,
  editor: PortableTextEditorEngine,
  event: OperationEvent,
  channel: 'patch' | 'change',
): Array<Patch> {
  const {initialValue, schema} = editorActor.getSnapshot().context
  const {operation, beforeValue} = event
  const forChange = channel === 'change'
  const intakeRepair =
    forChange &&
    isInNormalization(event.context) &&
    hasRemoteFrame(event.context)

  const {patches, state} = addFieldLifecyclePatches(
    forChange
      ? {
          lastSyncedValue: editor.changeLastSyncedValue,
          valueUnsetEmitted: editor.changeValueUnsetEmitted,
        }
      : {
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
      intakeRepair,
    },
    {schema, initialValue, isInitialSync: editor.change?.cause.type === 'load'},
  )

  if (forChange) {
    editor.changeLastSyncedValue = state.lastSyncedValue
    editor.changeValueUnsetEmitted = state.valueUnsetEmitted
  } else {
    editor.lastSyncedValue = state.lastSyncedValue
    editor.valueUnsetEmitted = state.valueUnsetEmitted
  }

  return patches
}
