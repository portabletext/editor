import type {EditorSnapshot} from '../editor/editor-snapshot'
import type {PickFromUnion} from '../type-utils'
import type {PortableTextSlateEditor} from '../types/editor'
import type {
  AbstractBehaviorEvent,
  CustomBehaviorEvent,
  SyntheticBehaviorEvent,
} from './behavior.types.event'

/**
 * @beta
 */
export type BehaviorAction =
  | {
      type: 'execute'
      event:
        | AbstractBehaviorEvent
        | SyntheticBehaviorEvent
        | CustomBehaviorEvent
    }
  | {
      type: 'raise'
      event:
        | AbstractBehaviorEvent
        | SyntheticBehaviorEvent
        | CustomBehaviorEvent
    }
  | {
      type: 'noop'
    }
  | {
      type: 'effect'
      effect: () => void
    }

/**
 * @beta
 */
export function execute(
  event: AbstractBehaviorEvent | SyntheticBehaviorEvent | CustomBehaviorEvent,
): PickFromUnion<BehaviorAction, 'type', 'execute'> {
  return {type: 'execute', event}
}

/**
 * @beta
 */
export function raise(
  event: AbstractBehaviorEvent | SyntheticBehaviorEvent | CustomBehaviorEvent,
): PickFromUnion<BehaviorAction, 'type', 'raise'> {
  return {type: 'raise', event}
}

/**
 * @beta
 */
export function effect(
  effect: () => void,
): PickFromUnion<BehaviorAction, 'type', 'effect'> {
  return {type: 'effect', effect}
}

/**
 * @beta
 */
export function noop(): PickFromUnion<BehaviorAction, 'type', 'noop'> {
  return {type: 'noop'}
}

/**
 * @beta
 */
export type BehaviorActionSet<TBehaviorEvent, TGuardResponse> = (
  payload: {
    snapshot: EditorSnapshot
    event: TBehaviorEvent
  },
  guardResponse: TGuardResponse,
) => Array<BehaviorAction>

export type InternalBehaviorAction = (
  | SyntheticBehaviorEvent
  | {type: 'noop'}
  | {type: 'effect'; effect: () => void}
) & {
  editor: PortableTextSlateEditor
}
