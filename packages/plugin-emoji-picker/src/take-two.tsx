import {useEditor, type BlockOffset, type Editor} from '@portabletext/editor'
import {
  defineBehavior,
  effect,
  forward,
  raise,
} from '@portabletext/editor/behaviors'
import {
  isPointAfterSelection,
  isPointBeforeSelection,
  isSelectionExpanded,
} from '@portabletext/editor/selectors'
import {blockOffsetToSpanSelectionPoint} from '@portabletext/editor/utils'
import {createKeyboardShortcut} from '@portabletext/keyboard-shortcuts'
import {
  createInputRuleBehavior,
  defineInputRule,
  type InputRuleMatch,
} from '@portabletext/plugin-input-rule'
import {useActorRef, useSelector} from '@xstate/react'
import {
  assign,
  fromCallback,
  or,
  setup,
  type AnyEventObject,
  type CallbackLogicFunction,
} from 'xstate'
import {emojis} from './emojis'
import {
  createMatchEmojis,
  type EmojiMatch,
  type MatchEmojis,
} from './match-emojis'

/**
 * @public
 */
export function useEmojiPickerTakeTwo() {
  const editor = useEditor()
  const emojiPickerActor = useActorRef(emojiPickerMachine, {
    input: {editor, matchEmojis: createMatchEmojis({emojis})},
  })
  const matches = useSelector(
    emojiPickerActor,
    (snapshot) => snapshot.context.matches,
  )
  const keyword = useSelector(
    emojiPickerActor,
    (snapshot) => snapshot.context.keyword,
  )
  const keywordOffsets = useSelector(
    emojiPickerActor,
    (snapshot) => snapshot.context.keywordOffsets,
  )

  console.log({matches, keyword, keywordOffsets})
}

/**
 * Keyboard shortcuts
 */
const arrowUp = createKeyboardShortcut({
  default: [{key: 'ArrowUp'}],
})
const arrowDown = createKeyboardShortcut({
  default: [{key: 'ArrowDown'}],
})
const escape = createKeyboardShortcut({
  default: [{key: 'Escape'}],
})
const enter = createKeyboardShortcut({
  default: [{key: 'Enter'}],
})
const tab = createKeyboardShortcut({
  default: [{key: 'Tab'}],
})

const navigateUp = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({event}) => arrowUp.guard(event.originEvent),
  actions: [],
})

const navigateDown = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({event}) => arrowDown.guard(event.originEvent),
  actions: [],
})

const dismiss = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({event}) => escape.guard(event.originEvent),
  actions: [],
})

const insert = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({event}) =>
    enter.guard(event.originEvent) || tab.guard(event.originEvent),
  actions: [],
})

type NavigationEvent = {type: 'navigate up'} | {type: 'navigate down'}
type SelectionEvent = {type: 'selection changed'}
type InsertTextEvent = {type: 'insert.text'; text: string}
type EmojiPickerMachineEvent =
  | TriggerFoundEvent
  | PartialKeywordFoundEvent
  | KeywordFoundEvent
  | NavigationEvent
  | SelectionEvent
  | InsertTextEvent

// const triggerListenerCallback: CallbackLogicFunction<
//   AnyEventObject,
//   EmojiPickerMachineEvent,
//   {editor: Editor}
// > = ({input, sendBack}) => {
//   const unregisterBehaviors = [
//     input.editor.registerBehavior({
//       behavior: createInputRuleBehavior({
//         rules: [defineInputRule({
//           on: /:([a-zA-Z-_0-9]+):/,

//         })],
//       }),
//     }),
//     input.editor.registerBehavior({
//       behavior: defineBehavior<TriggerFoundEvent, TriggerFoundEvent['type']>({
//         on: 'custom.trigger found',
//         actions: [
//           ({event}) => [
//             effect(() => {
//               sendBack(event)
//             }),
//           ],
//         ],
//       }),
//     }),
//   ]

//   return () => {
//     for (const unregister of unregisterBehaviors) {
//       unregister()
//     }
//   }
// }

const triggerListenerCallback: CallbackLogicFunction<
  AnyEventObject,
  EmojiPickerMachineEvent,
  {editor: Editor}
