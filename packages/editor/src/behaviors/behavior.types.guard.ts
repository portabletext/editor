import type {EditorSnapshot} from '../editor/editor-snapshot'

/**
 * @beta
 */
export type BehaviorGuard<TBehaviorEvent, TGuardResponse> = (payload: {
  snapshot: EditorSnapshot
  event: TBehaviorEvent
}) => TGuardResponse | false
