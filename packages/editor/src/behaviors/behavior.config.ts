import type {EditorPriority} from '../priority/priority.types'
import type {Behavior} from './behavior.types.behavior'

export type BehaviorConfig = {
  behavior: Behavior
  priority: EditorPriority
}
