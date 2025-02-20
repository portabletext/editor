import {useActorRef} from '@xstate/react'
import {isEqual} from 'lodash'
import {
  assign,
  fromCallback,
  setup,
  type AnyEventObject,
  type CallbackLogicFunction,
} from 'xstate'
import type {Editor} from '../editor/create-editor'
import {useEditor} from '../editor/editor-provider'
import type {EditorSchema} from '../selectors'
import type {BlockOffset} from '../types/block-offset'
import * as utils from '../utils'
import {createDecoratorPairBehavior} from './behavior.decorator-pair'
import {defineBehavior} from './behavior.types'

/**
 * @beta
 */
export type MarkdownEmphasisBehaviorsConfig = {
  boldDecorator?: ({schema}: {schema: EditorSchema}) => string | undefined
  codeDecorator?: ({schema}: {schema: EditorSchema}) => string | undefined
  italicDecorator?: ({schema}: {schema: EditorSchema}) => string | undefined
}

/**
 * @beta
 */
export function useMarkdownEmphasisBehaviors(props: {
  config: MarkdownEmphasisBehaviorsConfig
}) {
  const editor = useEditor()

  useActorRef(emphasisMachine, {
    input: {
      editor,
      boldDecorator: props.config.boldDecorator?.({
        schema: editor.getSnapshot().context.schema,
      }),
      codeDecorator: props.config.codeDecorator?.({
        schema: editor.getSnapshot().context.schema,
      }),
      italicDecorator: props.config.italicDecorator?.({
        schema: editor.getSnapshot().context.schema,
      }),
    },
  })
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
    editor: Editor
    boldDecorator?: string
    codeDecorator?: string
    italicDecorator?: string
  }
> = ({sendBack, input}) => {
  const unregisterBoldBehaviors = input.boldDecorator
    ? [
        input.editor.registerBehavior({
          behavior: createDecoratorPairBehavior({
            decorator: () => input.boldDecorator,
            pair: {char: '*', amount: 2},
            onDecorate: (offset) => {
              sendBack({type: 'emphasis.add', blockOffset: offset})
            },
          }),
        }),
        input.editor.registerBehavior({
          behavior: createDecoratorPairBehavior({
            decorator: () => input.boldDecorator,
            pair: {char: '_', amount: 2},
            onDecorate: (offset) => {
              sendBack({type: 'emphasis.add', blockOffset: offset})
            },
          }),
        }),
      ]
    : []
  const unregisterCodeBehavior = input.codeDecorator
    ? input.editor.registerBehavior({
        behavior: createDecoratorPairBehavior({
          decorator: () => input.codeDecorator,
          pair: {char: '`', amount: 1},
          onDecorate: (offset) => {
            sendBack({type: 'emphasis.add', blockOffset: offset})
          },
        }),
      })
    : undefined
  const unregisterItalicBehaviors = input.italicDecorator
    ? [
        input.editor.registerBehavior({
          behavior: createDecoratorPairBehavior({
            decorator: () => input.italicDecorator,
            pair: {char: '*', amount: 1},
            onDecorate: (offset) => {
              sendBack({type: 'emphasis.add', blockOffset: offset})
            },
          }),
        }),
        input.editor.registerBehavior({
          behavior: createDecoratorPairBehavior({
            decorator: () => input.italicDecorator,
            pair: {char: '_', amount: 1},
            onDecorate: (offset) => {
              sendBack({type: 'emphasis.add', blockOffset: offset})
            },
          }),
        }),
      ]
    : []

  return () => {
    for (const unregisterBehavior of [
      ...unregisterBoldBehaviors,
      ...(unregisterCodeBehavior ? [unregisterCodeBehavior] : []),
      ...unregisterItalicBehaviors,
    ]) {
      unregisterBehavior()
    }
  }
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

const emphasisMachine = setup({
  types: {
    context: {} as {
      boldDecorator?: string
      codeDecorator?: string
      italicDecorator?: string
      offsetAfterEmphasis?: BlockOffset
      editor: Editor
    },
    input: {} as {
      boldDecorator?: string
      codeDecorator?: string
      italicDecorator?: string
      editor: Editor
    },
    events: {} as MarkdownEmphasisEvent,
  },
  actors: {
    'emphasis listener': fromCallback(emphasisListener),
    'delete.backward listener': fromCallback(deleteBackwardListenerCallback),
    'selection listener': fromCallback(selectionListenerCallback),
  },
}).createMachine({
  id: 'emphasis',
  context: ({input}) => ({
    boldDecorator: input.boldDecorator,
    codeDecorator: input.codeDecorator,
    italicDecorator: input.italicDecorator,
    editor: input.editor,
  }),
  initial: 'idle',
  states: {
    'idle': {
      invoke: [
        {
          src: 'emphasis listener',
          input: ({context}) => ({
            editor: context.editor,
            boldDecorator: context.boldDecorator,
            codeDecorator: context.codeDecorator,
            italicDecorator: context.italicDecorator,
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
