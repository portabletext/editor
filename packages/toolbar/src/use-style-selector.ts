import {
  useEditor,
  type Editor,
  type StyleSchemaType,
} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {useActor} from '@xstate/react'
import {assign, fromCallback, setup, type AnyEventObject} from 'xstate'
import {disableListener, type DisableListenerEvent} from './disable-listener'
import {useStyleKeyboardShortcuts} from './use-style-keyboard-shortcuts'
import type {ToolbarStyleSchemaType} from './use-toolbar-schema'

type ActiveStyleListenerEvent = {
  type: 'set active style'
  style: StyleSchemaType['name'] | undefined
}

const activeListener = fromCallback<
  AnyEventObject,
  {editor: Editor},
  ActiveStyleListenerEvent
>(({input, sendBack}) => {
  return input.editor.on('*', () => {
    const snapshot = input.editor.getSnapshot()
    const activeStyle = selectors.getActiveStyle(snapshot)

    sendBack({type: 'set active style', style: activeStyle})
  }).unsubscribe
})

const styleSelectorMachine = setup({
  types: {
    context: {} as {
      editor: Editor
      activeStyle: StyleSchemaType['name'] | undefined
    },
    input: {} as {
      editor: Editor
    },
    events: {} as
      | StyleSelectorEvent
      | DisableListenerEvent
      | ActiveStyleListenerEvent,
  },
  actors: {
    'disable listener': disableListener,
    'active listener': activeListener,
  },
}).createMachine({
  id: 'style selector',
  context: ({input}) => ({
    editor: input.editor,
    activeStyle: undefined,
  }),
  invoke: [
    {
      src: 'disable listener',
      input: ({context}) => ({
        editor: context.editor,
      }),
    },
    {
      src: 'active listener',
      input: ({context}) => ({
        editor: context.editor,
      }),
    },
  ],
  on: {
    'set active style': {
      actions: assign({
        activeStyle: ({event}) => event.style,
      }),
    },
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
      on: {
        disable: {
          target: 'disabled',
        },
        toggle: {
          actions: [
            ({context, event}) => {
              context.editor.send({type: 'style.toggle', style: event.style})
              context.editor.send({type: 'focus'})
            },
          ],
        },
      },
    },
  },
})

/**
 * @beta
 */
export type StyleSelectorEvent = {
  type: 'toggle'
  style: StyleSchemaType['name']
}

/**
 * @beta
 */
export type StyleSelector = {
  snapshot: {
    matches: (state: 'disabled' | 'enabled') => boolean
    context: {
      activeStyle: StyleSchemaType['name'] | undefined
    }
  }
  send: (event: StyleSelectorEvent) => void
}

/**
 * @beta
 * Manages the state, keyboard shortcuts and available events for a style
 * selector.
 */
export function useStyleSelector(props: {
  schemaTypes: ReadonlyArray<ToolbarStyleSchemaType>
}): StyleSelector {
  const editor = useEditor()
  const [actorSnapshot, send] = useActor(styleSelectorMachine, {
    input: {
      editor,
    },
  })
  useStyleKeyboardShortcuts(props)

  return {
    snapshot: {
      matches: (state) => actorSnapshot.matches(state),
      context: {
        activeStyle: actorSnapshot.context.activeStyle,
      },
    },
    send,
  }
}
