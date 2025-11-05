import type {BlockOffset, Editor, EditorContext} from '@portabletext/editor'
import {useEditor} from '@portabletext/editor'
import {
  defineBehavior,
  effect,
  forward,
  raise,
} from '@portabletext/editor/behaviors'
import * as utils from '@portabletext/editor/utils'
import {useActorRef} from '@xstate/react'
import {isDeepEqual} from 'remeda'
import {
  assign,
  fromCallback,
  setup,
  type AnyEventObject,
  type CallbackLogicFunction,
} from 'xstate'
import {createCharacterPairDecoratorBehavior} from './behavior.character-pair-decorator'

/**
 * @public
 */
export function CharacterPairDecoratorPlugin(props: {
  decorator: ({
    context,
    schema,
  }: {
    context: Pick<EditorContext, 'schema'>
    /**
     * @deprecated Use `context.schema` instead
     */
    schema: EditorContext['schema']
  }) => string | undefined
  pair: {char: string; amount: number}
}) {
  const editor = useEditor()

  useActorRef(decoratorPairMachine, {
    input: {
      editor,
      decorator: props.decorator,
      pair: props.pair,
    },
  })

  return null
}

type DecoratorPairEvent =
  | {
      type: 'decorator.add'
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

const decorateListener: CallbackLogicFunction<
  AnyEventObject,
  DecoratorPairEvent,
  {
    decorator: ({
      context,
      schema,
    }: {
      context: Pick<EditorContext, 'schema'>
      /**
       * @deprecated Use `context.schema` instead
       */
      schema: EditorContext['schema']
    }) => string | undefined
    editor: Editor
    pair: {char: string; amount: number}
  }
> = ({sendBack, input}) => {
  const unregister = input.editor.registerBehavior({
    behavior: createCharacterPairDecoratorBehavior({
      decorator: input.decorator,
      pair: input.pair,
      onDecorate: (offset) => {
        sendBack({type: 'decorator.add', blockOffset: offset})
      },
    }),
  })

  return unregister
}

const selectionListenerCallback: CallbackLogicFunction<
  AnyEventObject,
  DecoratorPairEvent,
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
  DecoratorPairEvent,
  {editor: Editor}
> = ({sendBack, input}) => {
  const unregister = input.editor.registerBehavior({
    behavior: defineBehavior({
      on: 'delete.backward',
      actions: [
        () => [
          raise({
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
      decorator: ({
        context,
        schema,
      }: {
        context: Pick<EditorContext, 'schema'>
        /**
         * @deprecated Use `context.schema` instead
         */
        schema: EditorContext['schema']
      }) => string | undefined
      editor: Editor
      offsetAfterDecorator?: BlockOffset
      pair: {char: string; amount: number}
    },
    input: {} as {
      decorator: ({
        context,
        schema,
      }: {
        context: Pick<EditorContext, 'schema'>
        /**
         * @deprecated Use `context.schema` instead
         */
        schema: EditorContext['schema']
      }) => string | undefined
      editor: Editor
      pair: {char: string; amount: number}
    },
    events: {} as DecoratorPairEvent,
  },
  actors: {
    'decorate listener': fromCallback(decorateListener),
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
          src: 'decorate listener',
          input: ({context}) => ({
            decorator: context.decorator,
            editor: context.editor,
            pair: context.pair,
          }),
        },
      ],
      on: {
        'decorator.add': {
          target: 'decorator added',
          actions: assign({
            offsetAfterDecorator: ({event}) => event.blockOffset,
          }),
        },
      },
    },
    'decorator added': {
      exit: [
        assign({
          offsetAfterDecorator: undefined,
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
            const selectionChanged = !isDeepEqual(
              {
                anchor: context.offsetAfterDecorator,
                focus: context.offsetAfterDecorator,
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
