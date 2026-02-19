import {useEditor, type Editor} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {useActorRef} from '@xstate/react'
import {fromCallback, setup, type AnyEventObject} from 'xstate'
import {disableListener, type DisableListenerEvent} from './disable-listener'
import type {ToolbarStyleSchemaType} from './use-toolbar-schema'

const styleKeyboardShortcutsListener = fromCallback<
  AnyEventObject,
  {editor: Editor; schemaTypes: ReadonlyArray<ToolbarStyleSchemaType>}
>(({input}) => {
  const unregisterBehaviors = input.schemaTypes.flatMap((schemaType) => {
    const shortcut = schemaType.shortcut

    if (!shortcut) {
      return []
    }

    return [
      input.editor.registerBehavior({
        behavior: defineBehavior({
          name: `toolbar:styleShortcut:${schemaType.name}`,
          on: 'keyboard.keydown',
          guard: ({event}) => shortcut.guard(event.originEvent),
          actions: [
            () => [raise({type: 'style.toggle', style: schemaType.name})],
          ],
        }),
      }),
    ]
  })

  return () => {
    for (const unregisterBehavior of unregisterBehaviors) {
      unregisterBehavior()
    }
  }
})

const styleKeyboardShortcutsMachine = setup({
  types: {
    context: {} as {
      editor: Editor
      schemaTypes: ReadonlyArray<ToolbarStyleSchemaType>
    },
    input: {} as {
      editor: Editor
      schemaTypes: ReadonlyArray<ToolbarStyleSchemaType>
    },
    events: {} as DisableListenerEvent | {type: 'style.toggle'},
  },
  actors: {
    'disable listener': disableListener,
    'style keyboard shortcuts listener': styleKeyboardShortcutsListener,
  },
}).createMachine({
  id: 'style keyboard shortcuts',
  context: ({input}) => ({
    editor: input.editor,
    schemaTypes: input.schemaTypes,
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
        src: 'style keyboard shortcuts listener',
        input: ({context}) => ({
          editor: context.editor,
          schemaTypes: context.schemaTypes,
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

/**
 * @beta
 * Registers keyboard shortcuts for a set of style schema types.
 */
export function useStyleKeyboardShortcuts(props: {
  schemaTypes: ReadonlyArray<ToolbarStyleSchemaType>
}) {
  const editor = useEditor()
  useActorRef(styleKeyboardShortcutsMachine, {
    input: {
      editor,
      schemaTypes: props.schemaTypes,
    },
  })
}
