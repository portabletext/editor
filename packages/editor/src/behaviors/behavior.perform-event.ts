import type {Behavior, BehaviorEvent} from '.'
import {performAction} from '../behavior-actions/behavior.actions'
import type {EditorSchema} from '../editor/define-schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import {
  withApplyingBehaviorActions,
  withApplyingBehaviorActionSet,
} from '../editor/with-applying-behavior-actions'
import {debugWithName} from '../internal-utils/debug'
import type {PortableTextSlateEditor} from '../types/editor'
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
  behaviors,
  event,
  editor,
  keyGenerator,
  schema,
  getSnapshot,
  nativeEvent,
  defaultActionCallback,
}: {
  behaviors: Array<Behavior>
  event: BehaviorEvent
  editor: PortableTextSlateEditor
  keyGenerator: () => string
  schema: EditorSchema
  getSnapshot: () => EditorSnapshot
  defaultActionCallback: (() => void) | undefined
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

  if (eventBehaviors.length === 0) {
    if (defaultActionCallback) {
      withApplyingBehaviorActions(editor, () => {
        try {
          defaultActionCallback()
        } catch (error) {
          console.error(
            new Error(
              `Performing action "${event.type}" failed due to: ${error.message}`,
            ),
          )
        }
      })
      return
    }

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

  const editorSnapshot = getSnapshot()

  let behaviorOverwritten = false

  for (const eventBehavior of eventBehaviors) {
    const shouldRun =
      eventBehavior.guard === undefined ||
      eventBehavior.guard({
        context: editorSnapshot.context,
        snapshot: editorSnapshot,
        event,
      })

    if (!shouldRun) {
      continue
    }

    const actionSets = eventBehavior.actions.map((actionSet) =>
      actionSet(
        {
          context: editorSnapshot.context,
          snapshot: editorSnapshot,
          event,
        },
        shouldRun,
      ),
    )

    for (const actionSet of actionSets) {
      if (actionSet.length === 0) {
        continue
      }

      behaviorOverwritten =
        behaviorOverwritten ||
        actionSet.some((action) => action.type !== 'effect')

      withApplyingBehaviorActionSet(editor, () => {
        for (const action of actionSet) {
          if (action.type === 'raise') {
            performEvent({
              behaviors,
              event: action.event,
              editor,
              keyGenerator,
              schema,
              getSnapshot,
              defaultActionCallback: undefined,
              nativeEvent: undefined,
            })

            continue
          }

          const internalAction = {
            ...action,
            editor,
          }

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
            break
          }
        }
      })
      editor.onChange()
    }

    if (behaviorOverwritten) {
      nativeEvent?.preventDefault()
      break
    }
  }

  if (!behaviorOverwritten) {
    if (defaultActionCallback) {
      withApplyingBehaviorActions(editor, () => {
        try {
          defaultActionCallback()
        } catch (error) {
          console.error(
            new Error(
              `Performing "${event.type}" failed due to: ${error.message}`,
            ),
          )
        }
      })
      return
    }

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
