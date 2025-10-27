import type {
  BlockOffset,
  Editor,
  EditorSelectionPoint,
  EditorSnapshot,
} from '@portabletext/editor'
import {
  defineBehavior,
  effect,
  forward,
  raise,
} from '@portabletext/editor/behaviors'
import * as selectors from '@portabletext/editor/selectors'
import * as utils from '@portabletext/editor/utils'
import {createKeyboardShortcut} from '@portabletext/keyboard-shortcuts'
import {
  defineInputRule,
  defineInputRuleBehavior,
} from '@portabletext/plugin-input-rule'
import {
  assertEvent,
  assign,
  fromCallback,
  not,
  or,
  sendTo,
  setup,
  type AnyEventObject,
  type CallbackLogicFunction,
} from 'xstate'
import type {EmojiMatch, MatchEmojis} from './match-emojis'

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

/*******************
 * Input Rules
 *******************/

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

    return {
      keyword: lastMatch.text,
      keywordAnchor: {
        point: lastMatch.selection.anchor,
        blockOffset: lastMatch.targetOffsets.anchor,
      },
      keywordFocus: lastMatch.targetOffsets.focus,
    }
  },
  actions: [(_, payload) => [raise(createTriggerFoundEvent(payload))]],
})

type TriggerFoundEvent = ReturnType<typeof createTriggerFoundEvent>

function createTriggerFoundEvent(payload: {
  keyword: string
  keywordAnchor: {
    point: EditorSelectionPoint
    blockOffset: BlockOffset
  }
  keywordFocus: BlockOffset
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
  on: /:[a-zA-Z-_0-9]+/,
  guard: ({event}) => {
    const lastMatch = event.matches.at(-1)

    if (lastMatch === undefined) {
      return false
    }

    const keyword = lastMatch.text
    const keywordAnchor = {
      point: lastMatch.selection.anchor,
      blockOffset: lastMatch.targetOffsets.anchor,
    }
    const keywordFocus = lastMatch.targetOffsets.focus

    return {keyword, keywordAnchor, keywordFocus}
  },
  actions: [(_, payload) => [raise(createPartialKeywordFoundEvent(payload))]],
})

type PartialKeywordFoundEvent = ReturnType<
  typeof createPartialKeywordFoundEvent
>

function createPartialKeywordFoundEvent(payload: {
  keyword: string
  keywordAnchor: {
    point: EditorSelectionPoint
    blockOffset: BlockOffset
  }
  keywordFocus: BlockOffset
}) {
  return {
    type: 'custom.partial keyword found',
    ...payload,
  } as const
}

/**
 * Listen for a complete keyword like ":joy:"
 */
const keywordRule = defineInputRule({
  on: /:[a-zA-Z-_0-9]+:/,
  guard: ({event}) => {
    const lastMatch = event.matches.at(-1)

    if (lastMatch === undefined) {
      return false
    }

    const keyword = lastMatch.text
    const keywordAnchor = {
      point: lastMatch.selection.anchor,
      blockOffset: lastMatch.targetOffsets.anchor,
    }
    const keywordFocus = lastMatch.targetOffsets.focus

    return {keyword, keywordAnchor, keywordFocus}
  },
  actions: [(_, payload) => [raise(createKeywordFoundEvent(payload))]],
})

type KeywordFoundEvent = ReturnType<typeof createKeywordFoundEvent>

function createKeywordFoundEvent(payload: {
  keyword: string
  keywordAnchor: {
    point: EditorSelectionPoint
    blockOffset: BlockOffset
  }
  keywordFocus: BlockOffset
}) {
  return {
    type: 'custom.keyword found',
    ...payload,
  } as const
}

type EmojiPickerContext<TEmojiMatch = EmojiMatch> = {
  editor: Editor
  matches: ReadonlyArray<TEmojiMatch>
  matchEmojis: MatchEmojis<TEmojiMatch>
  selectedIndex: number
  keywordAnchor:
    | {
        point: EditorSelectionPoint
        blockOffset: BlockOffset
      }
    | undefined
  keywordFocus: BlockOffset | undefined
  incompleteKeywordRegex: RegExp
  keyword: string
}

