/**
 * # Emoji Picker Architecture
 *
 * ## Context
 *
 * The emoji picker is modelled as a state machine with the following
 * information in its context:
 *
 * - The `editor` instance (required)
 * - The `keyword` being searched for (defaults to `""`)
 * - The `keywordOffsets` in the text (defaults to `undefined`)
 * - The `matchEmojis` function (required)
 * - The `matches` found for the keyword (defaults to `[]`)
 * - The `selectedIndex` (defaults to `0`)
 *
 * The emoji picker starts in an "idle" state.
 *
 * ## Triggering the emoji picker
 *
 * To trigger the emoji picker, we use Input Rules that listen for:
 *
 * 1. A single colon insertion (e.g. ":")
 * 2. A partial keyword insertion (e.g. ":joy")
 * 3. A complete keyword insertion (e.g. ":joy:")
 *
 * Input Rules are the best option here, instead of listening to the raw
 * `insert.text` event, because they are more ergonomic to write and abstract
 * over complexities like handling mobile support.
 *
 * If a complete keyword is matched in the "idle" state, then the emoji picker
 * will attempt to insert it into the text. This happens by:
 *
 * 1. Extracting the `keyword`
 * 2. Narrowing the `matches` using the `keyword` together with the
 * `matchEmojis` function.
 * 3. Picking the `selectedIndex` (should be `0` at this point)
 *
 * If a match is found, the keyword offsets are deleted and the emoji is
 * inserted into the text. Regardless of whether an emoji was inserted or not,
 * the emoji picker returns to the "idle" state and everything is reset.
 *
 * If only a colon (the most likely case) or a partial keyword is matched, the
 * emoji picker will enter a "searching" state. At this point the current
 * `keyword`, `keywordOffsets` and `matches` are updated.
 *
 * ## Searching for matches
 *
 * By now we have a `keyword` (potentially just `""`) and a pair of offsets,
 * `keywordOffsets` (potentially a collapsed selection), pointing to the
 * position of the `keyword` in the text.
 *
 * The challenging part is to keep track of the keyword and account for all
 * sorts of changes that could happen in the editor:
 *
 * 1. We need a listener that listens for selection changes, and if the current
 * selection is either expanded, before the keyword or after the keyword, we
 * transition back to the "idle" state.
 *
 * 2. We need a listener that a complete keyword match, and if so, we transition
 * to the "idle" state and insert the emoji, just like in the "idle" state.
 *
 * 3. We need a listener that listens for ordinary text insertions and updates the
 * `keyword` accordingly and `keywordOffsets` accordingly. Next, the `matches`
 * are narrow and the `selectedIndex` is reset to `0`.
 *
 * 4. We need a listener that listens for delete.backward and delete.forward keyboard
 * events and do similar updates as the text insertion listener.
 *
 * 5. We need a listener that listens for Enter and Tab keyboard events and
 * attempts to insert the currently selected match. Regardless of whether an
 * emoji was inserted or not, the emoji picker returns to the "idle" state and
 * everything is reset.
 *
 * 6. We need a listener that listens for Escape keyboard events and transitions
 * back to the "idle" state. Everything is reset.
 *
 * 1. "no matches"
 * 2. "matches"
 *
 * It automatically transitions to the "matches" substate if the `matches`
 * array is lengthy. Remember, the `matchEmojis` function is used to narrow down
 * the `matches` array based on the `keyword` whenever the `keyword` changes.
 *
 * In the "matches" substate, the emoji picker will listen for:
 *
 * 1. ArrowUp and ArrowDown keyboard events to move the `selectedIndex`. In
 * this case the length of the `matches` array is used to determine if the
 * index should wrap around to the beginning or end of the array.
 * 2. Explicit `navigate to` events to move the `selectedIndex` to a specific index.
 *
 */

