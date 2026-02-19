import {useEditor, type Editor} from '@portabletext/editor'
import {
  defineBehavior,
  effect,
  type InsertPlacement,
} from '@portabletext/editor/behaviors'
import {useActor} from '@xstate/react'
import {fromCallback, setup, type AnyEventObject} from 'xstate'
import {disableListener, type DisableListenerEvent} from './disable-listener'
import type {ToolbarBlockObjectSchemaType} from './use-toolbar-schema'

const keyboardShortcutListener = fromCallback<
  AnyEventObject,
  {editor: Editor; schemaType: ToolbarBlockObjectSchemaType},
  BlockObjectButtonEvent
>(({input, sendBack}) => {
  const shortcut = input.schemaType.shortcut

  if (!shortcut) {
    return
  }

  return input.editor.registerBehavior({
    behavior: defineBehavior({
      name: `toolbar:blockObjectShortcut:${input.schemaType.name}`,
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

const blockObjectButtonMachine = setup({
  types: {
    context: {} as {
      editor: Editor
      schemaType: ToolbarBlockObjectSchemaType
    },
    input: {} as {
      editor: Editor
      schemaType: ToolbarBlockObjectSchemaType
    },
    events: {} as DisableListenerEvent | BlockObjectButtonEvent,
  },
  actions: {
    insert: ({context, event}) => {
      if (event.type !== 'insert') {
        return
      }

      context.editor.send({
        type: 'insert.block object',
        blockObject: {
          name: context.schemaType.name,
          value: event.value,
        },
        placement: event.placement ?? 'auto',
      })
      context.editor.send({type: 'focus'})
    },
  },
  actors: {
    'disable listener': disableListener,
    'keyboard shortcut listener': keyboardShortcutListener,
  },
}).createMachine({
  id: 'block object button',
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
export type BlockObjectButtonEvent =
  | {
      type: 'close dialog'
    }
  | {
      type: 'open dialog'
    }
  | {
      type: 'insert'
      value: {[key: string]: unknown}
      placement: InsertPlacement | undefined
    }

/**
 * @beta
 */
export type BlockObjectButton = {
  snapshot: {
    matches: (
      state:
        | 'disabled'
        | 'enabled'
        | {enabled: 'idle'}
        | {enabled: 'showing dialog'},
    ) => boolean
  }
  send: (event: BlockObjectButtonEvent) => void
}

/**
 * @beta
 * Manages the state, keyboard shortcut and available events for a block
 * object button.
 *
 * Note: This hook assumes that the button triggers a dialog for inputting
 * the block object value.
 */
export function useBlockObjectButton(props: {
  schemaType: ToolbarBlockObjectSchemaType
}): BlockObjectButton {
  const editor = useEditor()
  const [actorSnapshot, send] = useActor(blockObjectButtonMachine, {
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
