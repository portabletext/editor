import type {EditorSnapshot} from '../editor/editor-snapshot'
import type {BehaviorAction} from './behavior.types.action'
import type {SyntheticBehaviorEvent} from './behavior.types.event'

const resolvers = new WeakMap<
  BehaviorAction,
  (snapshot: EditorSnapshot) => SyntheticBehaviorEvent
>()

export function raiseResolved(
  event: SyntheticBehaviorEvent,
  resolve: (snapshot: EditorSnapshot) => SyntheticBehaviorEvent,
): BehaviorAction {
  const action: BehaviorAction = {type: 'raise', event}
  resolvers.set(action, resolve)
  return action
}

export function getRaisedEvent(
  action: Extract<BehaviorAction, {type: 'raise'}>,
  getSnapshot: () => EditorSnapshot,
) {
  return resolvers.get(action)?.(getSnapshot()) ?? action.event
}
