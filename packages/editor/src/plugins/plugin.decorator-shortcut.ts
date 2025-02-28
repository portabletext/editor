import {useActorRef} from '@xstate/react'
import {isEqual} from 'lodash'
import {
  assign,
  fromCallback,
  setup,
  type AnyEventObject,
  type CallbackLogicFunction,
} from 'xstate'
import {createDecoratorPairBehavior} from '../behaviors/behavior.decorator-pair'
import {defineBehavior} from '../behaviors/behavior.types'
import type {Editor} from '../editor/create-editor'
import type {EditorSchema} from '../editor/define-schema'
import {useEditor} from '../editor/editor-provider'
import type {BlockOffset} from '../types/block-offset'
import * as utils from '../utils'

/**
 * @beta
 */
export function DecoratorShortcutPlugin(config: {
  decorator: ({schema}: {schema: EditorSchema}) => string | undefined
  pair: {char: string; amount: number}
}) {
  const editor = useEditor()

  useActorRef(decoratorPairMachine, {
    input: {
      editor,
      decorator: config.decorator,
      pair: config.pair,
    },
  })

  return null
}

type MarkdownEmphasisEvent =
  | {
      type: 'emphasis.add'
      blockOffset: BlockOffset
    }
  | {
      type: 'selection'
      blockOffsets?: {
        anchor: BlockOffset
        focus: BlockOffset
      }
    }
  | {
      type: 'delete.backward'
    }

const emphasisListener: CallbackLogicFunction<
  AnyEventObject,
  MarkdownEmphasisEvent,
  {
    decorator: ({schema}: {schema: EditorSchema}) => string | undefined
    editor: Editor
    pair: {char: string; amount: number}
  }
> = ({sendBack, input}) => {
  const unregister = input.editor.registerBehavior({
    behavior: createDecoratorPairBehavior({
      decorator: input.decorator,
      pair: input.pair,
      onDecorate: (offset) => {
        sendBack({type: 'emphasis.add', blockOffset: offset})
      },
    }),
  })

  return unregister
}

const selectionListenerCallback: CallbackLogicFunction<
  AnyEventObject,
  MarkdownEmphasisEvent,
  {editor: Editor}
> = ({sendBack, input}) => {
  const unregister = input.editor.registerBehavior({
    behavior: defineBehavior({
      on: 'select',
      guard: ({snapshot, event}) => {
        if (!event.selection) {
          return {blockOffsets: undefined}
        }

        const anchor = utils.spanSelectionPointToBlockOffset({
          value: snapshot.context.value,
          selectionPoint: event.selection.anchor,
        })
        const focus = utils.spanSelectionPointToBlockOffset({
          value: snapshot.context.value,
          selectionPoint: event.selection.focus,
        })

        if (!anchor || !focus) {
          return {blockOffsets: undefined}
        }

        return {
          blockOffsets: {
            anchor,
            focus,
          },
        }
      },
      actions: [
        (_, {blockOffsets}) => [
          {
            type: 'effect',
            effect: () => {
              sendBack({type: 'selection', blockOffsets})
            },
          },
        ],
      ],
    }),
  })

  return unregister
}

const deleteBackwardListenerCallback: CallbackLogicFunction<
  AnyEventObject,
  MarkdownEmphasisEvent,
  {editor: Editor}
> = ({sendBack, input}) => {
  const unregister = input.editor.registerBehavior({
    behavior: defineBehavior({
      on: 'delete.backward',
      actions: [
        () => [
          {
            type: 'history.undo',
          },
          {
            type: 'effect',
            effect: () => {
              sendBack({type: 'delete.backward'})
            },
          },
        ],
      ],
    }),
  })

  return unregister
}

const decoratorPairMachine = setup({
  types: {
    context: {} as {
      decorator: ({schema}: {schema: EditorSchema}) => string | undefined
      editor: Editor
      offsetAfterEmphasis?: BlockOffset
      pair: {char: string; amount: number}
    },
    input: {} as {
      decorator: ({schema}: {schema: EditorSchema}) => string | undefined
      editor: Editor
      pair: {char: string; amount: number}
    },
    events: {} as MarkdownEmphasisEvent,
  },
  actors: {
    'emphasis listener': fromCallback(emphasisListener),
    'delete.backward listener': fromCallback(deleteBackwardListenerCallback),
    'selection listener': fromCallback(selectionListenerCallback),
  },
}).createMachine({
  id: 'decorator pair',
  context: ({input}) => ({
    decorator: input.decorator,
    editor: input.editor,
    pair: input.pair,
  }),
  initial: 'idle',
  states: {
    'idle': {
      invoke: [
        {
          src: 'emphasis listener',
          input: ({context}) => ({
            decorator: context.decorator,
            editor: context.editor,
            pair: context.pair,
          }),
        },
      ],
      on: {
        'emphasis.add': {
          target: 'emphasis added',
          actions: assign({
            offsetAfterEmphasis: ({event}) => event.blockOffset,
          }),
        },
      },
    },
    'emphasis added': {
      exit: [
        assign({
          offsetAfterEmphasis: undefined,
        }),
      ],
      invoke: [
        {
          src: 'selection listener',
          input: ({context}) => ({editor: context.editor}),
        },
        {
          src: 'delete.backward listener',
          input: ({context}) => ({editor: context.editor}),
        },
      ],
      on: {
        'selection': {
          target: 'idle',
          guard: ({context, event}) => {
            const selectionChanged = !isEqual(
              {
                anchor: context.offsetAfterEmphasis,
                focus: context.offsetAfterEmphasis,
              },
              event.blockOffsets,
            )

            return selectionChanged
          },
        },
        'delete.backward': {
          target: 'idle',
        },
      },
    },
  },
})
