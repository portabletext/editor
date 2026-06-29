import type {
  BlockOffset,
  Editor,
  EditorContext,
  EditorSelection,
} from '@portabletext/editor'
import {useEditor} from '@portabletext/editor'
import {defineBehavior, effect, raise} from '@portabletext/editor/behaviors'
import * as utils from '@portabletext/editor/utils'
import {useActorRef} from '@xstate/react'
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
      selection: EditorSelection
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
  // Listen for the emitted 'selection' event which fires after ANY cursor
  // movement (typing, clicking, pasting, etc.) - not just explicit 'select'
  // behavior events.
  const subscription = input.editor.on('selection', (event) => {
    if (!event.selection) {
      sendBack({type: 'selection', blockOffsets: undefined, selection: null})
      return
    }

    const snapshot = input.editor.getSnapshot()
    const anchor = utils.spanSelectionPointToBlockOffset({
      snapshot,
      selectionPoint: event.selection.anchor,
    })
    const focus = utils.spanSelectionPointToBlockOffset({
      snapshot,
      selectionPoint: event.selection.focus,
    })

    if (!anchor || !focus) {
      sendBack({
        type: 'selection',
        blockOffsets: undefined,
        selection: event.selection,
      })
      return
    }

    sendBack({
      type: 'selection',
      blockOffsets: {anchor, focus},
      selection: event.selection,
    })
  })

  return () => subscription.unsubscribe()
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
      endSelection: EditorSelection
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
    endSelection: null,
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
            endSelection: ({context}) =>
              context.editor.getSnapshot().context.selection,
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
            const offsetAfterDecorator = context.offsetAfterDecorator

            if (event.blockOffsets && offsetAfterDecorator) {
              // Block offsets are compared rather than raw selection points
              // because they normalize away span-level differences (e.g. the
              // cursor at the same position but in a different span after
              // normalization).
              const decoratorBlock = offsetAfterDecorator.path.at(-1)
              const anchorBlock = event.blockOffsets.anchor.path.at(-1)
              const focusBlock = event.blockOffsets.focus.path.at(-1)

              if (
                !utils.isKeyedSegment(decoratorBlock) ||
                !utils.isKeyedSegment(anchorBlock) ||
                !utils.isKeyedSegment(focusBlock)
              ) {
                return false
              }

              const anchorChanged =
                decoratorBlock._key !== anchorBlock._key ||
                offsetAfterDecorator.offset !== event.blockOffsets.anchor.offset
              const focusChanged =
                decoratorBlock._key !== focusBlock._key ||
                offsetAfterDecorator.offset !== event.blockOffsets.focus.offset

              return anchorChanged || focusChanged
            }

            // Block offsets can't be computed when the cursor is on an inline
            // object, so fall back to comparing the raw selections.
            return !utils.isEqualSelections(
              context.endSelection,
              event.selection,
            )
          },
        },
        'delete.backward': {
          target: 'idle',
        },
      },
    },
  },
})
