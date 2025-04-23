import type {EditorSnapshot} from '../editor/editor-snapshot'
import type {OmitFromUnion, PickFromUnion} from '../type-utils'
import type {PortableTextSlateEditor} from '../types/editor'
import type {
  AbstractBehaviorEventType,
  CustomBehaviorEvent,
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
      type: 'raise'
      event: SyntheticBehaviorEvent | CustomBehaviorEvent
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
  event: SyntheticBehaviorEvent,
): PickFromUnion<BehaviorAction, 'type', 'execute'> {
  return {type: 'execute', event}
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
  | OmitFromUnion<SyntheticBehaviorEvent, 'type', AbstractBehaviorEventType>
  | {type: 'noop'}
  | {type: 'effect'; effect: () => void}
) & {
  editor: PortableTextSlateEditor
}