> = ({input, sendBack}) => {
  const unregisterBehaviors = [
    input.editor.registerBehavior({
      behavior: createInputRuleBehavior({
        rules: [
          // Listening for a complete match takes precedence
          keywordRule,
          // Next, we check for a partial match
          partialKeywordRule,
          // Finally, we check for a single colon insertion
          triggerRule,
        ],
      }),
    }),
    input.editor.registerBehavior({
      behavior: defineBehavior<TriggerFoundEvent, TriggerFoundEvent['type']>({
        on: 'custom.trigger found',
        actions: [
          ({event}) => [
            effect(() => {
              sendBack(event)
            }),
          ],
        ],
      }),
    }),
    input.editor.registerBehavior({
      behavior: defineBehavior<
        PartialKeywordFoundEvent,
        PartialKeywordFoundEvent['type']
      >({
        on: 'custom.partial keyword found',
        actions: [
          ({event}) => [
            effect(() => {
              sendBack(event)
            }),
          ],
        ],
      }),
    }),
    input.editor.registerBehavior({
      behavior: defineBehavior<KeywordFoundEvent, KeywordFoundEvent['type']>({
        on: 'custom.keyword found',
        actions: [
          ({event}) => [
            effect(() => {
              sendBack(event)
            }),
          ],
        ],
      }),
    }),
  ]

  return () => {
    for (const unregister of unregisterBehaviors) {
      unregister()
    }
  }
}

const navigationListenerCallback: CallbackLogicFunction<
  AnyEventObject,
  EmojiPickerMachineEvent,
  {editor: Editor}
> = ({input, sendBack}) => {
  const unregisterBehaviors = [
    input.editor.registerBehavior({
      behavior: defineBehavior({
        on: 'keyboard.keydown',
        guard: ({event}) => arrowUp.guard(event.originEvent),
        actions: [
          () => [
            effect(() => {
              sendBack({type: 'navigate up'})
            }),
          ],
        ],
      }),
    }),
    input.editor.registerBehavior({
      behavior: defineBehavior({
        on: 'keyboard.keydown',
        guard: ({event}) => arrowDown.guard(event.originEvent),
        actions: [
          () => [
            effect(() => {
              sendBack({type: 'navigate down'})
            }),
          ],
        ],
      }),
    }),
  ]

  return () => {
    for (const unregister of unregisterBehaviors) {
      unregister()
    }
  }
}

const selectionListenerCallback: CallbackLogicFunction<
  AnyEventObject,
  EmojiPickerMachineEvent,
  {editor: Editor}
> = ({input, sendBack}) => {
  return input.editor.on('selection', () => {
    console.log('selection changed')
    sendBack({type: 'selection changed'})
  }).unsubscribe
}

const insertTextListenerCallback: CallbackLogicFunction<
  AnyEventObject,
  EmojiPickerMachineEvent,
  {editor: Editor}
> = ({input, sendBack}) => {
  return input.editor.registerBehavior({
    behavior: defineBehavior({
      on: 'insert.text',
      actions: [
        ({event}) => [
          forward(event),
          effect(() => {
            sendBack({type: 'insert.text', text: event.text})
          }),
        ],
      ],
    }),
  })
}

const insertEmojiListenerCallback: CallbackLogicFunction<
  AnyEventObject,
  EmojiPickerMachineEvent,
  {editor: Editor}
> = ({input}) => {
  return input.editor.registerBehavior({
    behavior: defineBehavior<InsertEmojiEvent, InsertEmojiEvent['type']>({
      on: 'custom.insert emoji',
      actions: [
        ({event}) => [
          raise({
            type: 'delete',
            at: {
              anchor: event.anchor,
              focus: event.focus,
            },
          }),
          raise({
            type: 'insert.text',
            text: event.emoji,
          }),
        ],
      ],
    }),
  })
}

