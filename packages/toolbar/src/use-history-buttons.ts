import {useEditor, type Editor} from '@portabletext/editor'
import {useActor} from '@xstate/react'
import {setup} from 'xstate'
import {disableListener, type DisableListenerEvent} from './disable-listener'

const historyButtonsMachine = setup({
  types: {
    context: {} as {
      editor: Editor
    },
    input: {} as {
      editor: Editor
    },
    events: {} as DisableListenerEvent | HistoryButtonsEvent,
  },
  actors: {
    'disable listener': disableListener,
  },
}).createMachine({
  id: 'history buttons',
  context: ({input}) => ({
    editor: input.editor,
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
      on: {
        'disable': {
          target: 'disabled',
        },
        'history.undo': {
          actions: ({context}) => {
            context.editor.send({type: 'history.undo'})
            context.editor.send({type: 'focus'})
          },
        },
        'history.redo': {
          actions: ({context}) => {
            context.editor.send({type: 'history.redo'})
            context.editor.send({type: 'focus'})
          },
        },
      },
    },
  },
})

/**
 * @beta
 */
export type HistoryButtonsEvent =
  | {
      type: 'history.undo'
    }
  | {
      type: 'history.redo'
    }

/**
 * @beta
 */
export type HistoryButtons = {
  snapshot: {
    matches: (state: 'disabled' | 'enabled') => boolean
  }
  send: (event: HistoryButtonsEvent) => void
}

/**
 * @beta
 */
export function useHistoryButtons(): HistoryButtons {
  const editor = useEditor()
  const [actorSnapshot, send] = useActor(historyButtonsMachine, {
    input: {
      editor,
    },
  })

  return {
    snapshot: {
      matches: (state) => actorSnapshot.matches(state),
    },
    send,
  }
}
