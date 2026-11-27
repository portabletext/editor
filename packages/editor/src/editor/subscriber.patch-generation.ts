import type {Patch} from '@portabletext/patches'
import {setChangeEntryPatches} from '../engine/core/change'
import {
  subscribeToOperations,
  type OperationEvent,
} from '../engine/core/operation-channel'
import type {EngineOperation} from '../engine/interfaces/operation'
import {addFieldLifecyclePatches} from '../internal-utils/field-lifecycle-patches'
import {operationToPatches} from '../internal-utils/operation-to-patches'
import {serializePath} from '../paths/serialize-path'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import type {EditorActor} from './editor-machine'

/**
 * Records the patches for each operation on its change, for `change` events and history.
 */
export function subscribePatchGeneration({
  editorActor,
  editor,
}: {
  editorActor: EditorActor
  editor: PortableTextEditorEngine
}): () => void {
  const unsubscribeBefore = subscribeToOperations(
    editor,
    (event) => {
      if (
        !event.isPatching &&
        (isRootReplacement(event.operation) ||
          addressesBlock(event.operation, editor.placeholderKey))
      ) {
        // A load or a remote root `set` replaces the whole value, even when
        // a block in it reuses the placeholder's key, and a remote patch
        // addressing the placeholder treats it as the host's block.
        editor.placeholderKey = undefined
      }

      if (
        event.isPatching &&
        event.operation.type !== 'set.selection' &&
        isRootBlock(editor, editor.placeholderKey)
      ) {
        // The event keeps the key as `placeholderKeyBefore`. Normalization
        // re-enters `apply` before this operation's `after` listener runs,
        // and a nested operation that also saw the key would send the
        // placeholder a second time.
        editor.placeholderKey = undefined
      }
    },
    {phase: 'before'},
  )

  const unsubscribeAfter = subscribeToOperations(editor, (event) => {
    if (!event.isPatching) {
      // Remote patch application and load apply operations with
      // patching suppressed; bail before computing anything else so those
      // hot paths pay nothing here.
      forgetRemovedPlaceholder(editor)
      return
    }

    const patches = addFieldLifecyclePatchesToEngine(editorActor, editor, event)

    const localPatches = patches.map((patch) => ({
      ...patch,
      origin: 'local' as const,
    }))

    setChangeEntryPatches(editor, event, localPatches)
  })

  return () => {
    unsubscribeBefore()
    unsubscribeAfter()
  }
}

function addFieldLifecyclePatchesToEngine(
  editorActor: EditorActor,
  editor: PortableTextEditorEngine,
  event: OperationEvent,
): Array<Patch> {
  const {initialValue, schema} = editorActor.getSnapshot().context
  const {operation, beforeValue, placeholderKeyBefore} = event

  const {patches, state} = addFieldLifecyclePatches(
    {
      placeholderKey: placeholderKeyBefore,
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
    {
      schema,
      initialValue,
      isInitialSync: editor.change?.cause.type === 'load',
    },
  )

  if (editor.placeholderKey === undefined) {
    // A placeholder that normalization inserted while this operation
    // applied must keep its key. Otherwise this hands back the key claimed
    // at entry when the operation emitted no patches.
    editor.placeholderKey = state.placeholderKey
  }
  forgetRemovedPlaceholder(editor)
  editor.lastSyncedValue = state.lastSyncedValue
  editor.valueUnsetEmitted = state.valueUnsetEmitted

  return patches
}

function forgetRemovedPlaceholder(editor: PortableTextEditorEngine) {
  if (!isRootBlock(editor, editor.placeholderKey)) {
    editor.placeholderKey = undefined
  }
}

function isRootBlock(
  editor: PortableTextEditorEngine,
  blockKey: string | undefined,
): boolean {
  return (
    blockKey !== undefined &&
    editor.blockIndexMap.has(serializePath([{_key: blockKey}]))
  )
}

function isRootReplacement(operation: EngineOperation): boolean {
  return (
    (operation.type === 'set' || operation.type === 'unset') &&
    operation.path.length === 0
  )
}

function addressesBlock(
  operation: EngineOperation,
  blockKey: string | undefined,
): boolean {
  if (blockKey === undefined || operation.type === 'set.selection') {
    return false
  }
  const [firstSegment] = operation.path
  return isKeyedSegment(firstSegment) && firstSegment._key === blockKey
}
