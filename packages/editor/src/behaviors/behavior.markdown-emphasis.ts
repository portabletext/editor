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
import {
  getTextToBold,
  getTextToItalic,
} from '../internal-utils/get-text-to-emphasize'
import type {EditorSchema} from '../selectors'
import * as selectors from '../selectors'
import * as utils from '../utils'
import {defineBehavior} from './behavior.types'

/**
 * @beta
 */
export type MarkdownEmphasisBehaviorsConfig = {
  boldDecorator?: ({schema}: {schema: EditorSchema}) => string | undefined
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
      italicDecorator: props.config.italicDecorator?.({
        schema: editor.getSnapshot().context.schema,
      }),
    },
  })
}

type MarkdownEmphasisEvent =
  | {
      type: 'emphasis.add'
      blockOffset: utils.BlockOffset
    }
  | {
      type: 'selection'
      blockOffsets?: {
        anchor: utils.BlockOffset
        focus: utils.BlockOffset
      }
    }
  | {
      type: 'delete.backward'
    }

const emphasisListener: CallbackLogicFunction<
  AnyEventObject,
  MarkdownEmphasisEvent,
  {editor: Editor; boldDecorator?: string; italicDecorator?: string}
> = ({sendBack, input}) => {
  const unregister = input.editor.registerBehavior({
    behavior: defineBehavior({
      on: 'insert.text',
      guard: ({context, event}) => {
        const boldDecorator = input.boldDecorator
        const italicDecorator = input.italicDecorator

        if (boldDecorator === undefined && italicDecorator === undefined) {
          return false
        }

        const focusTextBlock = selectors.getFocusTextBlock({context})
        const selectionStartPoint = selectors.getSelectionStartPoint({context})
        const selectionStartOffset = selectionStartPoint
          ? utils.spanSelectionPointToBlockOffset({
              value: context.value,
              selectionPoint: selectionStartPoint,
            })
          : undefined

        if (!focusTextBlock || !selectionStartOffset) {
          return false
        }

        const textBefore = selectors.getBlockTextBefore({context})

        const textToItalic = getTextToItalic(`${textBefore}${event.text}`)

        if (textToItalic !== undefined && italicDecorator !== undefined) {
          const prefixOffsets = {
            anchor: {
              path: focusTextBlock.path,
              // Example: "foo *bar*".length - "*bar*".length = 4
              offset: `${textBefore}${event.text}`.length - textToItalic.length,
            },
            focus: {
              path: focusTextBlock.path,
              // Example: "foo *bar*".length - "*bar*".length + 1 = 5
              offset:
                `${textBefore}${event.text}`.length - textToItalic.length + 1,
            },
          }
          const suffixOffsets = {
            anchor: {
              path: focusTextBlock.path,
              // Example: "foo *bar|" (8) + "*".length - 1 = 8
              offset: selectionStartOffset.offset + event.text.length - 1,
            },
            focus: {
              path: focusTextBlock.path,
              // Example: "foo *bar|" (8) + "*".length = 9
              offset: selectionStartOffset.offset + event.text.length,
            },
          }

          const anchor = utils.blockOffsetToSpanSelectionPoint({
            value: context.value,
            blockOffset: prefixOffsets.focus,
            direction: 'backward',
          })
          const focus = utils.blockOffsetToSpanSelectionPoint({
            value: context.value,
            blockOffset: suffixOffsets.anchor,
            direction: 'forward',
          })

          if (!anchor || !focus) {
            return false
          }

          return {
            prefixOffsets,
            suffixOffsets,
            decorator: italicDecorator,
            selection: {anchor, focus},
          }
        }

        const textToBold = getTextToBold(`${textBefore}${event.text}`)

        if (textToBold !== undefined && boldDecorator !== undefined) {
          const prefixOffsets = {
            anchor: {
              path: focusTextBlock.path,
              // Example: "foo **bar**".length - "**bar**".length = 4
              offset: `${textBefore}${event.text}`.length - textToBold.length,
            },
            focus: {
              path: focusTextBlock.path,
              // Example: "foo **bar**".length - "**bar**".length + 2 = 6
              offset:
                `${textBefore}${event.text}`.length - textToBold.length + 2,
            },
          }
          const suffixOffsets = {
            anchor: {
              path: focusTextBlock.path,
              // Example: "foo **bar*|" (10) + "*".length - 2 = 9
              offset: selectionStartOffset.offset + event.text.length - 2,
            },
            focus: {
              path: focusTextBlock.path,
              // Example: "foo **bar*|" (10) + "*".length = 11
              offset: selectionStartOffset.offset + event.text.length,
            },
          }
          const anchor = utils.blockOffsetToSpanSelectionPoint({
            value: context.value,
            blockOffset: prefixOffsets.focus,
            direction: 'backward',
          })
          const focus = utils.blockOffsetToSpanSelectionPoint({
            value: context.value,
            blockOffset: suffixOffsets.anchor,
            direction: 'forward',
          })

          if (!anchor || !focus) {
            return false
          }

          return {
            prefixOffsets,
            suffixOffsets,
            decorator: boldDecorator,
            selection: {anchor, focus},
          }
        }

        return false
      },
      actions: [
        ({event}) => [event],
        (_, {prefixOffsets, suffixOffsets, decorator, selection}) => [
          {
            type: 'decorator.add',
            decorator,
            selection,
          },
          {
            type: 'delete.text',
            ...suffixOffsets,
          },
          {
            type: 'delete.text',
            ...prefixOffsets,
          },
          {
            type: 'effect',
            effect: () => {
              sendBack({
                type: 'emphasis.add',
                blockOffset: {
                  ...suffixOffsets.anchor,
                  offset:
                    suffixOffsets.anchor.offset -
                    (prefixOffsets.focus.offset - prefixOffsets.anchor.offset),
                },
              })
            },
          },
        ],
      ],
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
      guard: ({context, event}) => {
        if (!event.selection) {
          return {blockOffsets: undefined}
        }

        const anchor = utils.spanSelectionPointToBlockOffset({
          value: context.value,
          selectionPoint: event.selection.anchor,
        })
        const focus = utils.spanSelectionPointToBlockOffset({
          value: context.value,
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
      italicDecorator?: string
      offsetAfterEmphasis?: utils.BlockOffset
      editor: Editor
    },
    input: {} as {
      boldDecorator?: string
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
