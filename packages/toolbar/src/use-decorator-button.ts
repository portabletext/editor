import {
  useEditor,
  type DecoratorSchemaType,
  type Editor,
} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {useActor} from '@xstate/react'
import {fromCallback, setup, type AnyEventObject} from 'xstate'
import {disableListener, type DisableListenerEvent} from './disable-listener'
import {useDecoratorKeyboardShortcut} from './use-decorator-keyboard-shortcut'
import {useMutuallyExclusiveDecorator} from './use-mutually-exclusive-decorator'
import type {ToolbarDecoratorSchemaType} from './use-toolbar-schema'

const activeListener = fromCallback<
  AnyEventObject,
  {editor: Editor; schemaType: DecoratorSchemaType},
  {type: 'set active'} | {type: 'set inactive'}
>(({input, sendBack}) => {
  return input.editor.on('*', () => {
    const snapshot = input.editor.getSnapshot()

    if (selectors.isActiveDecorator(input.schemaType.name)(snapshot)) {
      sendBack({type: 'set active'})
    } else {
      sendBack({type: 'set inactive'})
    }
  }).unsubscribe
})

const decoratorButtonMachine = setup({
  types: {
    context: {} as {
      editor: Editor
      schemaType: DecoratorSchemaType
    },
    input: {} as {
      editor: Editor
      schemaType: DecoratorSchemaType
    },
    events: {} as DisableListenerEvent | DecoratorButtonEvent,
  },
  actions: {
    toggle: ({context, event}) => {
      if (event.type !== 'toggle') {
        return
      }

      context.editor.send({
        type: 'decorator.toggle',
        decorator: context.schemaType.name,
      })
      context.editor.send({type: 'focus'})
    },
  },
  actors: {
    'disable listener': disableListener,
    'active listener': activeListener,
  },
}).createMachine({
  id: 'decorator button',
  context: ({input}) => ({
    editor: input.editor,
    schemaType: input.schemaType,
  }),
  invoke: [
    {src: 'disable listener', input: ({context}) => ({editor: context.editor})},
    {
      src: 'active listener',
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
              target: '#decorator button.enabled.inactive',
            },
            'set active': {
              target: 'active',
            },
          },
        },
        active: {
          on: {
            'enable': {
              target: '#decorator button.enabled.active',
            },
            'set inactive': {
              target: 'inactive',
            },
          },
        },
      },
    },
    enabled: {
      on: {
        toggle: {
          actions: ['toggle'],
        },
      },
      initial: 'inactive',
      states: {
        inactive: {
          on: {
            'disable': {
              target: '#decorator button.disabled.inactive',
            },
            'set active': {
              target: 'active',
            },
          },
        },
        active: {
          on: {
            'disable': {
              target: '#decorator button.disabled.active',
            },
            'set inactive': {
              target: 'inactive',
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
export type DecoratorButtonEvent = {
  type: 'toggle'
}

/**
 * @beta
 */
export type DecoratorButton = {
  snapshot: {
    matches: (
      state:
        | 'disabled'
        | 'enabled'
        | {disabled: 'inactive'}
        | {disabled: 'active'}
        | {enabled: 'inactive'}
        | {enabled: 'active'},
    ) => boolean
  }
  send: (event: DecoratorButtonEvent) => void
}

/**
 * @beta
 * Manages the state, keyboard shortcuts and available events for a decorator
 * button and sets up mutually exclusive decorator behaviors.
 */
export function useDecoratorButton(props: {
  schemaType: ToolbarDecoratorSchemaType
}): DecoratorButton {
  const editor = useEditor()
  const [actorSnapshot, send] = useActor(decoratorButtonMachine, {
    input: {
      editor,
      schemaType: props.schemaType,
    },
  })

  useDecoratorKeyboardShortcut(props)
  useMutuallyExclusiveDecorator(props)

  return {
    snapshot: {
      matches: (state) => actorSnapshot.matches(state),
    },
    send,
  }
}
