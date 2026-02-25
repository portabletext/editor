import type {EditorDom} from '../editor/editor-dom'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import type {PickFromUnion} from '../type-utils'
import type {
  CustomBehaviorEvent,
  ExternalBehaviorEvent,
  NativeBehaviorEvent,
  SyntheticBehaviorEvent,
} from './behavior.types.event'

/**
 * Callback for the `reconcile` action.
 *
 * Receives a fresh snapshot reflecting the editor state after all preceding
 * actions in the same action set have been processed. Returns an array of
 * actions that will be executed in the same undo step.
 *
 * @beta
 */
export type ReconcileCallback = (payload: {
  snapshot: EditorSnapshot
}) => Array<
  | PickFromUnion<BehaviorAction, 'type', 'raise'>
  | PickFromUnion<BehaviorAction, 'type', 'execute'>
>

/**
 * @beta
 */
export type BehaviorAction =
  | {
      type: 'execute'
      event: SyntheticBehaviorEvent
    }
  | {
      type: 'forward'
      event: NativeBehaviorEvent | SyntheticBehaviorEvent | CustomBehaviorEvent
    }
  | {
      type: 'raise'
      event: SyntheticBehaviorEvent | CustomBehaviorEvent
    }
  | {
      type: 'effect'
      effect: (payload: {
        /**
         * Send a Behavior Event back into the Editor.
         *
         * @example
         * ```ts
         * defineBehavior({
         *   on: '...',
         *   actions: [
         *     () => [
         *       effect(({send}) => {
         *         doSomethingAsync()
         *           .then(() => {
         *             send({
         *               type: '...',
         *             })
         *           })
         *       })
         *     ],
         *   ],
         * })
         * ```
         */
        send: (event: ExternalBehaviorEvent) => void
      }) => void
    }
  | {
      type: 'reconcile'
      reconcile: ReconcileCallback
    }

/**
 * Directly executes an event, bypassing all Behavior matching.
 *
 * Use `execute` when you want to perform an action without triggering any
 * Behaviors. The event is executed immediately as a direct operation.
 *
 * @example
 * ```ts
 * defineBehavior({
 *   on: 'insert.text',
 *   guard: ({event}) => event.text === 'a',
 *   actions: [() => [execute({type: 'insert.text', text: 'b'})]],
 * })
 * ```
 *
 * @beta
 */
export function execute(
  event: SyntheticBehaviorEvent,
): PickFromUnion<BehaviorAction, 'type', 'execute'> {
  return {type: 'execute', event}
}

/**
 * Forwards an event to the next Behavior(s) in the current chain.
 *
 * Use `forward` to pass an event to succeeding Behaviors without starting a
 * fresh lookup. This is useful for intercepting events, performing side
 * effects, and then letting the default handling continue.
 *
 * **Key rule:** When forwarding to a different event type, only Behaviors that
 * were already in the remaining chain AND match the new type will run. This
 * means cross-type `forward` is mostly useful for falling through to default
 * Behaviors, not for triggering user-defined Behaviors of a different type.
 *
 * To trigger all Behaviors for a different event type, use {@link raise}
 * instead.
 *
 * @example
 * ```ts
 * // Intercept and forward same event type
 * defineBehavior({
 *   on: 'insert.text',
 *   actions: [({event}) => [effect(logEvent), forward(event)]],
 * })
 *
 * // Forward to default handling of different event type
 * defineBehavior({
 *   on: 'clipboard.paste',
 *   actions: [
 *     ({event}) => {
 *       const text = event.originEvent.dataTransfer?.getData('text/plain')
 *       return text ? [forward({type: 'insert.text', text})] : []
 *     },
 *   ],
 * })
 * ```
 *
 * @beta
 */
export function forward(
  event: NativeBehaviorEvent | SyntheticBehaviorEvent | CustomBehaviorEvent,
): PickFromUnion<BehaviorAction, 'type', 'forward'> {
  return {type: 'forward', event}
}

