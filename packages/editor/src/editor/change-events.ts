import {isPlaceholder} from '../engine/core/apply-context'
import {
  getChangeEntryKind,
  type Change,
  type ChangeEntry,
} from '../engine/core/change'
import {isDeepEqual} from '../internal-utils/equality'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {isPublicOperation, type Operation} from '../types/operation'
import type {ChangeEvent} from './relay'

/**
 * The `change` events for a committed change: its remote operations first,
 * then one local event with its local operations in application order.
 */
export function toChangeEvents(
  editor: PortableTextEditorEngine,
  change: Change,
): Array<ChangeEvent> {
  const entries = change.entries
  const events: Array<ChangeEvent> = []
  let value = editor.hostValue?.value
  if (!editor.hostValue) {
    value = editor.lastSyncedValue
  }
  let remoteValue = value
  for (const entry of entries) {
    const {event, patches} = entry
    if (event.operation.type === 'set.selection') {
      continue
    }
    const kind = getChangeEntryKind(change, entry)
    if (!(isPlaceholder(event.context) && patches.length === 0)) {
      value = event.afterValue
      if (kind === 'remote') {
        if (
          event.operation.type === 'unset' &&
          event.operation.path.length === 0
        ) {
          value = undefined
        }
      } else {
        for (const patch of patches) {
          if (patch.path.length === 0 && patch.type === 'unset') {
            value = undefined
          } else if (
            patch.path.length === 0 &&
            (patch.type === 'set' || patch.type === 'setIfMissing')
          ) {
            value = event.afterValue
          }
        }
      }
    }
    if (kind === 'remote') {
      remoteValue = value
    }
  }
  editor.hostValue = {value}

  const remoteOperations = entries.flatMap((entry) =>
    getChangeEntryKind(change, entry) === 'remote' && isReported(change, entry)
      ? [entry.event.operation]
      : [],
  )

  if (remoteOperations.length > 0 && hasRemoteContentChanged(editor, change)) {
    events.push({
      type: 'change',
      origin: 'remote',
      value: remoteValue,
      operations: remoteOperations,
    })
  }

  const localEntries = entries.filter(
    (entry): entry is ChangeEntry & {event: {operation: Operation}} =>
      getChangeEntryKind(change, entry) === 'local' &&
      isReported(change, entry),
  )

  if (localEntries.length > 0) {
    events.push({
      type: 'change',
      origin: 'local',
      value,
      operations: localEntries.map((entry) => entry.event.operation),
      patches: localEntries.flatMap((entry) => entry.patches),
    })
  }

  return events
}

/**
 * Whether any remote operation changed the content, comparing the value
 * each one started from with the value the next entry started from. A
 * fix the remote operation set off starts once the operation itself is
 * applied, so its start value is the remote operation's result.
 */
function hasRemoteContentChanged(
  editor: PortableTextEditorEngine,
  change: Change,
): boolean {
  const entries = change.entries

  return entries.some((entry, index) => {
    if (getChangeEntryKind(change, entry) !== 'remote') {
      return false
    }

    const valueAfter =
      entries.at(index + 1)?.event.beforeValue ?? editor.snapshot.context.value

    return !isDeepEqual(entry.event.beforeValue, valueAfter)
  })
}

/**
 * Selection changes and the first load's remote operations are applied
 * like any other operation but are not changes to report, and neither is
 * a placeholder the first load inserts: the one in the snapshot is never
 * reported. A local fix to the first load is.
 */
function isReported(
  change: Change,
  entry: ChangeEntry,
): entry is ChangeEntry & {event: {operation: Operation}} {
  if (!isPublicOperation(entry.event.operation)) {
    return false
  }

  if (change.cause.type !== 'load') {
    return true
  }

  return (
    getChangeEntryKind(change, entry) === 'local' &&
    !isPlaceholder(entry.event.context)
  )
}
