import {useEditor, type Editor} from '@portabletext/editor'
import {defineBehavior, effect, raise} from '@portabletext/editor/behaviors'
import * as selectors from '@portabletext/editor/selectors'
import {useActor} from '@xstate/react'
import {fromCallback, setup, type AnyEventObject} from 'xstate'
import {disableListener, type DisableListenerEvent} from './disable-listener'
import {useMutuallyExclusiveAnnotation} from './use-mutually-exclusive-annotation'
import type {ToolbarAnnotationSchemaType} from './use-toolbar-schema'

const activeListener = fromCallback<
  AnyEventObject,
  {editor: Editor; schemaType: ToolbarAnnotationSchemaType},
  {type: 'set active'} | {type: 'set inactive'}
>(({input, sendBack}) => {
  // Send back the initial state
  if (
    selectors.isActiveAnnotation(input.schemaType.name)(
      input.editor.getSnapshot(),
    )
  ) {
    sendBack({type: 'set active'})
  } else {
    sendBack({type: 'set inactive'})
  }

  return input.editor.on('*', () => {
    const snapshot = input.editor.getSnapshot()

    if (selectors.isActiveAnnotation(input.schemaType.name)(snapshot)) {
      sendBack({type: 'set active'})
    } else {
      sendBack({type: 'set inactive'})
    }
  }).unsubscribe
})

const keyboardShortcutRemove = fromCallback<
  AnyEventObject,
  {editor: Editor; schemaType: ToolbarAnnotationSchemaType}
>(({input}) => {
  const shortcut = input.schemaType.shortcut

  if (!shortcut) {
    return
  }

  return input.editor.registerBehavior({
    behavior: defineBehavior({
      name: `toolbar:annotationRemoveShortcut:${input.schemaType.name}`,
      on: 'keyboard.keydown',
      guard: ({event}) => shortcut.guard(event.originEvent),
      actions: [
        () => [
          raise({
            type: 'annotation.remove',
            annotation: {
              name: input.schemaType.name,
            },
          }),
          effect(() => {
            input.editor.send({type: 'focus'})
          }),
        ],
      ],
    }),
  })
})

const keyboardShortcutShowInsertDialog = fromCallback<
  AnyEventObject,
  {editor: Editor; schemaType: ToolbarAnnotationSchemaType},
  {type: 'open dialog'}
>(({input, sendBack}) => {
  const shortcut = input.schemaType.shortcut

  if (!shortcut) {
    return
  }

  return input.editor.registerBehavior({
    behavior: defineBehavior({
      name: `toolbar:annotationAddShortcut:${input.schemaType.name}`,
      on: 'keyboard.keydown',
      guard: ({event}) => shortcut.guard(event.originEvent),
      actions: [
        () => [
          effect(() => {
            sendBack({type: 'open dialog'})
          }),
        ],
      ],
    }),
  })
})

const annotationButtonMachine = setup({
  types: {
    context: {} as {
      editor: Editor
      schemaType: ToolbarAnnotationSchemaType
    },
    input: {} as {
      editor: Editor
      schemaType: ToolbarAnnotationSchemaType
    },
    events: {} as
      | AnnotationButtonEvent
      | DisableListenerEvent
      | {type: 'set active'}
      | {type: 'set inactive'},
  },
  actions: {
    'add annotation': ({context, event}) => {
      if (event.type !== 'add') {
        return
      }

      context.editor.send({
        type: 'annotation.add',
        annotation: {
          name: context.schemaType.name,
          value: event.annotation.value,
        },
      })
      context.editor.send({type: 'focus'})
    },
    'remove annotation': ({context}) => {
      context.editor.send({
        type: 'annotation.remove',
        annotation: {
          name: context.schemaType.name,
        },
      })
      context.editor.send({type: 'focus'})
    },
  },
  actors: {
    'active listener': activeListener,
    'disable listener': disableListener,
    'keyboard shortcut.remove': keyboardShortcutRemove,
    'keyboard shortcut.show insert dialog': keyboardShortcutShowInsertDialog,
  },
}).createMachine({
  id: 'annotation button',
  context: ({input}) => ({
    editor: input.editor,
    schemaType: input.schemaType,
  }),
  invoke: [
    {
      src: 'active listener',
      input: ({context}) => ({
        editor: context.editor,
        schemaType: context.schemaType,
      }),
    },
    {
      src: 'disable listener',
      input: ({context}) => ({
        editor: context.editor,
        schemaType: context.schemaType,
      }),
    },
  ],
  initial: 'disabled',
  states: {
    disabled: {
      initial: 'inactive',
      states: {
        inactive: {
          on: {
            'enable': {
              target: '#annotation button.enabled.inactive',
            },
            'set active': {
              target: 'active',
            },
          },
        },
        active: {
          on: {
            'enable': {
              target: '#annotation button.enabled.active',
            },
            'set inactive': {
              target: 'inactive',
            },
          },
        },
      },
    },
    enabled: {
      initial: 'inactive',
      states: {
        inactive: {
          initial: 'idle',
          on: {
            'disable': {
              target: '#annotation button.disabled.inactive',
            },
            'set active': {
              target: '#annotation button.enabled.active',
            },
            'add': {
              actions: 'add annotation',
            },
          },
          states: {
            'idle': {
              invoke: {
                src: 'keyboard shortcut.show insert dialog',
                input: ({context}) => ({
                  editor: context.editor,
                  schemaType: context.schemaType,
                }),
              },
              on: {
                'open dialog': {
                  target: 'showing dialog',
                },
              },
            },
            'showing dialog': {
              on: {
                'close dialog': {
                  target: 'idle',
                },
              },
            },
          },
        },
        active: {
          invoke: {
            src: 'keyboard shortcut.remove',
            input: ({context}) => ({
              editor: context.editor,
              schemaType: context.schemaType,
            }),
          },
          on: {
            'set inactive': {
              target: '#annotation button.enabled.inactive',
            },
            'disable': {
              target: '#annotation button.disabled.active',
            },
            'remove': {
              actions: 'remove annotation',
            },
          },
        },
      },
    },
  },
})

/**
 * @beta
 */
export type AnnotationButtonEvent =
  | {type: 'close dialog'}
  | {type: 'open dialog'}
  | {
      type: 'add'
      annotation: {
        value: Record<string, unknown>
      }
    }
  | {type: 'remove'}

/**
 * @beta
 */
export type AnnotationButton = {
  snapshot: {
    matches: (
      state:
        | 'disabled'
        | 'enabled'
        | {disabled: 'inactive'}
        | {disabled: 'active'}
        | {enabled: 'inactive'}
        | {enabled: {inactive: 'idle'}}
        | {enabled: {inactive: 'showing dialog'}}
        | {enabled: 'active'},
    ) => boolean
  }
  send: (event: AnnotationButtonEvent) => void
}

/**
 * @beta
 * Manages the state, keyboard shortcut and available events for an annotation
 * button.
 *
 * Note: This hook assumes that the button triggers a dialog for inputting
 * the annotation value.
 */
export function useAnnotationButton(props: {
  schemaType: ToolbarAnnotationSchemaType
}): AnnotationButton {
  const editor = useEditor()
  const [snapshot, send] = useActor(annotationButtonMachine, {
    input: {
      editor,
      schemaType: props.schemaType,
    },
  })

  useMutuallyExclusiveAnnotation(props)

  return {
    snapshot: {
      matches: (state) => snapshot.matches(state),
    },
    send,
  }
}
