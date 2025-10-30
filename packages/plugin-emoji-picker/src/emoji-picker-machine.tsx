import type {
  ChildPath,
  Editor,
  EditorSelector,
  EditorSnapshot,
  PortableTextSpan,
} from '@portabletext/editor'
import {
  defineBehavior,
  effect,
  forward,
  raise,
} from '@portabletext/editor/behaviors'
import {
  getFocusSpan,
  getMarkState,
  getNextSpan,
  getPreviousSpan,
  isPointAfterSelection,
  isPointBeforeSelection,
  type MarkState,
} from '@portabletext/editor/selectors'
import {
  isEqualSelectionPoints,
  isSelectionCollapsed,
} from '@portabletext/editor/utils'
import {createKeyboardShortcut} from '@portabletext/keyboard-shortcuts'
import {
  defineInputRule,
  defineInputRuleBehavior,
  type InputRuleMatch,
} from '@portabletext/plugin-input-rule'
import {
  assertEvent,
  assign,
  fromCallback,
  not,
  sendTo,
  setup,
  type AnyEventObject,
  type CallbackLogicFunction,
} from 'xstate'
import type {BaseEmojiMatch, MatchEmojis} from './match-emojis'

/*******************
 * Keyboard shortcuts
 *******************/
const arrowUpShortcut = createKeyboardShortcut({
  default: [{key: 'ArrowUp'}],
})
const arrowDownShortcut = createKeyboardShortcut({
  default: [{key: 'ArrowDown'}],
})
const enterShortcut = createKeyboardShortcut({
  default: [{key: 'Enter'}],
})
const tabShortcut = createKeyboardShortcut({
  default: [{key: 'Tab'}],
})
const escapeShortcut = createKeyboardShortcut({
  default: [{key: 'Escape'}],
})

const getTriggerState: EditorSelector<
  | {
      focusSpan: {
        node: PortableTextSpan
        path: ChildPath
      }
      markState: MarkState
      focusSpanTextBefore: string
      focusSpanTextAfter: string
      previousSpan:
        | {
            node: PortableTextSpan
            path: ChildPath
          }
        | undefined
      nextSpan:
        | {
            node: PortableTextSpan
            path: ChildPath
          }
        | undefined
    }
  | undefined
> = (snapshot) => {
  const focusSpan = getFocusSpan(snapshot)
  const markState = getMarkState(snapshot)

  if (!focusSpan || !markState || !snapshot.context.selection) {
    return undefined
  }

  const focusSpanTextBefore = focusSpan.node.text.slice(
    0,
    snapshot.context.selection.focus.offset,
  )
  const focusSpanTextAfter = focusSpan.node.text.slice(
    snapshot.context.selection.focus.offset,
  )
  const previousSpan = getPreviousSpan(snapshot)
  const nextSpan = getNextSpan(snapshot)

  return {
    focusSpan,
    markState,
    focusSpanTextBefore,
    focusSpanTextAfter,
    previousSpan,
    nextSpan,
  }
}