const emojiPickerMachine = setup({
  types: {
    context: {} as {
      editor: Editor
      matchEmojis: MatchEmojis
      matches: ReadonlyArray<EmojiMatch>
      selectedIndex: number
      keyword: string
      keywordOffsets:
        | {
            anchor: BlockOffset
            focus: BlockOffset
          }
        | undefined
    },
    input: {} as {
      editor: Editor
      matchEmojis: MatchEmojis
    },
    events: {} as EmojiPickerMachineEvent,
  },
  actors: {
    'trigger listener': fromCallback(triggerListenerCallback),
    'navigation listener': fromCallback(navigationListenerCallback),
    'selection listener': fromCallback(selectionListenerCallback),
    'insert text listener': fromCallback(insertTextListenerCallback),
    'insert emoji listener': fromCallback(insertEmojiListenerCallback),
  },
  guards: {
    'has keyword': ({context}) => context.keyword.length > 0,
    'has matches': ({context}) => context.matches.length > 0,
    'selection moved unexpectedly': or([
      'selection is before keyword',
      'selection is after keyword',
      'selection is expanded',
    ]),
    'selection is expanded': ({context}) =>
      isSelectionExpanded(context.editor.getSnapshot()),
    'selection is before keyword': ({context}) => {
      if (!context.keywordOffsets) {
        return false
      }
      const keywordAnchor = blockOffsetToSpanSelectionPoint({
        context: context.editor.getSnapshot().context,
        blockOffset: context.keywordOffsets.anchor,
        direction: 'backward',
      })

      if (!keywordAnchor) {
        return false
      }

      return isPointAfterSelection(keywordAnchor)(context.editor.getSnapshot())
    },
    'selection is after keyword': ({context}) => {
      if (!context.keywordOffsets) {
        return false
      }
      const keywordFocus = blockOffsetToSpanSelectionPoint({
        context: context.editor.getSnapshot().context,
        blockOffset: context.keywordOffsets.focus,
        direction: 'forward',
      })
      if (!keywordFocus) {
        return false
      }

      return isPointBeforeSelection(keywordFocus)(context.editor.getSnapshot())
    },
  },
  actions: {
    'insert selected match': ({context}) => {
      const match = context.matches.at(context.selectedIndex)

      if (!match || !context.keywordOffsets) {
        return
      }

      context.editor.send({
        type: 'custom.insert emoji',
        emoji: match.emoji,
        anchor: context.keywordOffsets.anchor,
        focus: context.keywordOffsets.focus,
      })
    },
    'reset': assign({
      keyword: '',
      keywordOffsets: undefined,
      matches: [],
      selectedIndex: 0,
    }),
    'update keyword': assign({
      keyword: ({context, event}) => {
        if (event.type === 'custom.partial keyword found') {
          return event.keyword
        }
        if (event.type === 'custom.keyword found') {
          return event.keyword
        }

        console.log(event)

        return context.keyword
      },
    }),
    'update keyword offsets': assign({
      keywordOffsets: ({context, event}) => {
        if (event.type === 'custom.partial keyword found') {
          return event.offsets
        }
        if (event.type === 'custom.keyword found') {
          return event.offsets
        }
        return context.keywordOffsets
      },
    }),
    'update matches': assign({
      matches: ({context, event}) => {
        if (event.type === 'custom.partial keyword found') {
          return context.matchEmojis({keyword: event.keyword})
        }
        if (event.type === 'custom.keyword found') {
          return context.matchEmojis({keyword: event.keyword})
        }
        return context.matches
      },
    }),
  },
}).createMachine({
  id: 'emoji picker',
  context: ({input}) => ({
    editor: input.editor,
    keyword: '',
    keywordOffsets: undefined,
    matchEmojis: input.matchEmojis,
    matches: [],
    selectedIndex: 0,
  }),
  initial: 'idle',
  invoke: [
    {
      src: 'insert emoji listener',
      input: ({context}) => ({editor: context.editor}),
    },
  ],
  states: {
    idle: {
      entry: ['reset'],
      always: {
        guard: 'has keyword',
        target: 'searching',
      },
      invoke: {
        src: 'trigger listener',
        input: ({context}) => ({editor: context.editor}),
      },
      on: {
        'custom.partial keyword found': {
          actions: [
            'update keyword',
            'update keyword offsets',
            'update matches',
          ],
          target: 'searching',
        },
        'custom.trigger found': {
          actions: [
            'update keyword',
            'update keyword offsets',
            'update matches',
          ],
          target: 'searching',
        },
        'custom.keyword found': {
          actions: [
            'update keyword',
            'update keyword offsets',
            'update matches',
            'insert selected match',
          ],
          target: 'idle',
          reenter: true,
        },
      },
    },
    searching: {
      initial: 'no matches',
      invoke: [
        {
          src: 'selection listener',
          input: ({context}) => ({editor: context.editor}),
        },
        {
          src: 'insert text listener',
          input: ({context}) => ({editor: context.editor}),
        },
      ],
      on: {
        'selection changed': [
          {
            guard: 'selection moved unexpectedly',
            target: 'idle',
          },
        ],
        'insert.text': [
          {
            actions: ['update keyword'],
          },
        ],
      },
      states: {
        'no matches': {
          always: {
            guard: 'has matches',
            target: 'matches',
          },
        },
        'matches': {},
      },
    },
  },
})