/**
 * Raises an event, triggering a fresh lookup of all Behaviors.
 *
 * Use `raise` when you want to trigger an event "from scratch", including all
 * Behaviors that match the event type. This is the appropriate action when you
 * want to trigger Behaviors for a different event type.
 *
 * If no Behavior matches the raised event, synthetic events will fall through
 * to their default operation.
 *
 * @example
 * ```ts
 * // Raise a custom event that triggers other Behaviors
 * defineBehavior({
 *   on: 'insert.text',
 *   guard: ({event}) => event.text === 'a',
 *   actions: [() => [raise({type: 'custom.specialInsert'})]],
 * })
 *
 * // Raise a different event type (fresh lookup includes all Behaviors)
 * defineBehavior({
 *   on: 'clipboard.paste',
 *   actions: [
 *     ({event}) => {
 *       const text = event.originEvent.dataTransfer?.getData('text/plain')
 *       return text ? [raise({type: 'insert.text', text})] : []
 *     },
 *   ],
 * })
 * ```
 *
 * @beta
 */
export function raise(
  event: SyntheticBehaviorEvent | CustomBehaviorEvent,
): PickFromUnion<BehaviorAction, 'type', 'raise'> {
  return {type: 'raise', event}
}

/**
 * Performs a side effect.
 *
 * Use `effect` for logging, analytics, async operations, or other side effects.
 *
 * **Note:** Using `effect` alone (without `forward`) will stop event
 * propagation. To perform a side effect while allowing the default Behavior
 * to continue, combine `effect` with `forward`.
 *
 * The effect callback receives a `send` function that can be used to send
 * events back to the editor asynchronously.
 *
 * @example
 * ```ts
 * // Log events while preserving default Behavior
 * defineBehavior({
 *   on: 'insert.text',
 *   actions: [({event}) => [effect(() => console.log(event)), forward(event)]],
 * })
 *
 * // Effect alone stops propagation (native event is cancelled)
 * defineBehavior({
 *   on: 'keyboard.keydown',
 *   actions: [() => [effect(() => console.log('key pressed'))]],
 * })
 *
 * // Async effect that sends an event later
 * defineBehavior({
 *   on: 'custom.save',
 *   actions: [
 *     () => [
 *       effect(async ({send}) => {
 *         await saveDocument()
 *         send({type: 'custom.saved'})
 *       }),
 *     ],
 *   ],
 * })
 * ```
 *
 * @beta
 */
export function effect(
  effect: PickFromUnion<BehaviorAction, 'type', 'effect'>['effect'],
): PickFromUnion<BehaviorAction, 'type', 'effect'> {
  return {type: 'effect', effect}
}

/**
 * Reads a fresh snapshot after preceding actions and returns correction actions.
 *
 * Use `reconcile` when you need to inspect the editor state after a `forward`
 * or other action has been processed, and then apply corrections based on the
 * actual result. The corrections are applied in the same undo step as the
 * preceding actions.
 *
 * The callback receives a fresh snapshot reflecting the current editor state
 * and must return an array of `raise` or `execute` actions.
 *
 * @example
 * ```ts
 * // Forward text insertion, then fix marks based on actual state
 * defineBehavior({
 *   on: 'insert.text',
 *   actions: [
 *     ({event}) => [
 *       forward(event),
 *       reconcile(({snapshot}) => {
 *         const block = selectors.getFocusTextBlock(snapshot)
 *         if (!block) return []
 *         // Compute corrections based on actual post-forward state
 *         return [raise({type: 'decorator.add', decorator: 'strong', at: range})]
 *       }),
 *     ],
 *   ],
 * })
 * ```
 *
 * @beta
 */
export function reconcile(
  reconcile: ReconcileCallback,
): PickFromUnion<BehaviorAction, 'type', 'reconcile'> {
  return {type: 'reconcile', reconcile}
}

/**
 * @beta
 */
export type BehaviorActionSet<TBehaviorEvent, TGuardResponse> = (
  payload: {
    snapshot: EditorSnapshot
    event: TBehaviorEvent
    dom: EditorDom
  },
  guardResponse: TGuardResponse,
) => Array<BehaviorAction>
