import type {PortableTextSpan} from '@sanity/types'
import type {EditorSelection} from '../types/editor'

/**
 * @internal
 */
export type Behaviour = {
  event: BehaviourEvent['type']
  guard: BehaviourGuard
  raise: RaiseBehaviourEvent
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
export type RaiseBehaviourEvent = ({
  context,
  event,
}: {
  context: BehaviourContext
  event: BehaviourEvent
}) => BehaviourEvent

/**
 * @internal
 */
export function defineBehaviour(behaviour: Behaviour): Behaviour {
  return behaviour
}
