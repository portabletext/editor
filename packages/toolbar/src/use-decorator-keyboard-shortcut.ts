import {useEditor, type Editor} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {useActorRef} from '@xstate/react'
import {fromCallback, setup, type AnyEventObject} from 'xstate'
import {disableListener, type DisableListenerEvent} from './disable-listener'
import type {ToolbarDecoratorSchemaType} from './use-toolbar-schema'

const keyboardShortcutListener = fromCallback<
  AnyEventObject,
  {editor: Editor; schemaType: ToolbarDecoratorSchemaType}
>(({input}) => {
  const shortcut = input.schemaType.shortcut

  if (!shortcut) {
    return
  }

  return input.editor.registerBehavior({
    behavior: defineBehavior({
      name: `toolbar:decoratorShortcut:${input.schemaType.name}`,
      on: 'keyboard.keydown',
      guard: ({event}) => shortcut.guard(event.originEvent),
      actions: [
        () => [
          raise({
            type: 'decorator.toggle',
            decorator: input.schemaType.name,
          }),
        ],
      ],
    }),
  })
})

const decoratorKeyboardShortcutMachine = setup({
  types: {
    context: {} as {
      editor: Editor
      schemaType: ToolbarDecoratorSchemaType
    },
    input: {} as {
      editor: Editor
      schemaType: ToolbarDecoratorSchemaType
    },
    events: {} as DisableListenerEvent | {type: 'decorator.toggle'},
  },
  actors: {
    'disable listener': disableListener,
    'keyboard shortcut listener': keyboardShortcutListener,
  },
}).createMachine({
  id: 'decorator keyboard shortcut',
  context: ({input}) => ({
    editor: input.editor,
    schemaType: input.schemaType,
  }),
  invoke: {
    src: 'disable listener',
    input: ({context}) => ({editor: context.editor}),
  },
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
      invoke: {
        src: 'keyboard shortcut listener',
        input: ({context}) => ({
          editor: context.editor,
          schemaType: context.schemaType,
        }),
      },
      on: {
        disable: {
          target: 'disabled',
        },
      },
    },
  },
})

export function useDecoratorKeyboardShortcut(props: {
  schemaType: ToolbarDecoratorSchemaType
}) {
  const editor = useEditor()
  useActorRef(decoratorKeyboardShortcutMachine, {
    input: {
      editor,
      schemaType: props.schemaType,
    },
  })
}
