import type {Patch} from '@portabletext/patches'
import {
  isPlaceholder,
  isRepairSentAfterChange,
} from '../engine/core/apply-context'
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
 * then its local operations in application order, each run of consecutive
 * edits or consecutive corrections as its own event.
 */
export function toChangeEvents(
  editor: PortableTextEditorEngine,
  change: Change,
): Array<ChangeEvent> {
  const entries = change.entries
  const events: Array<ChangeEvent> = []

  const remoteOperations = entries.flatMap((entry) =>
    getChangeEntryKind(change, entry) === 'remote' && isReported(change, entry)
      ? [entry.event.operation]
      : [],
  )

  if (remoteOperations.length > 0 && hasRemoteContentChanged(editor, change)) {
    events.push({
      type: 'change',
      origin: 'remote',
      operations: remoteOperations,
    })
  }

  // Entries the engine never held are removed from the host's value by
  // patches alone, ahead of every other local change.
  if (change.removalPatches?.length) {
    events.push({
      type: 'change',
      origin: 'local',
      operations: [],
      patches: change.removalPatches,
      correction: true,
    })
  }

  for (const run of localRuns(change)) {
    events.push(
      run.kind === 'correction'
        ? {
            type: 'change',
            origin: 'local',
            operations: run.operations,
            patches: run.patches,
            correction: true,
          }
        : {
            type: 'change',
            origin: 'local',
            operations: run.operations,
            patches: run.patches,
          },
    )
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

function localRuns(change: Change): Array<{
  kind: 'edit' | 'correction'
  operations: Array<Operation>
  patches: Array<Patch>
}> {
  const runs: Array<{
    kind: 'edit' | 'correction'
    operations: Array<Operation>
    patches: Array<Patch>
  }> = []

  const patchesSentAfterChange: Array<Patch> = []

  for (const entry of change.entries) {
    const kind = getChangeEntryKind(change, entry)

    if (kind === 'remote' || !isReported(change, entry)) {
      continue
    }

    const operation = entry.event.operation
    const patches = isRepairSentAfterChange(entry.event.context)
      ? []
      : entry.patches
    const lastRun = runs.at(-1)

    if (isRepairSentAfterChange(entry.event.context)) {
      patchesSentAfterChange.push(...entry.patches)
    }

    if (lastRun !== undefined && lastRun.kind === kind) {
      lastRun.operations.push(operation)
      lastRun.patches.push(...patches)
      continue
    }

    runs.push({kind, operations: [operation], patches: [...patches]})
  }

  // A value sync's own entries are all corrections, so they form one run,
  // and the `patch` events the sync sends for its repairs go out after
  // every patch the change generated.
  runs.at(-1)?.patches.push(...patchesSentAfterChange)

  return runs
}

/**
 * Selection changes and the first load's remote operations are applied
 * like any other operation but are not changes to report, and neither is
 * a placeholder a value sync inserts: the one in the snapshot is never
 * reported. A correction to the first load is.
 */
function isReported(
  change: Change,
  entry: ChangeEntry,
): entry is ChangeEntry & {event: {operation: Operation}} {
  if (!isPublicOperation(entry.event.operation)) {
    return false
  }

  if (change.cause.type !== 'value sync') {
    return true
  }

  if (!change.cause.initial) {
    return !(change.cause.reset && isPlaceholder(entry.event.context))
  }

  return (
    getChangeEntryKind(change, entry) !== 'remote' &&
    !isPlaceholder(entry.event.context)
  )
}
