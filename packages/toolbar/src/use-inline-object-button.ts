import {useEditor, type Editor} from '@portabletext/editor'
import {defineBehavior, effect} from '@portabletext/editor/behaviors'
import {useActor} from '@xstate/react'
import {fromCallback, setup, type AnyEventObject} from 'xstate'
import {disableListener, type DisableListenerEvent} from './disable-listener'
import type {ToolbarInlineObjectSchemaType} from './use-toolbar-schema'

const keyboardShortcutListener = fromCallback<
  AnyEventObject,
  {editor: Editor; schemaType: ToolbarInlineObjectSchemaType},
  InlineObjectButtonEvent
>(({input, sendBack}) => {
  const shortcut = input.schemaType.shortcut

  if (!shortcut) {
    return
  }

  return input.editor.registerBehavior({
    behavior: defineBehavior({
      name: `toolbar:inlineObjectShortcut:${input.schemaType.name}`,
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

const inlineObjectButtonMachine = setup({
  types: {
    context: {} as {
      editor: Editor
      schemaType: ToolbarInlineObjectSchemaType
    },
    input: {} as {
      editor: Editor
      schemaType: ToolbarInlineObjectSchemaType
    },
    events: {} as DisableListenerEvent | InlineObjectButtonEvent,
  },
  actions: {
    insert: ({context, event}) => {
      if (event.type !== 'insert') {
        return
      }

      context.editor.send({
        type: 'insert.inline object',
        inlineObject: {
          name: context.schemaType.name,
          value: event.value,
        },
      })
      context.editor.send({type: 'focus'})
    },
  },
  actors: {
    'disable listener': disableListener,
    'keyboard shortcut listener': keyboardShortcutListener,
  },
}).createMachine({
  id: 'inline object button',
  context: ({input}) => ({
    editor: input.editor,
    schemaType: input.schemaType,
  }),
  invoke: [
    {
      src: 'disable listener',
      input: ({context}) => ({editor: context.editor}),
    },
  ],
  initial: 'disabled',
  states: {
    disabled: {
      on: {
        enable: {
          target: 'enabled',
        },
      },
    },
    enabled: {
      on: {
        disable: {
          target: 'disabled',
        },
      },
      initial: 'idle',
      states: {
        'idle': {
          invoke: [
            {
              src: 'keyboard shortcut listener',
              input: ({context}) => ({
                editor: context.editor,
                schemaType: context.schemaType,
              }),
            },
          ],
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
            'insert': {
              actions: ['insert'],
              target: 'idle',
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
export type InlineObjectButtonEvent =
  | {
      type: 'close dialog'
    }
  | {
      type: 'open dialog'
    }
  | {
      type: 'insert'
      value: {[key: string]: unknown}
    }

/**
 * @beta
 */
export type InlineObjectButton = {
  snapshot: {
    matches: (
      state:
        | 'disabled'
        | 'enabled'
        | {enabled: 'idle'}
        | {enabled: 'showing dialog'},
    ) => boolean
  }
  send: (event: InlineObjectButtonEvent) => void
}

/**
 * @beta
 * Manages the state, keyboard shortcut and available events for an inline
 * object button.
 *
 * Note: This hook assumes that the button triggers a dialog for inputting
 * the inline object value.
 */
export function useInlineObjectButton(props: {
  schemaType: ToolbarInlineObjectSchemaType
}): InlineObjectButton {
  const editor = useEditor()
  const [actorSnapshot, send] = useActor(inlineObjectButtonMachine, {
    input: {
      editor,
      schemaType: props.schemaType,
    },
  })

  return {
    snapshot: {
      matches: (state) => actorSnapshot.matches(state),
    },
    send,
  }
}
