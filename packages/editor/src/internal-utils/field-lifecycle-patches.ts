import {insert, setIfMissing, unset, type Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {EngineOperation} from '../engine/interfaces/operation'
import {isEqualValues} from './equality'
import {isEqualToEmptyEditor} from './values'

type FieldLifecycleState = {
  lastSyncedValue: Array<PortableTextBlock> | undefined
  valueUnsetEmitted: boolean
}

export function addFieldLifecyclePatches(
  state: FieldLifecycleState,
  edit: {
    operation: EngineOperation
    beforeValue: Array<PortableTextBlock>
    afterValue: Array<PortableTextBlock>
    patches: Array<Patch>
  },
  context: {
    schema: EditorSchema
    initialValue: Array<PortableTextBlock> | undefined
  },
): {patches: Array<Patch>; state: FieldLifecycleState} {
  const {operation, beforeValue, afterValue} = edit
  const {schema, initialValue} = context
  let lastSyncedValue = state.lastSyncedValue
  let valueUnsetEmitted = state.valueUnsetEmitted
  let patches = edit.patches

  const wasPlaceholder = isUnsavedPlaceholder(state, beforeValue, context)

  const isPlaceholder =
    afterValue.length === 1 &&
    isEqualToEmptyEditor(initialValue, afterValue, schema) &&
    !isEqualValues({schema}, lastSyncedValue, afterValue)

  if (wasPlaceholder && !isPlaceholder && operation.type !== 'set.selection') {
    patches = [insert(beforeValue, 'before', [0]), ...patches]
  }

  const isInsertIntoEmptyValue =
    operation.type === 'insert' && beforeValue.length === 0
  const isRootUnset = operation.type === 'unset' && operation.path.length === 0
  const becamePlaceholder =
    isPlaceholder && !wasPlaceholder && !isInsertIntoEmptyValue
  const becameEmpty =
    beforeValue.length > 0 && afterValue.length === 0 && !isRootUnset

  if (becamePlaceholder || becameEmpty) {
    patches = [...patches, unset([])]
  }

  if (wasPlaceholder && patches.length > 0) {
    patches = [setIfMissing([], []), ...patches]
    if (isEqualValues({schema}, lastSyncedValue, beforeValue)) {
      // Rebuilding right over the recorded value proves the recording
      // was a stale echo of the cleared state; keeping it would make the
      // next became-empty transition skip its `unset([])`.
      lastSyncedValue = undefined
    }
  }

  const [firstPatch] = patches
  if (
    beforeValue.length === 0 &&
    valueUnsetEmitted &&
    firstPatch &&
    !(
      (firstPatch.type === 'unset' && firstPatch.path.length === 0) ||
      ((firstPatch.type === 'setIfMissing' || firstPatch.type === 'set') &&
        firstPatch.path.length === 0)
    )
  ) {
    // A root `unset` earlier in this editor's emitted stream destroyed the
    // field: the store cannot apply patches into a destroyed field until
    // something rebuilds it, and these patches are neither the destroy nor
    // the rebuild themselves.
    patches = [setIfMissing([], []), ...patches]
  }

  for (const patch of patches) {
    if (patch.type === 'unset' && patch.path.length === 0) {
      valueUnsetEmitted = true
    } else if (
      (patch.type === 'setIfMissing' || patch.type === 'set') &&
      patch.path.length === 0
    ) {
      valueUnsetEmitted = false
    }
  }

  if (
    operation.type === 'insert' &&
    operation.path.length === 1 &&
    beforeValue.length === 0 &&
    isPlaceholder
  ) {
    // The block this `insert` puts into the empty field (an undo restoring
    // a deleted placeholder, say) looks like the local placeholder, but
    // the host now holds it. Without the record, the next edit would
    // insert it a second time.
    lastSyncedValue = afterValue
  }

  return {patches, state: {lastSyncedValue, valueUnsetEmitted}}
}

export function isUnsavedPlaceholder(
  state: FieldLifecycleState,
  value: Array<PortableTextBlock>,
  context: {
    schema: EditorSchema
    initialValue: Array<PortableTextBlock> | undefined
  },
): boolean {
  return (
    isEqualToEmptyEditor(context.initialValue, value, context.schema) &&
    // After this editor emits `unset([])`, its own stream must
    // re-materialize the field before targeting it again, no matter what
    // value sync recorded in between: a mirroring host's stale echo of
    // the cleared state syncs as a genuine write and would otherwise
    // pass the placeholder off as persisted content.
    (state.valueUnsetEmitted ||
      !isEqualValues({schema: context.schema}, state.lastSyncedValue, value))
  )
}