function createTriggerActions({
  snapshot,
  payload,
  keywordState,
}: {
  snapshot: EditorSnapshot
  payload: ReturnType<typeof getTriggerState> & {lastMatch: InputRuleMatch}
  keywordState: 'partial' | 'complete'
}) {
  if (payload.markState.state === 'unchanged') {
    const focusSpan = {
      node: {
        _key: payload.focusSpan.node._key,
        _type: payload.focusSpan.node._type,
        text: `${payload.focusSpanTextBefore}${payload.lastMatch.text}${payload.focusSpanTextAfter}`,
        marks: payload.markState.marks,
      },
      path: payload.focusSpan.path,
      textBefore: payload.focusSpanTextBefore,
      textAfter: payload.focusSpanTextAfter,
    }

    if (keywordState === 'complete') {
      return [
        raise(
          createKeywordFoundEvent({
            focusSpan,
          }),
        ),
      ]
    }

    return [
      raise(
        createTriggerFoundEvent({
          focusSpan,
        }),
      ),
    ]
  }

  const newSpan = {
    _key: snapshot.context.keyGenerator(),
    _type: payload.focusSpan.node._type,
    text: payload.lastMatch.text,
    marks: payload.markState.marks,
  }

  let focusSpan = {
    node: {
      _key: newSpan._key,
      _type: newSpan._type,
      text: `${newSpan.text}${payload.nextSpan?.node.text ?? payload.focusSpanTextAfter}`,
      marks: payload.markState.marks,
    },
    path: [
      {_key: payload.focusSpan.path[0]._key},
      'children',
      {_key: newSpan._key},
    ] satisfies ChildPath,
    textBefore: '',
    textAfter: payload.nextSpan?.node.text ?? payload.focusSpanTextAfter,
  }

  if (
    payload.previousSpan &&
    payload.focusSpanTextBefore.length === 0 &&
    JSON.stringify(payload.previousSpan.node.marks ?? []) ===
      JSON.stringify(payload.markState.marks)
  ) {
    // The text will be inserted into the previous span, so we'll treat that
    // as the focus span

    focusSpan = {
      node: {
        _key: payload.previousSpan.node._key,
        _type: newSpan._type,
        text: `${payload.previousSpan.node.text}${newSpan.text}`,
        marks: newSpan.marks,
      },
      path: payload.previousSpan.path,
      textBefore: payload.previousSpan.node.text,
      textAfter: '',
    }
  }

  return [
    raise({type: 'select', at: payload.lastMatch.targetOffsets}),
    raise({type: 'delete', at: payload.lastMatch.targetOffsets}),
    raise({type: 'insert.child', child: newSpan}),
    ...(keywordState === 'complete'
      ? [
          raise(
            createKeywordFoundEvent({
              focusSpan,
            }),
          ),
        ]
      : [
          raise(
            createTriggerFoundEvent({
              focusSpan,
            }),
          ),
        ]),
  ]
}

/*******************
 * Input Rules
 *******************/

/**
 * Listen for a single colon insertion
 */
const triggerRule = defineInputRule({
  on: /:/,
  guard: ({snapshot, event}) => {
    const lastMatch = event.matches.at(-1)

    if (lastMatch === undefined) {
      return false
    }

    const triggerState = getTriggerState(snapshot)

    if (!triggerState) {
      return false
    }

    return {
      lastMatch,
      ...triggerState,
    }
  },
  actions: [
    ({snapshot}, payload) =>
      createTriggerActions({snapshot, payload, keywordState: 'partial'}),
  ],
})

type TriggerFoundEvent = ReturnType<typeof createTriggerFoundEvent>

function createTriggerFoundEvent(payload: {
  focusSpan: {
    node: PortableTextSpan
    path: ChildPath
    textBefore: string
    textAfter: string
  }
}) {
  return {
    type: 'custom.trigger found',
    ...payload,
  } as const
}

/**
 * Listen for a partial keyword like ":joy"
 */
const partialKeywordRule = defineInputRule({
  on: /:[\S]+/,
  guard: ({snapshot, event}) => {
    const lastMatch = event.matches.at(-1)

    if (lastMatch === undefined) {
      return false
    }

    if (lastMatch.targetOffsets.anchor.offset < event.textBefore.length) {
      return false
    }

    const triggerState = getTriggerState(snapshot)

    if (!triggerState) {
      return false
    }

    return {
      ...triggerState,
      lastMatch,
    }
  },
  actions: [
    ({snapshot}, payload) =>
      createTriggerActions({snapshot, payload, keywordState: 'partial'}),
  ],
})

/**
 * Listen for a complete keyword like ":joy:"
 */
const keywordRule = defineInputRule({
  on: /:[\S]+:/,
  guard: ({snapshot, event}) => {
    const lastMatch = event.matches.at(-1)

    if (lastMatch === undefined) {
      return false
    }

    if (lastMatch.targetOffsets.anchor.offset < event.textBefore.length) {
      return false
    }

    const triggerState = getTriggerState(snapshot)

    if (!triggerState) {
      return false
    }

    return {
      ...triggerState,
      lastMatch,
    }
  },
  actions: [
    ({snapshot}, payload) =>
      createTriggerActions({snapshot, payload, keywordState: 'complete'}),
  ],
})

