import {EditorSnapshot} from '../editor/editor-snapshot'
import {BehaviorAction} from './behavior.types.action'
import {Behavior} from './behavior.types.behavior'
import {BehaviorEvent} from './behavior.types.event'

export function resolveEvent({
  behaviors,
  event,
  snapshot,
}: {
  behaviors: Array<Behavior>
  event: BehaviorEvent
  snapshot: EditorSnapshot
}) {
  // const defaultAction =
  //   isCustomBehaviorEvent(event) ||
  //   isNativeBehaviorEvent(event) ||
  //   isInternalBehaviorEvent(event)
  //     ? undefined
  //     : ({
  //         ...event,
  //         editor,
  //       } satisfies InternalBehaviorAction)

  const eventBehaviors = behaviors.filter((behavior) => {
    // Catches all events
    if (behavior.on === '*') {
      return true
    }

    const [listenedNamespace] =
      behavior.on.includes('*') && behavior.on.includes('.')
        ? behavior.on.split('.')
        : [undefined]
    const [eventNamespace] = event.type.includes('.')
      ? event.type.split('.')
      : [undefined]

    // Handles scenarios like a Behavior listening for `select.*` and the event
    // `select.block` is fired.
    if (
      listenedNamespace !== undefined &&
      eventNamespace !== undefined &&
      listenedNamespace === eventNamespace
    ) {
      return true
    }

    // Handles scenarios like a Behavior listening for `select.*` and the event
    // `select` is fired.
    if (
      listenedNamespace !== undefined &&
      eventNamespace === undefined &&
      listenedNamespace === event.type
    ) {
      return true
    }

    return behavior.on === event.type
  })

  const actions: Array<BehaviorAction> = []

  let behaviorOverwritten = false

  for (const eventBehavior of eventBehaviors) {
    const shouldRun =
      eventBehavior.guard === undefined ||
      eventBehavior.guard({
        behaviors,
        context: snapshot.context,
        snapshot,
        event,
      })

    if (!shouldRun) {
      continue
    }

    const actionSets = eventBehavior.actions.map((actionSet) =>
      actionSet(
        {
          behaviors,
          context: snapshot.context,
          snapshot,
          event,
        },
        shouldRun,
      ),
    )

    for (const actionSet of actionSets) {
      if (actionSet.length === 0) {
        continue
      }

      for (const action of actionSet) {
        behaviorOverwritten = behaviorOverwritten || action.type !== 'effect'
        actions.push(action)
      }
    }

    if (behaviorOverwritten) {
      break
    }
  }

  return actions
}
