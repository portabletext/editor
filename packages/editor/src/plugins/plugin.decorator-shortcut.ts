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
import {effect, execute, forward} from '../behaviors/behavior.types.action'
import {defineBehavior} from '../behaviors/behavior.types.behavior'
import type {Editor} from '../editor'
import type {EditorSchema} from '../editor/editor-schema'
import {useEditor} from '../editor/use-editor'
import type {BlockOffset} from '../types/block-offset'
import * as utils from '../utils'

/**
 * @beta
 * @deprecated Install the plugin from `@portabletext/plugin-character-pair-decorator`
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
        if (!event.at) {
          return {blockOffsets: undefined}
        }

        const anchor = utils.spanSelectionPointToBlockOffset({
          context: snapshot.context,
          selectionPoint: event.at.anchor,
        })
        const focus = utils.spanSelectionPointToBlockOffset({
          context: snapshot.context,
          selectionPoint: event.at.focus,
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
        ({event}, {blockOffsets}) => [
          {
            type: 'effect',
            effect: () => {
              sendBack({type: 'selection', blockOffsets})
            },
          },
          forward(event),
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
          execute({
            type: 'history.undo',
          }),
          effect(() => {
            sendBack({type: 'delete.backward'})
          }),
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
