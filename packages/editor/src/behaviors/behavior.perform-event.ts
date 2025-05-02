import {performAction} from '../behavior-actions/behavior.actions'
import type {EditorSchema} from '../editor/editor-schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import {
  withApplyingBehaviorActions,
  withUndoStep,
} from '../editor/with-applying-behavior-actions'
import {debugWithName} from '../internal-utils/debug'
import type {PortableTextSlateEditor} from '../types/editor'
import {defaultBehaviors} from './behavior.default'
import type {BehaviorAction} from './behavior.types.action'
import type {Behavior} from './behavior.types.behavior'
import {
  isAbstractBehaviorEvent,
  isCustomBehaviorEvent,
  isNativeBehaviorEvent,
  isSyntheticBehaviorEvent,
  type BehaviorEvent,
} from './behavior.types.event'

const debug = debugWithName('behaviors:event')

function eventCategory(event: BehaviorEvent) {
  return isNativeBehaviorEvent(event)
    ? 'native'
    : isAbstractBehaviorEvent(event)
      ? 'synthetic'
      : isCustomBehaviorEvent(event)
        ? 'custom'
        : 'synthetic'
}

export function performEvent({
  mode,
  behaviors,
  remainingEventBehaviors,
  event,
  editor,
  keyGenerator,
  schema,
  getSnapshot,
  nativeEvent,
}: {
  mode: 'raise' | 'execute' | 'forward'
  behaviors: Array<Behavior>
  remainingEventBehaviors: Array<Behavior>
  event: BehaviorEvent
  editor: PortableTextSlateEditor
  keyGenerator: () => string
  schema: EditorSchema
  getSnapshot: () => EditorSnapshot
  nativeEvent:
    | {
        preventDefault: () => void
      }
    | undefined
}) {
  debug(`(${mode}:${eventCategory(event)})`, JSON.stringify(event, null, 2))

  const eventBehaviors = [
    ...remainingEventBehaviors,
    ...defaultBehaviors,
  ].filter((behavior) => {
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

  if (eventBehaviors.length === 0 && isSyntheticBehaviorEvent(event)) {
    nativeEvent?.preventDefault()

    withApplyingBehaviorActions(editor, () => {
      try {
        debug(
          `(execute:${eventCategory(event)})`,
          JSON.stringify(event, null, 2),
        )

        performAction({
          context: {
            keyGenerator,
            schema,
          },
          action: {
            ...event,
            editor,
          },
        })
      } catch (error) {
        console.error(
          new Error(
            `Executing "${event.type}" failed due to: ${error.message}`,
          ),
        )
      }
    })

    editor.onChange()

    return
  }

  const guardSnapshot = getSnapshot()

  let nativeEventPrevented = false
  let defaultBehaviorOverwritten = false
  let eventBehaviorIndex = -1

  for (const eventBehavior of eventBehaviors) {
    eventBehaviorIndex++

    let shouldRun = false

    try {
      shouldRun =
        eventBehavior.guard === undefined ||
        eventBehavior.guard({
          snapshot: guardSnapshot,
          event,
        })
    } catch (error) {
      console.error(
        new Error(
          `Evaluating guard for "${event.type}" failed due to: ${error.message}`,
        ),
      )
    }

    if (!shouldRun) {
      continue
    }

    // This Behavior now "owns" the event and we can consider the default
    // action prevented
    defaultBehaviorOverwritten = true

    for (const actionSet of eventBehavior.actions) {
      const actionsSnapshot = getSnapshot()

      let actions: Array<BehaviorAction> = []

      try {
        actions = actionSet(
          {
            snapshot: actionsSnapshot,
            event,
          },
          shouldRun,
        )
      } catch (error) {
        console.error(
          new Error(
            `Evaluating actions for "${event.type}" failed due to: ${error.message}`,
          ),
        )
      }

      if (actions.length === 0) {
        continue
      }

      if (actions.some((action) => action.type === 'execute')) {
        // Since at least one action is about to `execute` changes in the editor,
        // we set up a new undo step.
        // All actions performed recursively from now will be squashed into this
        // undo step
        withUndoStep(editor, () => {
          for (const action of actions) {
            if (action.type === 'effect') {
              nativeEventPrevented = true

              try {
                action.effect()
              } catch (error) {
                console.error(
                  new Error(
                    `Executing effect as a result of "${event.type}" failed due to: ${error.message}`,
                  ),
                )
              }

              continue
            }

            if (action.type === 'forward') {
              const remainingEventBehaviors = eventBehaviors.slice(
                eventBehaviorIndex + 1,
              )

              performEvent({
                mode: 'forward',
                behaviors,
                remainingEventBehaviors: remainingEventBehaviors,
                event: action.event,
                editor,
                keyGenerator,
                schema,
                getSnapshot,
                nativeEvent,
              })

              continue
            }

            if (action.type === 'raise') {
              nativeEventPrevented = true

              performEvent({
                mode: 'raise',
                behaviors,
                remainingEventBehaviors: behaviors,
                event: action.event,
                editor,
                keyGenerator,
                schema,
                getSnapshot,
                nativeEvent,
              })

              continue
            }

            nativeEventPrevented = true

            performEvent({
              mode: 'execute',
              behaviors,
              remainingEventBehaviors: isAbstractBehaviorEvent(action.event)
                ? behaviors
                : [],
              event: action.event,
              editor,
              keyGenerator,
              schema,
              getSnapshot,
              nativeEvent: undefined,
            })
          }
        })

        continue
      }

      for (const action of actions) {
        if (action.type === 'effect') {
          nativeEventPrevented = true

          try {
            action.effect()
          } catch (error) {
            console.error(
              new Error(
                `Executing effect as a result of "${event.type}" failed due to: ${error.message}`,
              ),
            )
          }

          continue
        }

        if (action.type === 'forward') {
          const remainingEventBehaviors = eventBehaviors.slice(
            eventBehaviorIndex + 1,
          )

          performEvent({
            mode: 'forward',
            behaviors,
            remainingEventBehaviors: remainingEventBehaviors,
            event: action.event,
            editor,
            keyGenerator,
            schema,
            getSnapshot,
            nativeEvent,
          })

          continue
        }

        if (action.type === 'raise') {
          nativeEventPrevented = true

          performEvent({
            mode: 'raise',
            behaviors,
            remainingEventBehaviors: behaviors,
            event: action.event,
            editor,
            keyGenerator,
            schema,
            getSnapshot,
            nativeEvent,
          })

          continue
        }

        if (action.type === 'execute') {
          console.error('Unexpected action type: `execute`')
        }
      }
    }

    break
  }

  if (!defaultBehaviorOverwritten && isSyntheticBehaviorEvent(event)) {
    nativeEvent?.preventDefault()

    withApplyingBehaviorActions(editor, () => {
      try {
        debug(
          `(execute:${eventCategory(event)})`,
          JSON.stringify(event, null, 2),
        )

        performAction({
          context: {keyGenerator, schema},
          action: {
            ...event,
            editor,
          },
        })
      } catch (error) {
        console.error(
          new Error(
            `Executing "${event.type}" failed due to: ${error.message}`,
          ),
        )
      }
    })

    editor.onChange()
  } else if (nativeEventPrevented) {
    nativeEvent?.preventDefault()
  }
}
