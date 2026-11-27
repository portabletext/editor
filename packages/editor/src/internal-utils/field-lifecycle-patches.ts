import {insert, setIfMissing, unset, type Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {EngineOperation} from '../engine/interfaces/operation'
import {isEqualValues} from './equality'
import {isEqualToEmptyEditor} from './values'

type FieldLifecycleState = {
  placeholderKey: string | undefined
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
    isInitialSync?: boolean
    schema: EditorSchema
    initialValue: Array<PortableTextBlock> | undefined
  },
): {patches: Array<Patch>; state: FieldLifecycleState} {
  if (context.isInitialSync) {
    return {patches: edit.patches, state}
  }

  const {operation, beforeValue, afterValue} = edit
  const {schema, initialValue} = context
  let placeholderKey = state.placeholderKey
  let lastSyncedValue = state.lastSyncedValue
  let valueUnsetEmitted = state.valueUnsetEmitted
  let patches = edit.patches

  const placeholderIndex =
    placeholderKey === undefined
      ? -1
      : beforeValue.findIndex((block) => block._key === placeholderKey)
  const placeholder = beforeValue[placeholderIndex]

  if (placeholder && patches.length > 0) {
    const previousBlock = beforeValue[placeholderIndex - 1]
    patches = [
      setIfMissing([], []),
      previousBlock
        ? insert([placeholder], 'after', [{_key: previousBlock._key}])
        : insert([placeholder], 'before', [0]),
      ...patches,
    ]
    placeholderKey = undefined

    if (isEqualToEmptyEditor(initialValue, afterValue, schema)) {
      // `insertPatch` in `applyPatch.ts` tells the placeholder from a block
      // the host holds by this record. The host now holds this one.
      lastSyncedValue = afterValue
    } else if (isEqualValues({schema}, lastSyncedValue, beforeValue)) {
      lastSyncedValue = undefined
    }
  }

  const isInsertIntoEmptyValue =
    operation.type === 'insert' && beforeValue.length === 0
  const isRootUnset = operation.type === 'unset' && operation.path.length === 0
  const becameEmptyParagraph =
    !isInsertIntoEmptyValue &&
    isEqualToEmptyEditor(initialValue, afterValue, schema) &&
    !isEqualToEmptyEditor(initialValue, beforeValue, schema) &&
    !isEqualValues({schema}, lastSyncedValue, afterValue)
  const becameEmpty =
    beforeValue.length > 0 && afterValue.length === 0 && !isRootUnset

  if (becameEmptyParagraph || becameEmpty) {
    patches = [...patches, unset([])]
  }

  if (becameEmptyParagraph) {
    // The `unset([])` takes the remaining paragraph out of the host's value,
    // so from here on it is this editor's placeholder.
    placeholderKey = afterValue[0]?._key
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
    isEqualToEmptyEditor(initialValue, afterValue, schema)
  ) {
    // The `insert` hands the block to the host. Without the record,
    // `insertPatch` would take it for the placeholder.
    lastSyncedValue = afterValue
  }

  return {patches, state: {placeholderKey, lastSyncedValue, valueUnsetEmitted}}
}