import {
  useEditor,
  type BlockOffset,
  type Editor,
  type EditorSelectionPoint,
} from '@portabletext/editor'
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
export function useEmojiPickerTakeThree() {
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
  const selectedIndex = useSelector(
    emojiPickerActor,
    (snapshot) => snapshot.context.selectedIndex,
  )
  const isSearching = useSelector(emojiPickerActor, (snapshot) =>
    snapshot.matches('searching'),
  )

  console.log({keyword, keywordOffsets, selectedIndex, matches})

  return {
    matches,
    keyword,
    keywordOffsets,
    selectedIndex,
    isSearching,
    navigateTo: (index: number) => {
      emojiPickerActor.send({type: 'navigate to', index})
    },
  }
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

/**
 * Event types
 */
type TriggerFoundEvent = {
  type: 'custom.trigger found'
  offsets: {anchor: BlockOffset; focus: BlockOffset}
}

type PartialKeywordFoundEvent = {
  type: 'custom.partial keyword found'
  keyword: string
  offsets: {anchor: BlockOffset; focus: BlockOffset}
}

type KeywordFoundEvent = {
  type: 'custom.keyword found'
  keyword: string
  offsets: {anchor: BlockOffset; focus: BlockOffset}
}

type NavigationEvent =
  | {type: 'navigate up'}
  | {type: 'navigate down'}
  | {type: 'navigate to'; index: number}

type SelectionEvent = {type: 'selection changed'}

type InsertTextEvent = {
  type: 'insert.text'
  text: string
  focus: EditorSelectionPoint
}

type DeleteBackwardEvent = {
  type: 'delete.backward'
  focus: EditorSelectionPoint
}

type DeleteForwardEvent = {
  type: 'delete.forward'
  focus: EditorSelectionPoint
}

type DismissEvent = {type: 'dismiss'}

type InsertSelectedMatchEvent = {type: 'insert selected match'}

type EmojiPickerMachineEvent =
  | TriggerFoundEvent
  | PartialKeywordFoundEvent
  | KeywordFoundEvent
  | NavigationEvent
  | SelectionEvent
  | InsertTextEvent
  | DeleteBackwardEvent
  | DeleteForwardEvent
  | DismissEvent
  | InsertSelectedMatchEvent

/**
 * Callback actor that listens for input rule triggers
 */
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

/**
 * Callback actor that listens for navigation events (arrow keys)
 */
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

/**
 * Callback actor that listens for selection changes
 */
const selectionListenerCallback: CallbackLogicFunction<
  AnyEventObject,
  EmojiPickerMachineEvent,
  {editor: Editor}
> = ({input, sendBack}) => {
  return input.editor.on('selection', () => {
    sendBack({type: 'selection changed'})
  }).unsubscribe
}

/**
 * Callback actor that listens for text insertions and deletions
 */
const textChangeListenerCallback: CallbackLogicFunction<
  AnyEventObject,
  EmojiPickerMachineEvent,
  {editor: Editor}
> = ({input, sendBack}) => {
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
            forward(event),
            effect(() => {
              // Adjust focus to account for the inserted text
              const adjustedFocus = {
                ...focus,
                offset: focus.offset + event.text.length,
              }
              sendBack({
                type: 'insert.text',
                text: event.text,
                focus: adjustedFocus,
              })
            }),
          ],
        ],
      }),
    }),
    input.editor.registerBehavior({
      behavior: defineBehavior({
        on: 'delete.backward',
        guard: ({event, snapshot}) =>
          event.unit === 'character' && snapshot.context.selection
            ? {focus: snapshot.context.selection.focus}
            : false,
        actions: [
          ({event}, {focus}) => [
            forward(event),
            effect(() => {
              // After delete.backward, cursor moves back by 1
              const adjustedFocus = {
                ...focus,
                offset: focus.offset - 1,
              }
              sendBack({type: 'delete.backward', focus: adjustedFocus})
            }),
          ],
        ],
      }),
    }),
    input.editor.registerBehavior({
      behavior: defineBehavior({
        on: 'delete.forward',
        guard: ({event, snapshot}) =>
          event.unit === 'character' && snapshot.context.selection
            ? {focus: snapshot.context.selection.focus}
            : false,
        actions: [
          ({event}, {focus}) => [
            forward(event),
            effect(() => {
              sendBack({type: 'delete.forward', focus})
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

/**
 * Callback actor that listens for dismiss events (Escape key)
 */
const dismissListenerCallback: CallbackLogicFunction<
  AnyEventObject,
  EmojiPickerMachineEvent,
  {editor: Editor}
> = ({input, sendBack}) => {
  return input.editor.registerBehavior({
    behavior: defineBehavior({
      on: 'keyboard.keydown',
      guard: ({event}) => escape.guard(event.originEvent),
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

/**
 * Callback actor that listens for insert events (Enter/Tab keys)
 */
const insertListenerCallback: CallbackLogicFunction<
  AnyEventObject,
  EmojiPickerMachineEvent,
  {editor: Editor}
> = ({input, sendBack}) => {
  return input.editor.registerBehavior({
    behavior: defineBehavior({
      on: 'keyboard.keydown',
      guard: ({event}) =>
        enter.guard(event.originEvent) || tab.guard(event.originEvent),
      actions: [
        () => [
          effect(() => {
            sendBack({type: 'insert selected match'})
          }),
        ],
      ],
    }),
  })
}

/**
 * Callback actor that handles emoji insertion with proper undo support
 */
const emojiInsertionCallback: CallbackLogicFunction<
  AnyEventObject,
  EmojiPickerMachineEvent,
  {editor: Editor}
> = ({input}) => {
  return input.editor.registerBehavior({
    behavior: defineBehavior<{
      type: 'custom.insert emoji'
      emoji: string
      anchor: BlockOffset
      focus: BlockOffset
    }>({
      on: 'custom.insert emoji',
      actions: [
        ({event}) => [
          // First select the keyword range
          raise({
            type: 'select',
            at: {
              anchor: event.anchor,
              focus: event.focus,
            },
          }),
          // Then delete the selected text
          raise({
            type: 'delete',
            at: {
              anchor: event.anchor,
              focus: event.focus,
            },
          }),
          // Finally insert the emoji
          raise({
            type: 'insert.text',
            text: event.emoji,
          }),
        ],
      ],
    }),
  })
}

/**
 * The emoji picker state machine
 */
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
    'text change listener': fromCallback(textChangeListenerCallback),
    'dismiss listener': fromCallback(dismissListenerCallback),
    'insert listener': fromCallback(insertListenerCallback),
    'emoji insertion': fromCallback(emojiInsertionCallback),
  },
  guards: {
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
        if (event.type === 'custom.trigger found') {
          return ':'
        }
        if (event.type === 'custom.partial keyword found') {
          return `:${event.keyword}`
        }
        if (event.type === 'custom.keyword found') {
          return `:${event.keyword}`
        }
        if (
          event.type === 'insert.text' ||
          event.type === 'delete.backward' ||
          event.type === 'delete.forward'
        ) {
          // Reconstruct keyword by scanning forward from anchor to find where it ends
          if (!context.keywordOffsets) {
            return context.keyword
          }

          const snapshot = context.editor.getSnapshot()
          const keywordAnchor = blockOffsetToSpanSelectionPoint({
            context: snapshot.context,
            blockOffset: context.keywordOffsets.anchor,
            direction: 'forward',
          })

          if (!keywordAnchor) {
            return context.keyword
          }

          // Get the text block containing the keyword
          const blockKey = keywordAnchor.path[0]._key
          const block = snapshot.context.value.find((b) => b._key === blockKey)

          if (
            !block ||
            block._type !== 'block' ||
            !('children' in block) ||
            !Array.isArray(block.children)
          ) {
            return context.keyword
          }

          // Find the span containing the anchor
          const spanKey = keywordAnchor.path[2]._key
          const span = block.children.find((c: any) => c._key === spanKey)

          if (
            !span ||
            span._type !== 'span' ||
            !('text' in span) ||
            typeof span.text !== 'string'
          ) {
            return context.keyword
          }

          // Get text from the anchor offset onward
          const textFromAnchor = span.text.slice(keywordAnchor.offset)

          // Match the keyword pattern: starts with : followed by alphanumeric/dash/underscore
          const match = textFromAnchor.match(/^:([a-zA-Z-_0-9]*)/)

          if (!match) {
            return context.keyword
          }

          return match[0]
        }
        return context.keyword
      },
    }),
    'update keyword offsets': assign({
      keywordOffsets: ({context, event}) => {
        if (event.type === 'custom.trigger found') {
          return event.offsets
        }
        if (event.type === 'custom.partial keyword found') {
          return event.offsets
        }
        if (event.type === 'custom.keyword found') {
          return event.offsets
        }
        if (
          (event.type === 'insert.text' ||
            event.type === 'delete.backward' ||
            event.type === 'delete.forward') &&
          context.keywordOffsets
        ) {
          // Calculate the keyword length based on the reconstructed keyword
          // This will be updated by the 'update keyword' action that runs before this
          const newKeywordLength = context.keyword.length

          // The keyword focus should be anchor offset + keyword length
          return {
            anchor: context.keywordOffsets.anchor,
            focus: {
              path: context.keywordOffsets.anchor.path,
              offset: context.keywordOffsets.anchor.offset + newKeywordLength,
            },
          }
        }
        return context.keywordOffsets
      },
    }),
    'update matches': assign({
      matches: ({context}) => {
        // Extract keyword without the leading colon
        const keyword = context.keyword.slice(1)
        return context.matchEmojis({keyword})
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
        if (event.type === 'navigate to') {
          return event.index
        }
        return 0
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
      src: 'emoji insertion',
      input: ({context}) => ({editor: context.editor}),
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
      always: [
        {
          guard: ({context}) => !context.keyword.startsWith(':'),
          target: 'idle',
        },
      ],
      invoke: [
        {
          src: 'trigger listener',
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
        {
          src: 'dismiss listener',
          input: ({context}) => ({editor: context.editor}),
        },
        {
          src: 'insert listener',
          input: ({context}) => ({editor: context.editor}),
        },
      ],
      on: {
        'custom.keyword found': {
          actions: [
            'update keyword',
            'update keyword offsets',
            'update matches',
            'insert selected match',
          ],
          target: 'idle',
        },
        'selection changed': [
          {
            guard: 'selection moved unexpectedly',
            target: 'idle',
          },
        ],
        'insert.text': {
          actions: [
            'update keyword',
            'update keyword offsets',
            'update matches',
            'reset selected index',
          ],
        },
        'delete.backward': {
          actions: [
            'update keyword',
            'update keyword offsets',
            'update matches',
            'reset selected index',
          ],
        },
        'delete.forward': {
          actions: [
            'update keyword',
            'update keyword offsets',
            'update matches',
            'reset selected index',
          ],
        },
        'dismiss': {
          target: 'idle',
        },
        'insert selected match': {
          actions: ['insert selected match'],
          target: 'idle',
        },
      },
      states: {
        'no matches': {
          always: {
            guard: 'has matches',
            target: 'matches',
          },
        },
        'matches': {
          invoke: {
            src: 'navigation listener',
            input: ({context}) => ({editor: context.editor}),
          },
          on: {
            'navigate up': {
              actions: ['decrement selected index'],
            },
            'navigate down': {
              actions: ['increment selected index'],
            },
            'navigate to': {
              actions: ['set selected index'],
            },
          },
        },
      },
    },
  },
})

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
  actions: [
    (_, {offsets}) => [
      raise({
        type: 'custom.trigger found',
        offsets,
      }),
    ],
  ],
})

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
    const offsets = lastMatch.targetOffsets

    return {keyword, offsets}
  },
  actions: [
    (_, {keyword, offsets}) => [
      raise({
        type: 'custom.partial keyword found',
        keyword,
        offsets,
      }),
    ],
  ],
})

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
    const offsets = lastMatch.targetOffsets

    return {keyword, offsets}
  },
  actions: [
    (_, {keyword, offsets}) => [
      raise({
        type: 'custom.keyword found',
        keyword,
        offsets,
      }),
    ],
  ],
})