type KeywordFoundEvent = ReturnType<typeof createKeywordFoundEvent>

function createKeywordFoundEvent(payload: {
  focusSpan: {
    node: PortableTextSpan
    path: ChildPath
    textBefore: string
    textAfter: string
  }
}) {
  return {
    type: 'custom.keyword found',
    ...payload,
  } as const
}

type EmojiPickerContext = {
  editor: Editor
  matches: ReadonlyArray<BaseEmojiMatch>
  matchEmojis: MatchEmojis<BaseEmojiMatch>
  selectedIndex: number
  focusSpan:
    | {
        node: PortableTextSpan
        path: ChildPath
        textBefore: string
        textAfter: string
      }
    | undefined
  incompleteKeywordRegex: RegExp
  keyword: string
}

type EmojiPickerEvent =
  | TriggerFoundEvent
  | KeywordFoundEvent
  | {
      type: 'selection changed'
    }
  | {
      type: 'dismiss'
    }
  | {
      type: 'navigate down'
    }
  | {
      type: 'navigate up'
    }
  | {
      type: 'navigate to'
      index: number
    }
  | {
      type: 'insert selected match'
    }

const triggerListenerCallback: CallbackLogicFunction<
  AnyEventObject,
  EmojiPickerEvent,
  {editor: Editor}
