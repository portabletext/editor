import type {Patch} from '@portabletext/patches'
import type {Editor} from '../interfaces/editor'
import {isInNormalization, isPlaceholder} from './apply-context'
import type {OperationEvent} from './operation-channel'

/**
 * One applied operation in a {@link Change}.
 */
export type ChangeEntry = {
  event: OperationEvent
  /**
   * The local patches for the operation, set by patch generation as the
   * apply completes.
   */
  patches: Array<Patch>
}

/**
 * Why a change was opened. Only the editor's entry points open a change,
 * and each names its cause: a Behavior event (a user action), remote
 * patches, the first value sync, or a registration that reshapes existing
 * content.
 */
export type ChangeCause =
  | {type: 'behavior event'}
  | {type: 'remote patches'}
  | {type: 'value sync'}
  | {type: 'registration'}

/**
 * One unit of work: every operation the engine applied for one cause,
 * normalization fixes included, in application order. The change commits
 * exactly once.
 *
 * Operation listeners see every operation live, as it applies; the change
 * only marks where the unit of work begins and ends.
 */
export type Change = {
  cause: ChangeCause
  entries: Array<ChangeEntry>
  entryByEvent: Map<OperationEvent, ChangeEntry>
  committed: boolean
}

export type ChangeListener = (change: Change) => void

/**
 * `remote`: content that arrived from outside. `correction`: a
 * normalization fix made while patching, which is local content the host
 * has to save. `edit`: everything else.
 */
export type ChangeEntryKind = 'edit' | 'correction' | 'remote'

export function getChangeEntryKind(
  change: Change,
  entry: ChangeEntry,
): ChangeEntryKind {
  switch (change.cause.type) {
    case 'remote patches':
    case 'value sync':
      // Remote content is applied without patching; what the editor then
      // applies while patching or as the placeholder for a field it emptied
      // is its own fix of that content.
      return entry.event.isPatching || isPlaceholder(entry.event.context)
        ? 'correction'
        : 'remote'
    case 'registration':
      return entry.event.isPatching ? 'correction' : 'edit'
    case 'behavior event':
      // A user action interleaves its own operations with the fixes they
      // trigger, and only the frame tells them apart.
      return isInNormalization(entry.event.context) && entry.event.isPatching
        ? 'correction'
        : 'edit'
  }
}

/**
 * Runs `fn` inside a new change for `cause` and commits it when `fn`
 * returns or throws. An entry point reached while a change with the same
 * cause type is open joins it. One reached through public API while a
 * change with another cause type is open, such as an `operation` listener
 * that sends a Behavior event during a value sync, gets its own change:
 * the open change is set aside like `resumeChange` does, and the new
 * change commits before the open one is restored.
 */
export function withChange(
  editor: Editor,
  cause: ChangeCause,
  fn: () => void,
): void {
  if (editor.change?.cause.type === cause.type) {
    fn()
    return
  }

  const change = createChange(cause)

  resumeChange(editor, change, () => {
    try {
      fn()
    } finally {
      commitChange(editor, change)
    }
  })
}

export function createChange(cause: ChangeCause): Change {
  return {cause, entries: [], entryByEvent: new Map(), committed: false}
}

/**
 * Runs `fn` inside `change`. A change open when `fn` starts is set aside
 * until `fn` returns.
 */
export function resumeChange<Result>(
  editor: Editor,
  change: Change,
  fn: () => Result,
): Result {
  if (editor.change === change) {
    return fn()
  }

  const interrupted = editor.change

  try {
    if (interrupted !== undefined) {
      // Public API can reach an entry point while a change with another
      // cause is open: a Behavior effect can start a value sync, which runs
      // on its own actor, and an `operation` listener can send a Behavior
      // event while a value sync applies. What the interrupted change
      // applied so far is published first, so the new change's operations
      // neither join it nor precede it.
      editor.change = undefined
      publishEntries(editor, interrupted)
    }

    editor.change = change

    return fn()
  } finally {
    // `fn` may have committed `change`, which detaches it.
    if (editor.change === change || editor.change === undefined) {
      editor.change = interrupted
    }
  }
}

export function commitChange(editor: Editor, change: Change): void {
  if (change.committed) {
    return
  }

  change.committed = true

  // Detached before committing: a listener that applies again needs a
  // cause of its own instead of adding to a change already committed.
  if (editor.change === change) {
    editor.change = undefined
  }

  // Only applies that complete are recorded, so a change whose applies
  // all threw changed nothing.
  if (change.entries.length > 0) {
    for (const listener of editor.changeListeners) {
      listener(change)
    }
  }
}

/**
 * Publishes the entries `change` has recorded so far as a committed change
 * of the same cause and leaves `change` open and empty.
 */
function publishEntries(editor: Editor, change: Change): void {
  if (change.entries.length === 0) {
    return
  }

  const published: Change = {...change, committed: true}
  change.entries = []
  change.entryByEvent = new Map()

  for (const listener of editor.changeListeners) {
    listener(published)
  }
}

/**
 * Every apply needs a cause. An apply outside a change throws under test
 * and is logged in development; in production it applies unrecorded.
 */
export function assertChangeOpen(editor: Editor, operation: {type: string}) {
  if (editor.change === undefined) {
    reportChangeError(
      `\`${operation.type}\` was applied outside a change. Only an entry point (a Behavior event, remote patches, a value sync or a registration) may open one.`,
    )
  }
}

function reportChangeError(message: string): void {
  // @ts-expect-error - dot notation required for Vite to replace at build time
  if (process.env.NODE_ENV === 'test') {
    throw new Error(message)
  }

  // @ts-expect-error - dot notation required for Vite to replace at build time
  if (process.env.NODE_ENV !== 'production') {
    console.error(new Error(message))
  }
}

/**
 * Where an operation starting now lands in the open change. A
 * normalization fix re-enters `apply`, so it starts after but completes
 * before the operation that triggered it: entries are inserted at their
 * start position once their apply completes, which puts the trigger ahead
 * of its fixes, and an apply that throws is never inserted.
 */
export function getChangePosition(editor: Editor): number | undefined {
  return editor.change?.entries.length
}

export function recordApply(
  editor: Editor,
  event: OperationEvent,
  position: number | undefined,
): void {
  const change = editor.change

  if (change === undefined || position === undefined) {
    return
  }

  const entry: ChangeEntry = {
    event,
    patches: [],
  }
  change.entries.splice(position, 0, entry)
  change.entryByEvent.set(event, entry)
}

export function setChangeEntryPatches(
  editor: Editor,
  event: OperationEvent,
  patches: Array<Patch>,
): void {
  const entry = editor.change?.entryByEvent.get(event)

  if (entry !== undefined) {
    entry.patches = patches
  }
}

export function subscribeToChanges(
  editor: Editor,
  listener: ChangeListener,
): () => void {
  editor.changeListeners = [...editor.changeListeners, listener]

  return () => {
    editor.changeListeners = editor.changeListeners.filter(
      (changeListener) => changeListener !== listener,
    )
  }
}
