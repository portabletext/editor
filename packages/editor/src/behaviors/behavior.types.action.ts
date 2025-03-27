import type {EditorContext, EditorSnapshot} from '../editor/editor-snapshot'
import type {OmitFromUnion, PickFromUnion} from '../type-utils'
import type {PortableTextSlateEditor} from '../types/editor'
import {Behavior} from './behavior.types.behavior'
import type {
  CustomBehaviorEvent,
  InternalBehaviorEvent,
  SyntheticBehaviorEvent,
} from './behavior.types.event'

/**
 * @beta
 */
export type BehaviorAction =
  | SyntheticBehaviorEvent
  | RaiseBehaviorAction
  | {
      type: 'noop'
    }
  | {
      type: 'effect'
      effect: () => void
    }

export type RaiseBehaviorAction<
  TBehaviorEvent extends
    | InternalBehaviorEvent
    | SyntheticBehaviorEvent
    | CustomBehaviorEvent =
    | InternalBehaviorEvent
    | SyntheticBehaviorEvent
    | CustomBehaviorEvent,
> = {
  type: 'raise'
  event: TBehaviorEvent
}

/**
 * @beta
 */
export function raise<
  TBehaviorEvent extends
    | InternalBehaviorEvent
    | SyntheticBehaviorEvent
    | CustomBehaviorEvent =
    | InternalBehaviorEvent
    | SyntheticBehaviorEvent
    | CustomBehaviorEvent,
>(event: TBehaviorEvent): RaiseBehaviorAction {
  return {type: 'raise', event}
}

/**
 * @beta
 */
export type BehaviorActionSet<
  TBehaviorEvent,
  TGuardResponse,
  // TBehaviorAction extends BehaviorAction,
> = (
  payload: {
    behaviors: Array<Behavior>
    /**
     * @deprecated
     * Use `snapshot` instead
     */
    context: EditorContext
    snapshot: EditorSnapshot
    event: TBehaviorEvent
  },
  guardResponse: TGuardResponse,
) => Array<BehaviorAction>

export type InternalBehaviorAction = OmitFromUnion<
  BehaviorAction,
  'type',
  'raise'
> & {
  editor: PortableTextSlateEditor
}