> = ({sendBack, input}) => {
  const unregisterBehaviors = [
    input.editor.registerBehavior({
      behavior: defineInputRuleBehavior({
        rules: [keywordRule, partialKeywordRule, triggerRule],
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
  ]

  return () => {
    for (const unregister of unregisterBehaviors) {
      unregister()
    }
  }
}

const escapeListenerCallback: CallbackLogicFunction<
  AnyEventObject,
  EmojiPickerEvent,
  {editor: Editor}
> = ({sendBack, input}) => {
  return input.editor.registerBehavior({
    behavior: defineBehavior({
      on: 'keyboard.keydown',
      guard: ({event}) => escapeShortcut.guard(event.originEvent),
      actions: [
        () => [
          effect(() => {
            sendBack({type: 'dismiss'})
          }),
        ],
      ],
    }),
  })
}

const arrowListenerCallback: CallbackLogicFunction<
  AnyEventObject,
  EmojiPickerEvent,
  {editor: Editor}
> = ({sendBack, input}) => {
  const unregisterBehaviors = [
    input.editor.registerBehavior({
      behavior: defineBehavior({
        on: 'keyboard.keydown',
        guard: ({event}) => arrowDownShortcut.guard(event.originEvent),
        actions: [
          () => [
            effect(() => {
              sendBack({type: 'navigate down'})
            }),
          ],
        ],
      }),
    }),
    input.editor.registerBehavior({
      behavior: defineBehavior({
        on: 'keyboard.keydown',
        guard: ({event}) => arrowUpShortcut.guard(event.originEvent),
        actions: [
          () => [
            effect(() => {
              sendBack({type: 'navigate up'})
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

const emojiInsertListener: CallbackLogicFunction<
  AnyEventObject,
  EmojiPickerEvent,
  {context: EmojiPickerContext}
> = ({sendBack, input}) => {
  return input.context.editor.registerBehavior({
    behavior: defineBehavior<{
      emoji: string
      focusSpan: {
        node: PortableTextSpan
        path: ChildPath
        textBefore: string
        textAfter: string
      }
    }>({
      on: 'custom.insert emoji',
      actions: [
        ({event}) => [
          effect(() => {
            sendBack({type: 'dismiss'})
          }),
          raise({
            type: 'delete',
            at: {
              anchor: {
                path: event.focusSpan.path,
                offset: event.focusSpan.textBefore.length,
              },
              focus: {
                path: event.focusSpan.path,
                offset:
                  event.focusSpan.node.text.length -
                  event.focusSpan.textAfter.length,
              },
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

const submitListenerCallback: CallbackLogicFunction<
  {type: 'context changed'; context: EmojiPickerContext},
  EmojiPickerEvent,
  {context: EmojiPickerContext}
> = ({sendBack, input, receive}) => {
  let context = input.context

  receive((event) => {
    context = event.context
  })

  const unregisterBehaviors = [
    input.context.editor.registerBehavior({
      behavior: defineBehavior({
        on: 'keyboard.keydown',
        guard: ({event}) => {
          if (
            !enterShortcut.guard(event.originEvent) &&
            !tabShortcut.guard(event.originEvent)
          ) {
            return false
          }

          const focusSpan = context.focusSpan
          const match = context.matches[context.selectedIndex]

          return match && focusSpan ? {focusSpan, emoji: match.emoji} : false
        },
        actions: [
          (_, {focusSpan, emoji}) => [
            raise({
              type: 'custom.insert emoji',
              emoji,
              focusSpan,
            }),
          ],
        ],
      }),
    }),
    input.context.editor.registerBehavior({
      behavior: defineBehavior({
        on: 'keyboard.keydown',
        guard: ({event}) =>
          enterShortcut.guard(event.originEvent) ||
          tabShortcut.guard(event.originEvent),
        actions: [
          () => [
            effect(() => {
              sendBack({type: 'dismiss'})
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
  EmojiPickerEvent,
  {editor: Editor}
> = ({sendBack, input}) => {
  const subscription = input.editor.on('selection', () => {
    sendBack({type: 'selection changed'})
  })

  return subscription.unsubscribe
}

const textInsertionListenerCallback: CallbackLogicFunction<
  {type: 'context changed'; context: EmojiPickerContext},
  EmojiPickerEvent,
  {context: EmojiPickerContext}
> = ({sendBack, input, receive}) => {
  let context = input.context

  receive((event) => {
    context = event.context
  })

  return input.context.editor.registerBehavior({
    behavior: defineBehavior({
      on: 'insert.text',
      guard: ({snapshot}) => {
        if (!context.focusSpan) {
          return false
        }

        if (!snapshot.context.selection) {
          return false
        }

        const keywordAnchor = {
          path: context.focusSpan.path,
          offset: context.focusSpan.textBefore.length,
        }

        return isEqualSelectionPoints(
          snapshot.context.selection.focus,
          keywordAnchor,
        )
      },
      actions: [
        ({event}) => [
          forward(event),
          effect(() => {
            sendBack({type: 'dismiss'})
          }),
        ],
      ],
    }),
  })
}

export const emojiPickerMachine = setup({
  types: {
    context: {} as EmojiPickerContext,
    input: {} as {
      editor: Editor
      matchEmojis: MatchEmojis
    },
    events: {} as EmojiPickerEvent,
  },
  actors: {
    'emoji insert listener': fromCallback(emojiInsertListener),
    'submit listener': fromCallback(submitListenerCallback),
    'arrow listener': fromCallback(arrowListenerCallback),
    'trigger listener': fromCallback(triggerListenerCallback),
    'escape listener': fromCallback(escapeListenerCallback),
    'selection listener': fromCallback(selectionListenerCallback),
    'text insertion listener': fromCallback(textInsertionListenerCallback),
  },
  actions: {
    'set focus span': assign({
      focusSpan: ({context, event}) => {
        if (
          event.type !== 'custom.trigger found' &&
          event.type !== 'custom.keyword found'
        ) {
          return context.focusSpan
        }

        return event.focusSpan
      },
    }),
    'update focus span': assign({
      focusSpan: ({context}) => {
        if (!context.focusSpan) {
          return undefined
        }

        const snapshot = context.editor.getSnapshot()
        const focusSpan = getFocusSpan(snapshot)

        if (!snapshot.context.selection) {
          return undefined
        }

        if (!focusSpan) {
          return undefined
        }

        const nextSpan = getNextSpan({
          ...snapshot,
          context: {
            ...snapshot.context,
            selection: {
              anchor: {
                path: context.focusSpan.path,
                offset: 0,
              },
              focus: {
                path: context.focusSpan.path,
                offset: 0,
              },
            },
          },
        })

        if (
          JSON.stringify(focusSpan.path) !==
          JSON.stringify(context.focusSpan.path)
        ) {
          if (
            nextSpan &&
            context.focusSpan.textAfter.length === 0 &&
            snapshot.context.selection.focus.offset === 0 &&
            isSelectionCollapsed(snapshot.context.selection)
          ) {
            // This is an edge case where the caret is moved from the end of
            // the focus span to the start of the next span.
            return context.focusSpan
          }

          return undefined
        }

        if (!focusSpan.node.text.startsWith(context.focusSpan.textBefore)) {
          return undefined
        }

        if (!focusSpan.node.text.endsWith(context.focusSpan.textAfter)) {
          return undefined
        }

        const keywordAnchor = {
          path: focusSpan.path,
          offset: context.focusSpan.textBefore.length,
        }
        const keywordFocus = {
          path: focusSpan.path,
          offset:
            focusSpan.node.text.length - context.focusSpan.textAfter.length,
        }

        const selectionIsBeforeKeyword =
          isPointAfterSelection(keywordAnchor)(snapshot)

        const selectionIsAfterKeyword =
          isPointBeforeSelection(keywordFocus)(snapshot)

        if (selectionIsBeforeKeyword || selectionIsAfterKeyword) {
          return undefined
        }

        return {
          node: focusSpan.node,
          path: focusSpan.path,
          textBefore: context.focusSpan.textBefore,
          textAfter: context.focusSpan.textAfter,
        }
      },
    }),
    'update keyword': assign({
      keyword: ({context}) => {
        if (!context.focusSpan) {
          return ''
        }

        if (
          context.focusSpan.textBefore.length > 0 &&
          context.focusSpan.textAfter.length > 0
        ) {
          return context.focusSpan.node.text.slice(
            context.focusSpan.textBefore.length,
            -context.focusSpan.textAfter.length,
          )
        }

        if (context.focusSpan.textBefore.length > 0) {
          return context.focusSpan.node.text.slice(
            context.focusSpan.textBefore.length,
          )
        }

        if (context.focusSpan.textAfter.length > 0) {
          return context.focusSpan.node.text.slice(
            0,
            -context.focusSpan.textAfter.length,
          )
        }

        return context.focusSpan.node.text
      },
    }),
    'update matches': assign({
      matches: ({context}) => {
        // Strip leading colon
        let rawKeyword = context.keyword.startsWith(':')
          ? context.keyword.slice(1)
          : context.keyword
        // Strip trailing colon
        rawKeyword =
          rawKeyword.length > 1 && rawKeyword.endsWith(':')
            ? rawKeyword.slice(0, -1)
            : rawKeyword

        if (rawKeyword === undefined) {
          return []
        }

        return context.matchEmojis({keyword: rawKeyword})
      },
    }),
    'reset selected index': assign({
      selectedIndex: 0,
    }),
    'increment selected index': assign({
      selectedIndex: ({context}) => {
        if (context.selectedIndex === context.matches.length - 1) {
          return 0
        }
        return context.selectedIndex + 1
      },
    }),
    'decrement selected index': assign({
      selectedIndex: ({context}) => {
        if (context.selectedIndex === 0) {
          return context.matches.length - 1
        }
        return context.selectedIndex - 1
      },
    }),
    'set selected index': assign({
      selectedIndex: ({event}) => {
        assertEvent(event, 'navigate to')

        return event.index
      },
    }),
    'update submit listener context': sendTo(
      'submit listener',
      ({context}) => ({
        type: 'context changed',
        context,
      }),
    ),
    'update text insertion listener context': sendTo(
      'text insertion listener',
      ({context}) => ({
        type: 'context changed',
        context,
      }),
    ),
    'insert selected match': ({context}) => {
      const match = context.matches[context.selectedIndex]

      if (!match || !context.focusSpan) {
        return
      }

      context.editor.send({
        type: 'custom.insert emoji',
        emoji: match.emoji,
        focusSpan: context.focusSpan,
      })
    },
    'reset': assign({
      focusSpan: undefined,
      keyword: '',
      matches: [],
      selectedIndex: 0,
    }),
  },
  guards: {
    'no focus span': ({context}) => {
      return !context.focusSpan
    },
    'has matches': ({context}) => {
      return context.matches.length > 0
    },
    'no matches': not('has matches'),
    'keyword is malformed': ({context}) => {
      return !context.incompleteKeywordRegex.test(context.keyword)
    },
    'keyword is direct match': ({context}) => {
      const fullKeywordRegex = /^:[\S]+:$/

      if (!fullKeywordRegex.test(context.keyword)) {
        return false
      }

      const match = context.matches.at(context.selectedIndex)

      if (!match || match.type !== 'exact') {
        return false
      }

      return true
    },
  },
}).createMachine({
  id: 'emoji picker',
  context: ({input}) => ({
    editor: input.editor,
    keyword: '',
    focusSpan: undefined,
    matchEmojis: input.matchEmojis,
    incompleteKeywordRegex: /^:[\S]*$/,
    matches: [],
    selectedIndex: 0,
  }),
  initial: 'idle',
  invoke: [
    {
      src: 'emoji insert listener',
      id: 'emoji insert listener',
      input: ({context}) => ({context}),
    },
  ],
  states: {
    idle: {
      entry: ['reset'],
      invoke: {
        src: 'trigger listener',
        input: ({context}) => ({editor: context.editor}),
      },
      on: {
        'custom.trigger found': {
          target: 'searching',
          actions: ['set focus span', 'update keyword'],
        },
        'custom.keyword found': {
          actions: [
            'set focus span',
            'update keyword',
            'update matches',
            'insert selected match',
          ],
          target: 'idle',
          reenter: true,
        },
      },
    },
    searching: {
      invoke: [
        {
          src: 'submit listener',
          id: 'submit listener',
          input: ({context}) => ({context}),
        },
        {
          src: 'escape listener',
          input: ({context}) => ({editor: context.editor}),
        },
        {
          src: 'selection listener',
          input: ({context}) => ({editor: context.editor}),
        },
        {
          src: 'text insertion listener',
          id: 'text insertion listener',
          input: ({context}) => ({context}),
        },
      ],
      on: {
        'dismiss': {
          target: 'idle',
        },
        'selection changed': [
          {
            actions: [
              'update focus span',
              'update keyword',
              'update matches',
              'reset selected index',
              'update submit listener context',
              'update text insertion listener context',
            ],
          },
        ],
      },
      always: [
        {
          guard: 'no focus span',
          target: 'idle',
        },
        {
          guard: 'keyword is malformed',
          target: 'idle',
        },
        {
          guard: 'keyword is direct match',
          actions: ['insert selected match'],
          target: 'idle',
        },
      ],
      initial: 'no matches showing',
      states: {
        'no matches showing': {
          entry: ['reset selected index'],
          always: {
            guard: 'has matches',
            target: 'showing matches',
          },
        },
        'showing matches': {
          invoke: {
            src: 'arrow listener',
            input: ({context}) => ({editor: context.editor}),
          },
          always: [
            {
              guard: 'no matches',
              target: 'no matches showing',
            },
          ],
          on: {
            'navigate down': {
              actions: [
                'increment selected index',
                'update submit listener context',
              ],
            },
            'navigate up': {
              actions: [
                'decrement selected index',
                'update submit listener context',
              ],
            },
            'navigate to': {
              actions: ['set selected index', 'update submit listener context'],
            },
            'insert selected match': {
              actions: ['insert selected match'],
            },
          },
        },
      },
    },
  },
})
