import type {EditorContext, EditorSnapshot} from '../editor/editor-snapshot'

/**
 * @beta
 */
export type BehaviorGuard<TBehaviorEvent, TGuardResponse> = (payload: {
  /**
   * @deprecated
   * Use `snapshot` instead
   */
  context: EditorContext
  snapshot: EditorSnapshot
  event: TBehaviorEvent
}) => TGuardResponse | false
