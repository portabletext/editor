import {createEditorDom} from '../editor/editor-dom'
import type {EditorSchema} from '../editor/editor-schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import {withApplyingBehaviorOperations} from '../editor/with-applying-behavior-operations'
import {withUndoStep} from '../editor/with-undo-step'
import {debugWithName} from '../internal-utils/debug'
import {performOperation} from '../operations/behavior.operations'
import type {PortableTextSlateEditor} from '../types/editor'
import {abstractBehaviors} from './behavior.abstract'
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
  sendBack,
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
  sendBack: (event: {type: 'set drag ghost'; ghost: HTMLElement}) => void
}) {
  debug(`(${mode}:${eventCategory(event)})`, JSON.stringify(event, null, 2))

  const eventBehaviors = [
    ...remainingEventBehaviors,
    ...abstractBehaviors,
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

    withApplyingBehaviorOperations(editor, () => {
      debug(`(execute:${eventCategory(event)})`, JSON.stringify(event, null, 2))

      performOperation({
        context: {
          keyGenerator,
          schema,
        },
        operation: {
          ...event,
          editor,
        },
      })
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
          dom: createEditorDom(sendBack, editor),
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
            dom: createEditorDom(sendBack, editor),
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

      nativeEventPrevented =
        actions.some(
          (action) => action.type === 'raise' || action.type === 'execute',
        ) || !actions.some((action) => action.type === 'forward')

      if (actions.some((action) => action.type === 'execute')) {
        // Since at least one action is about to `execute` changes in the editor,
        // we set up a new undo step.
        // All actions performed recursively from now will be squashed into this
        // undo step
        withUndoStep(editor, () => {
          for (const action of actions) {
            if (action.type === 'effect') {
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
                sendBack,
              })

              continue
            }

            if (action.type === 'raise') {
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
                sendBack,
              })

              continue
            }

            performEvent({
              mode: 'execute',
              behaviors,
              remainingEventBehaviors: [],
              event: action.event,
              editor,
              keyGenerator,
              schema,
              getSnapshot,
              nativeEvent: undefined,
              sendBack,
            })
          }
        })

        continue
      }

      for (const action of actions) {
        if (action.type === 'effect') {
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
            sendBack,
          })

          continue
        }

        if (action.type === 'raise') {
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
            sendBack,
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

    withApplyingBehaviorOperations(editor, () => {
      debug(`(execute:${eventCategory(event)})`, JSON.stringify(event, null, 2))

      performOperation({
        context: {keyGenerator, schema},
        operation: {
          ...event,
          editor,
        },
      })
    })

    editor.onChange()
  } else if (nativeEventPrevented) {
    nativeEvent?.preventDefault()
  }
}
