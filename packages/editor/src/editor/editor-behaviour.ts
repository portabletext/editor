import type {PortableTextSpan} from '@sanity/types'
import type {EditorSelection} from '../types/editor'

/**
 * @internal
 */
export type Behaviour = {
  event: BehaviourEvent['type']
  guard: BehaviourGuard
  actions: EnqueueBeviourActions
  preventDefault: boolean
}

/**
 * @internal
 */
export type BehaviourContext = {
  schema: {
    decorators: Array<string>
  }
  selection: EditorSelection
  focusSpan?: PortableTextSpan
}

/**
 * @internal
 */
export type BehaviourEvent =
  | {
      type: 'insert text'
      text: string
    }
  | {
      type: 'insert span'
      text: string
      marks: Array<string>
    }

/**
 * @internal
 */
export type BehaviourGuard = ({
  context,
  event,
}: {
  event: BehaviourEvent
  context: BehaviourContext
}) => boolean

/**
 * @internal
 */
export type BehaviourAction =
  | {type: 'apply insert text'; params: {text: string}}
  | {type: 'apply insert span'; params: {text: string; marks: Array<string>}}
  | {type: 'raise'; event: BehaviourEvent}

/**
 * @internal
 */
export type EnqueueBeviourActions = ({
  context,
  event,
}: {
  context: BehaviourContext
  event: BehaviourEvent
}) => Array<BehaviourAction>

/**
 * @internal
 */
export function defineBehaviour(behaviour: Behaviour): Behaviour {
  return behaviour
}
