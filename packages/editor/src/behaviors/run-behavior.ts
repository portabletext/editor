import type {EditorContext, EditorSnapshot} from '../editor/editor-snapshot'
import type {
  Behavior,
  BehaviorActionIntend,
  BehaviorEvent,
} from './behavior.types'

export function runBehavior(behavior: Behavior) {
  return function withPayload(payload: {
    context: EditorContext
    snapshot: EditorSnapshot
    event: BehaviorEvent
  }):
    | {
        actionSets: Array<Array<BehaviorActionIntend>>
        behaviorOverwritten: boolean
      }
    | undefined {
    const shouldRun = behavior.guard === undefined || behavior.guard(payload)

    if (!shouldRun) {
      return undefined
    }

    const actionSets = behavior.actions.map((actionSet) =>
      actionSet(payload, shouldRun),
    )

    const behaviorOverwritten = actionSets.reduce(
      (overwritten, actionIntends) => {
        return (
          overwritten ||
          (actionIntends.length > 0 &&
            actionIntends.some(
              (actionIntend) => actionIntend.type !== 'effect',
            ))
        )
      },
      false,
    )

    return {
      actionSets,
      behaviorOverwritten,
    }
  }
}