type InsertEmojiEvent = ReturnType<typeof createInsertEmojiEvent>

function createInsertEmojiEvent(payload: {
  emoji: string
  anchor: BlockOffset
  focus: BlockOffset
}) {
  return {
    type: 'custom.insert emoji',
    emoji: payload.emoji,
    anchor: payload.anchor,
    focus: payload.focus,
  } as const
}

/**
 * Listen for a single colon insertion
 */
const triggerRule = defineInputRule({
  on: /:/,
  guard: ({event}) => {
    const lastMatch = event.matches.at(-1)

    if (lastMatch === undefined) {
      return false
    }

    return {offsets: lastMatch.targetOffsets}
  },
  actions: [(_, {offsets}) => [raise(createTriggerFoundEvent(offsets))]],
})

type TriggerFoundEvent = ReturnType<typeof createTriggerFoundEvent>

function createTriggerFoundEvent(offsets: InputRuleMatch['targetOffsets']) {
  return {
    type: 'custom.trigger found',
    offsets,
  } as const
}

/**
 * Listen for a partial keyword like ":joy"
 */
const partialKeywordRule = defineInputRule({
  on: /:([a-zA-Z-_0-9]+)/,
  guard: ({event}) => {
    const lastMatch = event.matches.at(-1)
    const keywordMatch = lastMatch?.groupMatches.at(0)

    if (lastMatch === undefined || keywordMatch === undefined) {
      return false
    }

    const keyword = keywordMatch.text
    const offsets = keywordMatch.targetOffsets

    return {keyword, offsets}
  },
  actions: [
    (_, {keyword, offsets}) => [
      raise(createPartialKeywordFoundEvent(keyword, offsets)),
    ],
  ],
})

type PartialKeywordFoundEvent = ReturnType<
  typeof createPartialKeywordFoundEvent
>

function createPartialKeywordFoundEvent(
  keyword: string,
  offsets: InputRuleMatch['targetOffsets'],
) {
  return {
    type: 'custom.partial keyword found',
    keyword,
    offsets,
  } as const
}

/**
 * Listen for a complete keyword like ":joy:"
 */
const keywordRule = defineInputRule({
  on: /:([a-zA-Z-_0-9]+):/,
  guard: ({event}) => {
    const lastMatch = event.matches.at(-1)
    const keywordMatch = lastMatch?.groupMatches.at(0)

    if (lastMatch === undefined || keywordMatch === undefined) {
      return false
    }

    const keyword = keywordMatch.text
    const offsets = keywordMatch.targetOffsets

    return {keyword, offsets}
  },
  actions: [
    (_, {keyword, offsets}) => [
      raise(createKeywordFoundEvent(keyword, offsets)),
    ],
  ],
})

type KeywordFoundEvent = ReturnType<typeof createKeywordFoundEvent>

function createKeywordFoundEvent(
  keyword: string,
  offsets: InputRuleMatch['targetOffsets'],
) {
  return {
    type: 'custom.keyword found',
    keyword,
    offsets,
  } as const
}
