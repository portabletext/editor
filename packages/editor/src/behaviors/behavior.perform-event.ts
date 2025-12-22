import {createEditorDom} from '../editor/editor-dom'
import type {EditorSchema} from '../editor/editor-schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import {withPerformingBehaviorOperation} from '../editor/with-performing-behavior-operation'
import {withoutNormalizingConditional} from '../editor/without-normalizing-conditional'
import {debugWithName} from '../internal-utils/debug'
import {performOperation} from '../operations/operation.perform'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {defaultKeyGenerator} from '../utils/key-generator'
import {getEventBehaviors, type BehaviorIndex} from './behavior.index'
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

const debugEvent = debugWithName('behaviors:event')
const debugOperation = debugWithName('operation')

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
  behaviorIndex,
  abstractBehaviorIndex,
  forwardFromBehaviors,
  event,
  editor,
  keyGenerator,
  schema,
  getSnapshot,
  nativeEvent,
  sendBack,
}: {
  mode: 'send' | 'raise' | 'execute' | 'forward'
  behaviorIndex: BehaviorIndex
  abstractBehaviorIndex: BehaviorIndex
  forwardFromBehaviors?: Array<Behavior>
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
  sendBack: (
    event: {type: 'set drag ghost'; ghost: HTMLElement} | ExternalBehaviorEvent,
  ) => void
}) {
  if (mode === 'send' && !isNativeBehaviorEvent(event)) {
    editor.undoStepId = defaultKeyGenerator()
  }

  debugEvent(
    `(${mode}:${eventCategory(event)})`,
    JSON.stringify(event, null, 2),
  )

  const eventBehaviors =
    mode === 'forward' && forwardFromBehaviors
      ? forwardFromBehaviors
      : getEventBehaviors(
          mode === 'execute' ? abstractBehaviorIndex : behaviorIndex,
          event.type,
        )

  if (eventBehaviors.length === 0 && isSyntheticBehaviorEvent(event)) {
    nativeEvent?.preventDefault()

    if (mode === 'send') {
      editor.undoStepId = undefined
    }

    withPerformingBehaviorOperation(editor, () => {
      debugOperation(JSON.stringify(event, null, 2))

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

    if (eventBehavior.actions.length === 0) {
      nativeEventPrevented = true
    }

    let actionSetIndex = -1

    for (const actionSet of eventBehavior.actions) {
      actionSetIndex++

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
                    `Executing effect as a result of "${event.type}" failed due to: ${error.message}`,
                  ),
                )
              }

              continue
            }

            if (action.type === 'forward') {
              const remainingBehaviors = eventBehaviors.slice(
                eventBehaviorIndex + 1,
              )

              performEvent({
                mode: mode === 'execute' ? 'execute' : 'forward',
                behaviorIndex,
                abstractBehaviorIndex,
                forwardFromBehaviors: remainingBehaviors,
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
                mode: mode === 'execute' ? 'execute' : 'raise',
                behaviorIndex,
                abstractBehaviorIndex,
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
              behaviorIndex,
              abstractBehaviorIndex,
              event: action.event,
              editor,
              keyGenerator,
              schema,
              getSnapshot,
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
      debugOperation(JSON.stringify(event, null, 2))

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
