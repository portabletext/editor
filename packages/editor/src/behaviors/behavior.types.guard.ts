import type {EditorContext, EditorSnapshot} from '../editor/editor-snapshot'
import {Behavior} from './behavior.types.behavior'

/**
 * @beta
 */
export type BehaviorGuard<TBehaviorEvent, TGuardResponse> = (payload: {
  behaviors: Array<Behavior>
  /**
   * @deprecated
   * Use `snapshot` instead
   */
  context: EditorContext
  snapshot: EditorSnapshot
  event: TBehaviorEvent
}) => TGuardResponse | false
