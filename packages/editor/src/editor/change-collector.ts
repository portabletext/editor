import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {
  hasRemoteFrame,
  isInNormalization,
  type ApplyContextFrame,
} from '../engine/core/apply-context'
import {
  subscribeToOperations,
  type OperationEvent,
} from '../engine/core/operation-channel'
import {isEqualValues} from '../internal-utils/equality'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {isPublicOperation, type Operation} from '../types/operation'
import type {ChangeEvent} from './relay'

/**
 * One applied operation, recorded when its apply starts: the `after`
 * listeners of normalization fixes run before the `after` listener of the
 * operation that triggered them, so only apply start gives application
 * order.
 */
type Entry = {
  kind: 'edit' | 'correction' | 'remote'
  operation: Operation | undefined
  patches: Array<Patch>
}

/**
 * Collects the operations the engine applies into `change` events and
 * emits them when the outermost unit of work finishes: a Behavior event
 * sent at depth 0, a value sync, a remote application bracket, or, for an
 * apply outside all of them, the apply itself.
 *
 * Operations split three ways by their apply context: remote operations,
 * normalization fixes made while patching (corrections) and everything
 * else (edits). A unit's remote change goes out first; its local changes
 * follow in application order, each run of consecutive edits or
 * consecutive corrections as its own change.
 */
export function createChangeCollector({
  editor,
  emit,
}: {
  editor: PortableTextEditorEngine
  emit: (event: ChangeEvent) => void
}) {
  let unitDepth = 0
  // Counted by the `before`/`after` operation listeners, so an apply that
  // throws leaves it raised. Only normalization re-enters `apply` from
  // inside another apply, so an apply with no `normalization` frame and no
  // open unit is outermost and resets it.
  let applyDepth = 0
  let entries: Array<Entry> = []
  let entryByEvent = new Map<OperationEvent, Entry>()
  // The content before the first remote operation since the last flush, so
  // a remote unit that leaves the content as it was emits nothing.
  let valueBeforeRemote: Array<PortableTextBlock> | undefined

  function flush() {
    // Detached before emitting: a listener that applies again starts a new
    // change instead of adding to one already delivered.
    const unitEntries = entries
    const remoteChanged =
      valueBeforeRemote !== undefined &&
      !isEqualValues(
        editor.snapshot.context,
        valueBeforeRemote,
        editor.snapshot.context.value,
      )
    entries = []
    entryByEvent = new Map()
    valueBeforeRemote = undefined

    const remoteOperations = unitEntries.flatMap((entry) =>
      entry.kind === 'remote' && entry.operation ? [entry.operation] : [],
    )

    if (remoteOperations.length > 0 && remoteChanged) {
      emit({type: 'change', origin: 'remote', operations: remoteOperations})
    }

    for (const run of localRuns(unitEntries)) {
      emit(
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
  }

  return {
    /**
     * Runs `fn` as one unit of work: everything applied inside it, at any
     * nesting, is emitted when the outermost unit returns.
     */
    withUnit(fn: () => void) {
      unitDepth++
      try {
        fn()
      } finally {
        unitDepth--
        if (unitDepth === 0) {
          applyDepth = 0
          flush()
        }
      }
    },
    addPatches(event: OperationEvent, patches: Array<Patch>) {
      const entry = entryByEvent.get(event)

      if (entry === undefined || entry.kind === 'remote') {
        return
      }

      entry.patches.push(...patches)
    },
    subscribe() {
      const unsubscribeBefore = subscribeToOperations(
        editor,
        (event) => {
          if (unitDepth === 0 && !isInNormalization(event.context)) {
            applyDepth = 0
          }
          applyDepth++

          if (
            valueBeforeRemote === undefined &&
            hasRemoteFrame(event.context) &&
            !isInNormalization(event.context)
          ) {
            valueBeforeRemote = event.beforeValue
          }

          const entry: Entry = {
            kind: entryKind(event),
            operation: undefined,
            patches: [],
          }
          entries.push(entry)
          entryByEvent.set(event, entry)
        },
        {phase: 'before'},
      )
      const unsubscribeAfter = subscribeToOperations(editor, (event) => {
        applyDepth--

        const entry = entryByEvent.get(event)

        if (
          entry !== undefined &&
          isPublicOperation(event.operation) &&
          !event.context.some((frame) => frame.kind === 'placeholder') &&
          !(entry.kind === 'remote' && isInitialSync(event.context))
        ) {
          entry.operation = event.operation
        }

        if (unitDepth === 0 && applyDepth === 0) {
          flush()
        }
      })

      return () => {
        unsubscribeBefore()
        unsubscribeAfter()
      }
    },
  }
}

/**
 * Groups a unit's local entries into runs of consecutive edits or
 * consecutive corrections, skipping entries that applied no public
 * operation (selection changes, the empty-editor placeholder).
 */
function localRuns(entries: Array<Entry>): Array<{
  kind: 'edit' | 'correction'
  operations: Array<Operation>
  patches: Array<Patch>
}> {
  const runs: Array<{
    kind: 'edit' | 'correction'
    operations: Array<Operation>
    patches: Array<Patch>
  }> = []

  for (const entry of entries) {
    if (entry.kind === 'remote' || entry.operation === undefined) {
      continue
    }

    const lastRun = runs.at(-1)

    if (lastRun !== undefined && lastRun.kind === entry.kind) {
      lastRun.operations.push(entry.operation)
      lastRun.patches.push(...entry.patches)
      continue
    }

    runs.push({
      kind: entry.kind,
      operations: [entry.operation],
      patches: [...entry.patches],
    })
  }

  return runs
}

function entryKind(event: OperationEvent): Entry['kind'] {
  if (isInNormalization(event.context) && event.isPatching) {
    return 'correction'
  }

  if (hasRemoteFrame(event.context)) {
    return 'remote'
  }

  return 'edit'
}

function isInitialSync(context: ReadonlyArray<ApplyContextFrame>): boolean {
  return context.some(
    (frame) => frame.kind === 'remote' && frame.source === 'initial-sync',
  )
}
