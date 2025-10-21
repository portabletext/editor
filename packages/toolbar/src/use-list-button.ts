import {useEditor, type Editor, type ListSchemaType} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {useActor} from '@xstate/react'
import {fromCallback, setup, type AnyEventObject} from 'xstate'
import {disableListener, type DisableListenerEvent} from './disable-listener'
import type {ToolbarListSchemaType} from './use-toolbar-schema'

const activeListener = fromCallback<
  AnyEventObject,
  {editor: Editor; schemaType: ListSchemaType},
  {type: 'set active'} | {type: 'set inactive'}
>(({input, sendBack}) => {
  // Send back the initial state
  if (
    selectors.isActiveListItem(input.schemaType.name)(
      input.editor.getSnapshot(),
    )
  ) {
    sendBack({type: 'set active'})
  } else {
    sendBack({type: 'set inactive'})
  }

  return input.editor.on('*', () => {
    const snapshot = input.editor.getSnapshot()

    if (selectors.isActiveListItem(input.schemaType.name)(snapshot)) {
      sendBack({type: 'set active'})
    } else {
      sendBack({type: 'set inactive'})
    }
  }).unsubscribe
})

const listButtonMachine = setup({
  types: {
    context: {} as {
      editor: Editor
      schemaType: ListSchemaType
    },
    input: {} as {
      editor: Editor
      schemaType: ListSchemaType
    },
    events: {} as DisableListenerEvent | ListButtonEvent,
  },
  actions: {
    toggle: ({context, event}) => {
      if (event.type !== 'toggle') {
        return
      }

      context.editor.send({
        type: 'list item.toggle',
        listItem: context.schemaType.name,
      })
      context.editor.send({type: 'focus'})
    },
  },
  actors: {
    'disable listener': disableListener,
    'active listener': activeListener,
  },
}).createMachine({
  id: 'list button',
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
              target: '#list button.enabled.inactive',
            },
            'set active': {
              target: 'active',
            },
          },
        },
        active: {
          on: {
            'enable': {
              target: '#list button.enabled.active',
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
              target: '#list button.disabled.inactive',
            },
            'set active': {
              target: 'active',
            },
          },
        },
        active: {
          on: {
            'disable': {
              target: '#list button.disabled.active',
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
export type ListButtonEvent = {
  type: 'toggle'
}

/**
 * @beta
 */
export type ListButton = {
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
  send: (event: ListButtonEvent) => void
}

/**
 * @beta
 * Manages the state, keyboard shortcuts and available events for a list button.
 */
export function useListButton(props: {
  schemaType: ToolbarListSchemaType
}): ListButton {
  const editor = useEditor()
  const [actorSnapshot, send] = useActor(listButtonMachine, {
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