type EmojiPickerEvent =
  | TriggerFoundEvent
  | PartialKeywordFoundEvent
  | KeywordFoundEvent
  | {
      type: 'selection changed'
      snapshot: EditorSnapshot
    }
  | {
      type: 'insert.text'
      focus: EditorSelectionPoint
      text: string
    }
  | {
      type: 'delete.backward'
      focus: EditorSelectionPoint
    }
  | {
      type: 'delete.forward'
      focus: EditorSelectionPoint
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
      anchor: BlockOffset
      focus: BlockOffset
    }>({
      on: 'custom.insert emoji',
      actions: [
        ({event}) => [
          effect(() => {
            sendBack({type: 'dismiss'})
          }),
          raise({
            type: 'delete.text',
            at: {anchor: event.anchor, focus: event.focus},
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

          const anchor = context.keywordAnchor?.blockOffset
          const focus = context.keywordFocus
          const match = context.matches[context.selectedIndex]

          return match && anchor && focus
            ? {anchor, focus, emoji: match.emoji}
            : false
        },
        actions: [
          (_, {anchor, focus, emoji}) => [
            raise({
              type: 'custom.insert emoji',
              emoji,
              anchor,
              focus,
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
    input.context.editor.registerBehavior({
      behavior: defineInputRuleBehavior({
        rules: [keywordRule],
      }),
    }),
    input.context.editor.registerBehavior({
      behavior: defineBehavior<
        KeywordFoundEvent,
        KeywordFoundEvent['type'],
        {
          anchor: BlockOffset
          focus: BlockOffset
          emoji: string
        }
      >({
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

const selectionListenerCallback: CallbackLogicFunction<
  AnyEventObject,
  EmojiPickerEvent,
  {editor: Editor}
> = ({sendBack, input}) => {
  const subscription = input.editor.on('selection', () => {
    const snapshot = input.editor.getSnapshot()
    sendBack({type: 'selection changed', snapshot})
  })

  return subscription.unsubscribe
}

const textChangeListener: CallbackLogicFunction<
  AnyEventObject,
  EmojiPickerEvent,
  {editor: Editor}
> = ({sendBack, input}) => {
  const unregisterBehaviors = [
    input.editor.registerBehavior({
      behavior: defineBehavior({
        on: 'insert.text',
        guard: ({snapshot}) =>
          snapshot.context.selection
            ? {focus: snapshot.context.selection.focus}
            : false,
        actions: [
          ({event}, {focus}) => [
            effect(() => {
              sendBack({
                ...event,
                focus,
              })
            }),
            forward(event),
          ],
        ],
      }),
    }),
    input.editor.registerBehavior({
      behavior: defineBehavior({
        on: 'delete.backward',
        guard: ({snapshot, event}) =>
          event.unit === 'character' && snapshot.context.selection
            ? {focus: snapshot.context.selection.focus}
            : false,
        actions: [
          ({event}, {focus}) => [
            effect(() => {
              sendBack({
                type: 'delete.backward',
                focus,
              })
            }),
            forward(event),
          ],
        ],
      }),
    }),
    input.editor.registerBehavior({
      behavior: defineBehavior({
        on: 'delete.forward',
        guard: ({snapshot, event}) =>
          event.unit === 'character' && snapshot.context.selection
            ? {focus: snapshot.context.selection.focus}
            : false,
        actions: [
          ({event}, {focus}) => [
            effect(() => {
              sendBack({
                type: 'delete.forward',
                focus,
              })
            }),
            forward(event),
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
    'text change listener': fromCallback(textChangeListener),
  },
  actions: {
    'init keyword': assign({
      keyword: ({context, event}) => {
        if (
          event.type !== 'custom.trigger found' &&
          event.type !== 'custom.partial keyword found' &&
          event.type !== 'custom.keyword found'
        ) {
          return context.keyword
        }

        return event.keyword
      },
    }),
    'set keyword anchor': assign({
      keywordAnchor: ({context, event}) => {
        if (
          event.type !== 'custom.trigger found' &&
          event.type !== 'custom.partial keyword found' &&
          event.type !== 'custom.keyword found'
        ) {
          return context.keywordAnchor
        }

        return event.keywordAnchor
      },
    }),
    'set keyword focus': assign({
      keywordFocus: ({context, event}) => {
        if (
          event.type !== 'custom.trigger found' &&
          event.type !== 'custom.partial keyword found' &&
          event.type !== 'custom.keyword found'
        ) {
          return context.keywordFocus
        }

        return event.keywordFocus
      },
    }),
    'update keyword focus': assign({
      keywordFocus: ({context, event}) => {
        assertEvent(event, ['insert.text', 'delete.backward', 'delete.forward'])

        if (!context.keywordFocus) {
          return context.keywordFocus
        }

        return {
          path: context.keywordFocus.path,
          offset:
            event.type === 'insert.text'
              ? context.keywordFocus.offset + event.text.length
              : event.type === 'delete.backward' ||
                  event.type === 'delete.forward'
                ? context.keywordFocus.offset - 1
                : event.focus.offset,
        }
      },
    }),
    'update keyword': assign({
      keyword: ({context, event}) => {
        assertEvent(event, 'selection changed')

        if (!context.keywordAnchor || !context.keywordFocus) {
          return ''
        }

        const keywordFocusPoint = utils.blockOffsetToSpanSelectionPoint({
          context: event.snapshot.context,
          blockOffset: context.keywordFocus,
          direction: 'forward',
        })

        if (!keywordFocusPoint) {
          return ''
        }

        return selectors.getSelectionText({
          ...event.snapshot,
          context: {
            ...event.snapshot.context,
            selection: {
              anchor: context.keywordAnchor.point,
              focus: keywordFocusPoint,
            },
          },
        })
      },
    }),
    'update matches': assign({
      matches: ({context}) => {
        // Strip leading colon
        let rawKeyword = context.keyword.startsWith(':')
          ? context.keyword.slice(1)
          : context.keyword
        // Strip trailing colon
        rawKeyword = rawKeyword.endsWith(':')
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
    'update emoji insert listener context': sendTo(
      'emoji insert listener',
      ({context}) => ({
        type: 'context changed',
        context,
      }),
    ),
    'update submit listener context': sendTo(
      'submit listener',
      ({context}) => ({
        type: 'context changed',
        context,
      }),
    ),
    'insert selected match': ({context, event}) => {
      const match = context.matches[context.selectedIndex]

      if (!match || !context.keywordAnchor || !context.keywordFocus) {
        return
      }

      if (event.type === 'custom.keyword found' && match.type !== 'exact') {
        return
      }

      context.editor.send({
        type: 'custom.insert emoji',
        emoji: match.emoji,
        anchor: context.keywordAnchor.blockOffset,
        focus: context.keywordFocus,
      })
    },
    'reset': assign({
      keywordAnchor: undefined,
      keywordFocus: undefined,
      keyword: '',
      matches: [],
      selectedIndex: 0,
    }),
  },
  guards: {
    'has matches': ({context}) => {
      return context.matches.length > 0
    },
    'no matches': not('has matches'),
    'keyword is wel-formed': ({context}) => {
      return context.incompleteKeywordRegex.test(context.keyword)
    },
    'keyword is malformed': not('keyword is wel-formed'),
    'selection is before keyword': ({context, event}) => {
      assertEvent(event, 'selection changed')

      if (!context.keywordAnchor) {
        return true
      }

      return selectors.isPointAfterSelection(context.keywordAnchor.point)(
        event.snapshot,
      )
    },
    'selection is after keyword': ({context, event}) => {
      assertEvent(event, 'selection changed')

      if (context.keywordFocus === undefined) {
        return true
      }

      const keywordFocusPoint = utils.blockOffsetToSpanSelectionPoint({
        context: event.snapshot.context,
        blockOffset: context.keywordFocus,
        direction: 'forward',
      })

      if (!keywordFocusPoint) {
        return true
      }

      return selectors.isPointBeforeSelection(keywordFocusPoint)(event.snapshot)
    },
    'selection is expanded': ({event}) => {
      assertEvent(event, 'selection changed')

      return selectors.isSelectionExpanded(event.snapshot)
    },
    'selection moved unexpectedly': or([
      'selection is before keyword',
      'selection is after keyword',
      'selection is expanded',
    ]),
    'unexpected text insertion': ({context, event}) => {
      if (event.type !== 'insert.text') {
        return false
      }

      if (!context.keywordAnchor) {
        return false
      }

      const snapshot = context.editor.getSnapshot()

      const textInsertedBeforeKeyword =
        selectors.isPointBeforeSelection(event.focus)({
          ...snapshot,
          context: {
            ...snapshot.context,
            selection: {
              anchor: context.keywordAnchor.point,
              focus: context.keywordAnchor.point,
            },
          },
        }) ||
        utils.isEqualSelectionPoints(event.focus, context.keywordAnchor.point)

      return textInsertedBeforeKeyword
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5RgLYHsBWBLABABywGMBrMAJwDosIAbMAYkLRrQDsctXZyAXSAbQAMAXUSg8aWFh5Y2YkAA9EARmUB2AJwUAzADYNADgCs65YO1q1ygDQgAnojUG1O5c+W7tAJmdfdRgF8A21RMXAIScgpuAEMyQgALTih6Tm4yHgo+BR4hUSQQCSkZOQKlBABaZW0DHSMAFksNQUF6oyNzL1sHBC9vCnrGtS8GtQaNNt0gkPRsfCJSSlj4pNYUiDA6PgoAMzQyAHc4iDz5IulZVnlyr3MKE30LA31DZoNuxD6vAaHdP29vOo1NNwLNwgsostEsl6BstmAKAAjGIkI5kE4iM6SC6lUDlerabT3arDfS3eoaPQfXr9QaWEaNcaTEGhOYRRbRMBxaFrWFYWAofmwU4Fc4lK5lFTqWqDAwUjReeoGbwaNTU1TPCh-QxNNS6XQGHwssHzSJLLkrGHcOiEcU4RIxNYCTGi7Hi66IfxE1oeZX1EbeZXUhUUZSKjxOOV6bTmY1hU0cqGrFLWsC2y72hKOmAnZT5cRuy4ehDVXQUVXDIyWGpmAzveyfLRKwQaVRVwR1ixeONsiHm7nJ+gigvFIuSkvKVuhgwaEwKmMKwbqkaCAaverqVuvKbBUHx9mQi08qAUVhoHAoGI8RJwHCwBJoA4w4eFQu4xSfaoDA3KOmCVSTn06r-i4-hGH0ZiEoI4H1D24JmpyA7JNED5PmsF5XjesD0KwMQAG5YFAV5gDgECPqwL5imOeKIIM9ShsoRh1i2erPB41L6C40GqISUb6n8cEJoeSFrChj7JBh14JHAOH4YRxE4AArnglFvhKNEIGoq4+E0yraPULa6PUHGqhQ3HVDUBL8dogkHv2lqife4noZeUkybhBFEXwOA8Ggqmju+5RGPqFBqP6ujDD4v4tjYDYIMqLjVKo5gdM4TGBLurLwYmR7JmJaFQJJWGpFwvB3psaZ8BARUJP5OLqR+CD1Loq5ymYfyeP4spGOqv70fpv7NBSBKtBlMz7n2iEOSeTkFTVMl1e645eB49wGP+K0UpBbjaMBzQUF4IzBYq7TNa2QS7meGzwAUWVCWQWIBQ15RVJq2ijJoLRtB03jUhUVYUHKtz-gqeoxkYGi2ZN1B0I99XFqobTlh4-5-Ot4H1j0ZirbcENhR4RmKrBmUmnZU3HnDS0aVUjHlh2cqtkqfTBdSSr0RMGieBS7htASUMIUmyFnvNsB3qhySU9RjUVBFdN1ltTPvbowZOGZEWHe9xgTHo-M5SJM3iy5mHSTdI7w+OlnlgY6heJzbgUv4ytxaqtSCBFg1eJFM4XQEQA */
  id: 'emoji picker',
  context: ({input}) => ({
    editor: input.editor,
    keyword: '',
    keywordAnchor: undefined,
    keywordFocus: undefined,
    matchEmojis: input.matchEmojis,
    incompleteKeywordRegex: /:([a-zA-Z-_0-9:]*)$/,
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
          actions: ['set keyword anchor', 'set keyword focus', 'init keyword'],
        },
        'custom.partial keyword found': {
          target: 'searching',
          actions: ['set keyword anchor', 'set keyword focus', 'init keyword'],
        },
        'custom.keyword found': {
          actions: [
            'set keyword anchor',
            'set keyword focus',
            'init keyword',
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
          src: 'text change listener',
          input: ({context}) => ({editor: context.editor}),
        },
      ],
      on: {
        'custom.keyword found': {
          actions: [
            'set keyword anchor',
            'set keyword focus',
            'init keyword',
            'update matches',
            'insert selected match',
          ],
        },
        'insert.text': [
          {
            guard: 'unexpected text insertion',
            target: 'idle',
          },
          {
            actions: ['update keyword focus'],
          },
        ],
        'delete.forward': {
          actions: ['update keyword focus'],
        },
        'delete.backward': {
          actions: ['update keyword focus'],
        },
        'dismiss': {
          target: 'idle',
        },
        'selection changed': [
          {
            guard: 'selection moved unexpectedly',
            target: 'idle',
          },
          {
            actions: [
              'update keyword',
              'update matches',
              'reset selected index',
              'update submit listener context',
            ],
          },
        ],
      },
      always: [
        {
          guard: 'keyword is malformed',
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
