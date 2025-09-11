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

/**
 * @beta
 */
export function execute(
  event: SyntheticBehaviorEvent,
): PickFromUnion<BehaviorAction, 'type', 'execute'> {
  return {type: 'execute', event}
}

/**
 * @beta
 */
export function forward(
  event: NativeBehaviorEvent | SyntheticBehaviorEvent | CustomBehaviorEvent,
): PickFromUnion<BehaviorAction, 'type', 'forward'> {
  return {type: 'forward', event}
}

/**
 * @beta
 */
export function raise(
  event: SyntheticBehaviorEvent | CustomBehaviorEvent,
): PickFromUnion<BehaviorAction, 'type', 'raise'> {
  return {type: 'raise', event}
}

/**
 * @beta
 */
export function effect(
  effect: PickFromUnion<BehaviorAction, 'type', 'effect'>['effect'],
): PickFromUnion<BehaviorAction, 'type', 'effect'> {
  return {type: 'effect', effect}
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
