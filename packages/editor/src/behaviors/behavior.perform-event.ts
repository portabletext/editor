import type {Converter} from '../converters/converter.types'
import {createEditorDom} from '../editor/editor-dom'
import type {EditorSchema} from '../editor/editor-schema'
import {createEditorSnapshot} from '../editor/editor-snapshot'
import {debug} from '../internal-utils/debug'
import {performOperation} from '../operations/operation.perform'
import {withPerformingBehaviorOperation} from '../slate-plugins/slate-plugin.performing-behavior-operation'
import {withoutNormalizingConditional} from '../slate-plugins/slate-plugin.without-normalizing-conditional'
import type {PickFromUnion} from '../type-utils'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {defaultKeyGenerator} from '../utils/key-generator'
import {abstractBehaviors} from './behavior.abstract'
import type {BehaviorAction} from './behavior.types.action'
import type {Behavior} from './behavior.types.behavior'
import {
  isAbstractBehaviorEvent,
  isCustomBehaviorEvent,
  isNativeBehaviorEvent,
  isSyntheticBehaviorEvent,
  type BehaviorEvent,
  type ExternalBehaviorEvent,
} from './behavior.types.event'

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
  converters,
  keyGenerator,
  readOnly,
  schema,
  nativeEvent,
  sendBack,
}: {
  mode: 'send' | 'raise' | 'execute' | 'forward'
  behaviors: Array<Behavior>
  remainingEventBehaviors: Array<Behavior>
  event: BehaviorEvent
  editor: PortableTextSlateEditor
  converters: Array<Converter>
  keyGenerator: () => string
  readOnly: boolean
  schema: EditorSchema
  nativeEvent:
    | {
        preventDefault: () => void
      }
    | undefined
  sendBack: (
    event: {type: 'set drag ghost'; ghost: HTMLElement} | ExternalBehaviorEvent,
  ) => void
}) {
  if (mode === 'send' && !isNativeBehaviorEvent(event)) {
    editor.undoStepId = defaultKeyGenerator()
  }

  debug.behaviors(
    `(${mode}:${eventCategory(event)})`,
    JSON.stringify(event, null, 2),
  )

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

    if (mode === 'send') {
      editor.undoStepId = undefined
    }

    withPerformingBehaviorOperation(editor, () => {
      debug.operation(JSON.stringify(event, null, 2))

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

    if (mode === 'send') {
      editor.onChange()
    }

    return
  }

  const guardSnapshot = createEditorSnapshot({
    converters,
    editor,
    keyGenerator,
    readOnly,
    schema,
  })

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
          `Evaluating guard for "${event.type}" failed due to: ${error instanceof Error ? error.message : error}`,
        ),
      )
    }

    if (!shouldRun) {
      continue
    }

    // This Behavior now "owns" the event and we can consider the default
    // action prevented
    defaultBehaviorOverwritten = true

    if (eventBehavior.actions.length === 0) {
      nativeEventPrevented = true
    }

    let actionSetIndex = -1

    for (const actionSet of eventBehavior.actions) {
      actionSetIndex++

      const actionsSnapshot = createEditorSnapshot({
        converters,
        editor,
        keyGenerator,
        readOnly,
        schema,
      })

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
            `Evaluating actions for "${event.type}" failed due to: ${error instanceof Error ? error.message : error}`,
          ),
        )
      }

      if (actions.length === 0) {
        continue
      }

      nativeEventPrevented =
        actions.some(
          (action) =>
            action.type === 'raise' ||
            action.type === 'execute' ||
            action.type === 'reconcile',
        ) || !actions.some((action) => action.type === 'forward')

      let undoStepCreated = false

      if (actionSetIndex > 0) {
        // Since there are multiple action sets
        editor.undoStepId = defaultKeyGenerator()

        undoStepCreated = true
      }

      if (
        !undoStepCreated &&
        actions.some((action) => action.type === 'execute')
      ) {
        // Since at least one action is about to `execute` changes in the editor,
        // we set up a new undo step.
        // All actions performed recursively from now will be squashed into this
        // undo step
        editor.undoStepId = defaultKeyGenerator()

        undoStepCreated = true
      }

      const actionTypes = actions.map((action) => action.type)
      const uniqueActionTypes = new Set(actionTypes)

      // The set of actions are all `raise` actions
      const raiseGroup =
        actionTypes.length > 1 &&
        uniqueActionTypes.size === 1 &&
        uniqueActionTypes.has('raise')

      // The set of actions are all `execute` actions
      const executeGroup =
        actionTypes.length > 1 &&
        uniqueActionTypes.size === 1 &&
        uniqueActionTypes.has('execute')

      withoutNormalizingConditional(
        editor,
        () => raiseGroup || executeGroup,
        () => {
          for (const action of actions) {
            if (action.type === 'effect') {
              try {
                action.effect({
                  send: sendBack,
                })
              } catch (error) {
                console.error(
                  new Error(
                    `Executing effect as a result of "${event.type}" failed due to: ${error instanceof Error ? error.message : error}`,
                  ),
                )
              }

              continue
            }

            if (action.type === 'reconcile') {
              const reconcileSnapshot = createEditorSnapshot({
                converters,
                editor,
                keyGenerator,
                readOnly,
                schema,
              })

              let reconcileActions: Array<
                | PickFromUnion<BehaviorAction, 'type', 'raise'>
                | PickFromUnion<BehaviorAction, 'type', 'execute'>
              > = []

              try {
                reconcileActions = action.reconcile({
                  snapshot: reconcileSnapshot,
                })
              } catch (error) {
                console.error(
                  new Error(
                    `Executing reconcile as a result of "${event.type}" failed due to: ${error instanceof Error ? error.message : error}`,
                  ),
                )
              }

              for (const reconcileAction of reconcileActions) {
                if (reconcileAction.type === 'raise') {
                  performEvent({
                    mode: mode === 'execute' ? 'execute' : 'raise',
                    behaviors,
                    remainingEventBehaviors:
                      mode === 'execute' ? remainingEventBehaviors : behaviors,
                    event: reconcileAction.event,
                    editor,
                    converters,
                    keyGenerator,
                    readOnly,
                    schema,
                    nativeEvent,
                    sendBack,
                  })
                } else {
                  performEvent({
                    mode: 'execute',
                    behaviors,
                    remainingEventBehaviors: [],
                    event: reconcileAction.event,
                    editor,
                    converters,
                    keyGenerator,
                    readOnly,
                    schema,
                    nativeEvent: undefined,
                    sendBack,
                  })
                }
              }

              continue
            }

            if (action.type === 'forward') {
              const remainingEventBehaviors = eventBehaviors.slice(
                eventBehaviorIndex + 1,
              )

              performEvent({
                mode: mode === 'execute' ? 'execute' : 'forward',
                behaviors,
                remainingEventBehaviors: remainingEventBehaviors,
                event: action.event,
                editor,
                converters,
                keyGenerator,
                readOnly,
                schema,
                nativeEvent,
                sendBack,
              })

              continue
            }

            if (action.type === 'raise') {
              performEvent({
                mode: mode === 'execute' ? 'execute' : 'raise',
                behaviors,
                remainingEventBehaviors:
                  mode === 'execute' ? remainingEventBehaviors : behaviors,
                event: action.event,
                editor,
                converters,
                keyGenerator,
                readOnly,
                schema,
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
              converters,
              keyGenerator,
              readOnly,
              schema,
              nativeEvent: undefined,
              sendBack,
            })
          }
        },
      )

      if (undoStepCreated) {
        editor.undoStepId = undefined
      }
    }

    break
  }

  if (!defaultBehaviorOverwritten && isSyntheticBehaviorEvent(event)) {
    nativeEvent?.preventDefault()

    if (mode === 'send') {
      editor.undoStepId = undefined
    }

    withPerformingBehaviorOperation(editor, () => {
      debug.operation(JSON.stringify(event, null, 2))

      performOperation({
        context: {keyGenerator, schema},
        operation: {
          ...event,
          editor,
        },
      })
    })

    if (mode === 'send') {
      editor.onChange()
    }
  } else if (nativeEventPrevented) {
    nativeEvent?.preventDefault()

    if (mode === 'send') {
      editor.onChange()
    }
  }
}
