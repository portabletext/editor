import type {EditorContext, EditorSnapshot} from '../editor/editor-snapshot'
import type {OmitFromUnion, PickFromUnion} from '../type-utils'
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
  | SyntheticBehaviorEvent
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
export function raise(
  event: AbstractBehaviorEvent | SyntheticBehaviorEvent | CustomBehaviorEvent,
): PickFromUnion<BehaviorAction, 'type', 'raise'> {
  return {type: 'raise', event}
}

/**
 * @beta
 */
export type BehaviorActionSet<TBehaviorEvent, TGuardResponse> = (
  payload: {
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
