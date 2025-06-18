import type {EditorDom} from '../editor/editor-dom'
import type {EditorSnapshot} from '../editor/editor-snapshot'

/**
 * @beta
 */
export type BehaviorGuard<TBehaviorEvent, TGuardResponse> = (payload: {
  snapshot: EditorSnapshot
  event: TBehaviorEvent
  dom: EditorDom
}) => TGuardResponse | false
