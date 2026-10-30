import type {Patch} from '@portabletext/patches'
import {
  getChangeEntryKind,
  type Change,
  type ChangeEntry,
} from '../engine/core/change'
import {isEqualValues} from '../internal-utils/equality'
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

  const remoteEntries = entries.filter(
    (entry) => getChangeEntryKind(change, entry) === 'remote',
  )
  const remoteOperations = remoteEntries.flatMap((entry) =>
    isReported(change, entry) ? [entry.event.operation] : [],
  )
  const valueBeforeRemote = remoteEntries.at(0)?.event.beforeValue

  if (
    remoteOperations.length > 0 &&
    valueBeforeRemote !== undefined &&
    !isEqualValues(
      editor.snapshot.context,
      valueBeforeRemote,
      editor.snapshot.context.value,
    )
  ) {
    events.push({
      type: 'change',
      origin: 'remote',
      operations: remoteOperations,
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

  for (const entry of change.entries) {
    const kind = getChangeEntryKind(change, entry)

    if (kind === 'remote' || !isReported(change, entry)) {
      continue
    }

    const operation = entry.event.operation
    const lastRun = runs.at(-1)

    if (lastRun !== undefined && lastRun.kind === kind) {
      lastRun.operations.push(operation)
      lastRun.patches.push(...entry.patches)
      continue
    }

    runs.push({kind, operations: [operation], patches: [...entry.patches]})
  }

  return runs
}

/**
 * Selection changes, the empty-editor placeholder and the first load's
 * remote operations are applied like any other operation but are not
 * changes to report. A correction to the first load is.
 */
function isReported(
  change: Change,
  entry: ChangeEntry,
): entry is ChangeEntry & {event: {operation: Operation}} {
  if (
    !isPublicOperation(entry.event.operation) ||
    entry.event.context.some((frame) => frame.kind === 'placeholder')
  ) {
    return false
  }

  return !(
    change.cause.type === 'value sync' &&
    change.cause.initial &&
    getChangeEntryKind(change, entry) === 'remote'
  )
}
