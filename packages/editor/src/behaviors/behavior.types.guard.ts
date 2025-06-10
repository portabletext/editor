import type {EditorSnapshot} from '../editor/editor-snapshot'
import type {EditorDom} from '../internal-utils/selection-elements'

/**
 * @beta
 */
export type BehaviorGuard<TBehaviorEvent, TGuardResponse> = (payload: {
  snapshot: EditorSnapshot
  event: TBehaviorEvent
  dom: EditorDom
}) => TGuardResponse | false
