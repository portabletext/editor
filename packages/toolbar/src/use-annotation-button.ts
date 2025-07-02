import {useEditor, type Editor} from '@portabletext/editor'
import {defineBehavior, effect, raise} from '@portabletext/editor/behaviors'
import * as selectors from '@portabletext/editor/selectors'
import {useActor} from '@xstate/react'
import {
  fromCallback,
  setup,
  type AnyEventObject,
  type SnapshotFrom,
} from 'xstate'
import type {ToolbarAnnotationDefinition} from './toolbar-schema-definition'

const activeListener = fromCallback<
  AnyEventObject,
  {editor: Editor; definition: ToolbarAnnotationDefinition},
  {type: 'set active'} | {type: 'set inactive'}
>(({input, sendBack}) => {
  return input.editor.on('*', () => {
    const snapshot = input.editor.getSnapshot()

    if (selectors.isActiveAnnotation(input.definition.name)(snapshot)) {
      sendBack({type: 'set active'})
    } else {
      sendBack({type: 'set inactive'})
    }
  }).unsubscribe
})

const disableListener = fromCallback<
  AnyEventObject,
  {editor: Editor; definition: ToolbarAnnotationDefinition},
  {type: 'enable'} | {type: 'disable'}
>(({input, sendBack}) => {
  return input.editor.on('*', () => {
    if (input.editor.getSnapshot().context.readOnly) {
      sendBack({type: 'disable'})
    } else {
      sendBack({type: 'enable'})
    }
  }).unsubscribe
})

const keyboardShortcutRemove = fromCallback<
  AnyEventObject,
  {editor: Editor; definition: ToolbarAnnotationDefinition},
  {type: 'remove'}
>(({input}) => {
  const shortcut = input.definition.shortcut

  if (!shortcut) {
    return
  }

  return input.editor.registerBehavior({
    behavior: defineBehavior({
      on: 'keyboard.keydown',
      guard: ({event}) => shortcut.guard(event.originEvent),
      actions: [
        () => [
          raise({
            type: 'annotation.remove',
            annotation: {
              name: input.definition.name,
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
  {editor: Editor; definition: ToolbarAnnotationDefinition},
  {type: 'annotation.insert dialog.show'}
>(({input, sendBack}) => {
  const shortcut = input.definition.shortcut

  if (!shortcut) {
    return
  }

  return input.editor.registerBehavior({
    behavior: defineBehavior({
      on: 'keyboard.keydown',
      guard: ({event}) => shortcut.guard(event.originEvent),
      actions: [
        () => [
          effect(() => {
            sendBack({type: 'annotation.insert dialog.show'})
          }),
        ],
      ],
    }),
  })
})

/**
 * @beta
 */
export type AnnotationButtonEvent =
  | {type: 'annotation.insert dialog.dismiss'}
  | {type: 'annotation.insert dialog.show'}
  | {
      type: 'annotation.add'
      annotation: {
        value: Record<string, unknown>
      }
    }
  | {type: 'annotation.remove'}

const annotationButtonMachine = setup({
  types: {
    context: {} as {
      editor: Editor
      definition: ToolbarAnnotationDefinition
    },
    input: {} as {
      editor: Editor
      definition: ToolbarAnnotationDefinition
    },
    events: {} as
      | AnnotationButtonEvent
      | {type: 'enable'}
      | {type: 'disable'}
      | {type: 'set active'}
      | {type: 'set inactive'},
  },
  actions: {
    'add annotation': ({context, event}) => {
      if (event.type !== 'annotation.add') {
        return
      }

      context.editor.send({
        type: 'annotation.add',
        annotation: {
          name: context.definition.name,
          value: event.annotation.value,
        },
      })
      context.editor.send({type: 'focus'})
    },
    'remove annotation': ({context}) => {
      context.editor.send({
        type: 'annotation.remove',
        annotation: {
          name: context.definition.name,
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
    definition: input.definition,
  }),
  invoke: [
    {
      src: 'active listener',
      input: ({context}) => ({
        editor: context.editor,
        definition: context.definition,
      }),
    },
    {
      src: 'disable listener',
      input: ({context}) => ({
        editor: context.editor,
        definition: context.definition,
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
            'annotation.add': {
              actions: 'add annotation',
            },
          },
          states: {
            'idle': {
              invoke: {
                src: 'keyboard shortcut.show insert dialog',
                input: ({context}) => ({
                  editor: context.editor,
                  definition: context.definition,
                }),
              },
              on: {
                'annotation.insert dialog.show': {
                  target: 'showing insert dialog',
                },
              },
            },
            'showing insert dialog': {
              on: {
                'annotation.insert dialog.dismiss': {
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
              definition: context.definition,
            }),
          },
          on: {
            'set inactive': {
              target: '#annotation button.enabled.inactive',
            },
            'disable': {
              target: '#annotation button.disabled.active',
            },
            'annotation.remove': {
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
export type AnnotationButton = {
  snapshot: SnapshotFrom<typeof annotationButtonMachine>
  send: (event: AnnotationButtonEvent) => void
}

/**
 * @beta
 */
export function useAnnotationButton(props: {
  definition: ToolbarAnnotationDefinition
}): AnnotationButton {
  const editor = useEditor()
  const [snapshot, send] = useActor(annotationButtonMachine, {
    input: {
      editor,
      definition: props.definition,
    },
  })

  return {snapshot, send}
}
