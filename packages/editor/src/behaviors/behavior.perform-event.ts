import type {Behavior, BehaviorEvent} from '.'
import {performAction} from '../behavior-actions/behavior.actions'
import type {EditorSchema} from '../editor/editor-schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import {
  withApplyingBehaviorActions,
  withApplyingBehaviorActionSet,
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
      ? 'abstract'
      : isCustomBehaviorEvent(event)
        ? 'custom'
        : 'synthetic'
}

export function performEvent({
  mode,
  behaviors,
  event,
  editor,
  keyGenerator,
  schema,
  getSnapshot,
  nativeEvent,
}: {
  mode: 'raise' | 'execute'
  behaviors: Array<Behavior>
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
  debug(`(${eventCategory(event)})`, JSON.stringify(event, null, 2))

  const defaultAction =
    isCustomBehaviorEvent(event) ||
    isNativeBehaviorEvent(event) ||
    isAbstractBehaviorEvent(event)
      ? undefined
      : ({
          ...event,
          editor,
        } satisfies InternalBehaviorAction)

  const eventBehaviors = (
    mode === 'raise' ? [...behaviors, ...defaultBehaviors] : behaviors
  ).filter((behavior) => {
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

  let behaviorOverwritten = false

  for (const eventBehavior of eventBehaviors) {
    const shouldRun =
      eventBehavior.guard === undefined ||
      eventBehavior.guard({
        snapshot: guardSnapshot,
        event,
      })

    if (!shouldRun) {
      continue
    }

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

      behaviorOverwritten =
        behaviorOverwritten ||
        actions.some((action) => action.type !== 'effect')

      withApplyingBehaviorActionSet(editor, () => {
        for (const action of actions) {
          if (action.type === 'raise') {
            performEvent({
              mode,
              behaviors:
                mode === 'execute'
                  ? isCustomBehaviorEvent(action.event)
                    ? [...behaviors, ...defaultBehaviors]
                    : defaultBehaviors
                  : [...behaviors, ...defaultBehaviors],
              event: action.event,
              editor,
              keyGenerator,
              schema,
              getSnapshot,
              nativeEvent: undefined,
            })

            continue
          }

          if (action.type === 'execute') {
            if (
              isAbstractBehaviorEvent(action.event) ||
              isCustomBehaviorEvent(action.event)
            ) {
              performEvent({
                mode: 'execute',
                behaviors: isCustomBehaviorEvent(action.event)
                  ? [...behaviors, ...defaultBehaviors]
                  : defaultBehaviors,
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

            continue
          }

          const internalAction = {
            ...action,
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
                  `Performing action "${internalAction.type}" as a result of "${event.type}" failed due to: ${error.message}`,
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
      })
    }

    if (behaviorOverwritten) {
      nativeEvent?.preventDefault()
      break
    }
  }

  if (!behaviorOverwritten) {
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
  }
}
