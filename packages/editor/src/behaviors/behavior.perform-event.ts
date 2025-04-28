import type {Behavior, BehaviorEvent} from '.'
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
import type {InternalBehaviorAction} from './behavior.types.action'
import {
  isAbstractBehaviorEvent,
  isCustomBehaviorEvent,
  isNativeBehaviorEvent,
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

  const defaultAction =
    isCustomBehaviorEvent(event) ||
    isNativeBehaviorEvent(event) ||
    isAbstractBehaviorEvent(event)
      ? undefined
      : ({
          ...event,
          editor,
        } satisfies InternalBehaviorAction)

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

  if (eventBehaviors.length === 0) {
    if (!defaultAction) {
      return
    }

    withApplyingBehaviorActions(editor, () => {
      try {
        performAction({
          context: {
            keyGenerator,
            schema,
          },
          action: defaultAction,
        })
      } catch (error) {
        console.error(
          new Error(
            `Performing action "${defaultAction.type}" as a result of "${event.type}" failed due to: ${error.message}`,
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

    const shouldRun =
      eventBehavior.guard === undefined ||
      eventBehavior.guard({
        snapshot: guardSnapshot,
        event,
      })

    if (!shouldRun) {
      continue
    }

    // This Behavior now "owns" the event and we can consider the default
    // action prevented
    defaultBehaviorOverwritten = true

    for (const actionSet of eventBehavior.actions) {
      const actionsSnapshot = getSnapshot()

      const actions = actionSet(
        {
          snapshot: actionsSnapshot,
          event,
        },
        shouldRun,
      )

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

              performAction({
                context: {
                  keyGenerator,
                  schema,
                },
                action: {
                  ...action,
                  editor,
                },
              })

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

            if (isAbstractBehaviorEvent(action.event)) {
              nativeEventPrevented = true

              performEvent({
                mode: 'execute',
                behaviors,
                remainingEventBehaviors: behaviors,
                event: action.event,
                editor,
                keyGenerator,
                schema,
                getSnapshot,
                nativeEvent: undefined,
              })
            } else {
              const internalAction = {
                ...action.event,
                editor,
              }
              let actionFailed = false

              withApplyingBehaviorActions(editor, () => {
                try {
                  performAction({
                    context: {
                      keyGenerator,
                      schema,
                    },
                    action: internalAction,
                  })
                } catch (error) {
                  console.error(
                    new Error(
                      `Performing action "${action.event.type}" as a result of "${event.type}" failed due to: ${error.message}`,
                    ),
                  )
                  actionFailed = true
                }
              })

              if (actionFailed) {
                break
              }

              editor.onChange()
            }
          }
        })

        continue
      }

      for (const action of actions) {
        if (action.type === 'effect') {
          nativeEventPrevented = true

          performAction({
            context: {
              keyGenerator,
              schema,
            },
            action: {
              ...action,
              editor,
            },
          })

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

  if (!defaultBehaviorOverwritten && defaultAction) {
    nativeEvent?.preventDefault()

    withApplyingBehaviorActions(editor, () => {
      try {
        performAction({
          context: {keyGenerator, schema},
          action: defaultAction,
        })
      } catch (error) {
        console.error(
          new Error(
            `Performing action "${defaultAction.type}" as a result of "${event.type}" failed due to: ${error.message}`,
          ),
        )
      }
    })

    editor.onChange()
  } else if (nativeEventPrevented) {
    nativeEvent?.preventDefault()
  }
}
