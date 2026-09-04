import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSelection} from '../../types/editor'
import type {Editor} from '../interfaces/editor'
import type {EngineOperation} from '../interfaces/operation'
import {getOrigin, type ApplyContextFrame} from './apply-context'

/**
 * The operation channel is the single place to observe every `EngineOperation` the
 * engine applies.
 *
 * Guarantees:
 *
 * - Listeners run synchronously, in subscription order.
 * - `before` listeners run before the operation touches the editor state,
 *   `after` listeners run once the operation (including any normalization it
 *   triggered) has been fully applied.
 * - Normalization fixes re-enter `editor.apply`, so a fix operation's events
 *   fire nested between the triggering operation's `before` and `after`
 *   events — a fix's `after` listeners run before the triggering
 *   operation's.
 */
export type OperationOrigin =
  | 'local'
  | 'remote'
  | 'undo'
  | 'redo'
  | 'normalization'

export type OperationEvent = {
  /**
   * The operation object is enriched in place during apply — `inverse` gets
   * populated and inserted nodes may be re-keyed — so `after` listeners
   * observe the final operation.
   */
  operation: EngineOperation
  /**
   * `editor.snapshot.context.value` captured at apply entry. Operations
   * replace the value array instead of mutating it, so this reference keeps
   * pointing at the pre-apply value.
   */
  beforeValue: Array<PortableTextBlock>
  /**
   * `editor.snapshot.context.selection` captured at apply entry. Selections
   * are replaced, not mutated, so this reference stays pre-apply.
   */
  beforeSelection: EditorSelection
  /**
   * Whether `editor.operations` already held unflushed operations at apply
   * entry.
   */
  operationsInProgress: boolean
  isPatching: boolean
  withHistory: boolean
  undoStepId: string | undefined
  /**
   * Derived from `applyContext`, for declarative filtering.
   */
  origin: OperationOrigin
  /**
   * A frozen snapshot of `editor.applyContext` at apply entry: the frame
   * stack `origin` was derived from.
   */
  context: ReadonlyArray<ApplyContextFrame>
}

export type OperationListener = (event: OperationEvent) => void

export type OperationPhase = 'before' | 'after'

export function subscribeToOperations(
  editor: Editor,
  listener: OperationListener,
  options?: {phase?: OperationPhase},
): () => void {
  const phase = options?.phase ?? 'after'

  // Copy-on-write: emits run twice per operation while subscriptions are
  // rare, so the listener arrays are replaced here instead of copied per
  // emit. Emit iterates the array reference it captured, so the listener
  // set is snapshotted at emit start either way.
  editor.operationListeners[phase] = [
    ...editor.operationListeners[phase],
    listener,
  ]

  return () => {
    const listeners = editor.operationListeners[phase]
    const index = listeners.indexOf(listener)

    if (index !== -1) {
      editor.operationListeners[phase] = [
        ...listeners.slice(0, index),
        ...listeners.slice(index + 1),
      ]
    }
  }
}

/**
 * Captures the operation together with the engine state that `after`
 * listeners can no longer read once the operation has been applied. All
 * engine flags are stable for the duration of a single apply call, so
 * capturing them at entry is equivalent to reading them at any point during
 * the apply.
 */
export function createOperationEvent(
  editor: Editor,
  operation: EngineOperation,
): OperationEvent {
  return {
    operation,
    beforeValue: editor.snapshot.context.value,
    beforeSelection: editor.snapshot.context.selection,
    operationsInProgress: editor.operations.length > 0,
    isPatching: Boolean(editor.isPatching),
    withHistory: Boolean(editor.withHistory),
    undoStepId: editor.undoStepId,
    origin: getOrigin(editor.applyContext),
    context: Object.freeze([...editor.applyContext]),
  }
}

export function emitOperationEvent(
  listeners: Array<OperationListener>,
  event: OperationEvent,
): void {
  // The listener arrays are copy-on-write (see `subscribeToOperations`),
  // so iterating the passed reference is safe against subscriptions and
  // unsubscriptions made by listeners during this pass.
  for (let index = 0; index < listeners.length; index++) {
    listeners[index]?.(event)
  }
}
