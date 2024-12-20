import {
  AnyEventObject,
  assertEvent,
  assign,
  CallbackLogicFunction,
  createActor,
  fromCallback,
  setup,
} from 'xstate'
import * as selectors from '../selectors'
import {isHotkey} from '../utils/is-hotkey'
import {defineBehavior} from './behavior.types'

const emojiCharRegEx = /^[a-zA-Z-_0-9]{1}$/
const incompleteEmojiRegEx = /:([a-zA-Z-_0-9]*)$/
const emojiRegEx = /:([a-zA-Z-_0-9]+):$/
const trailingEmojiCharsRegEx = /^([a-zA-Z-_0-9]*)/

/**
 * @beta
 */
export type EmojiPickerBehaviorsConfig<TEmojiMatch> = {
  /**
   * Match emojis by keyword.
   */
  matchEmojis: ({keyword}: {keyword: string}) => Array<TEmojiMatch>
  onMatchesChanged: ({matches}: {matches: Array<TEmojiMatch>}) => void
  onSelectedIndexChanged: ({selectedIndex}: {selectedIndex: number}) => void
  /**
   * Parse an emoji match to a string that will be inserted into the editor.
   */
  parseMatch: ({match}: {match: TEmojiMatch}) => string | undefined
}

/**
 * @beta
 */
export function createEmojiPickerBehaviors<TEmojiMatch>(
  config: EmojiPickerBehaviorsConfig<TEmojiMatch>,
) {
  const emojiPickerActor = createActor(createEmojiPickerMachine<TEmojiMatch>())
  emojiPickerActor.start()
  emojiPickerActor.subscribe((state) => {
    config.onMatchesChanged({matches: state.context.matches})
    config.onSelectedIndexChanged({selectedIndex: state.context.selectedIndex})
  })

  return [
    defineBehavior({
      on: 'insert.text',
      guard: ({context, event}) => {
        if (event.text === ':') {
          return false
        }

        const isEmojiChar = emojiCharRegEx.test(event.text)

        if (!isEmojiChar) {
          return {emojis: []}
        }

        const focusBlock = selectors.getFocusTextBlock({context})
        const textBefore = selectors.getBlockTextBefore({context})
        const emojiKeyword = `${textBefore}${event.text}`.match(
          incompleteEmojiRegEx,
        )?.[1]

        if (!focusBlock || emojiKeyword === undefined) {
          return {emojis: []}
        }

        const emojis = config.matchEmojis({keyword: emojiKeyword})

        return {emojis}
      },
      actions: [
        (_, params) => [
          {
            type: 'effect',
            effect: () => {
              emojiPickerActor.send({
                type: 'emojis found',
                matches: params.emojis,
              })
            },
          },
        ],
      ],
    }),
    defineBehavior({
      on: 'insert.text',
      guard: ({context, event}) => {
        const isColon = event.text === ':'

        if (!isColon) {
          return false
        }

        const matches = emojiPickerActor.getSnapshot().context.matches
        const selectedIndex =
          emojiPickerActor.getSnapshot().context.selectedIndex
        const emoji = matches[selectedIndex]
          ? config.parseMatch({match: matches[selectedIndex]})
          : undefined

        const focusBlock = selectors.getFocusTextBlock({context})
        const textBefore = selectors.getBlockTextBefore({context})
        const emojiKeyword = `${textBefore}:`.match(emojiRegEx)?.[1]

        if (!focusBlock || emojiKeyword === undefined) {
          return false
        }

        const emojiStringLength = emojiKeyword.length + 2

        if (emoji) {
          return {
            focusBlock,
            emoji,
            emojiStringLength,
            textBeforeLength: textBefore.length + 1,
          }
        }

        return false
      },
      actions: [
        () => [
          {
            type: 'insert.text',
            text: ':',
          },
        ],
        (_, params) => [
          {
            type: 'effect',
            effect: () => {
              emojiPickerActor.send({type: 'select'})
            },
          },
          {
            type: 'delete.text',
            anchor: {
              path: params.focusBlock.path,
              offset: params.textBeforeLength - params.emojiStringLength,
            },
            focus: {
              path: params.focusBlock.path,
              offset: params.textBeforeLength,
            },
          },
          {
            type: 'insert.text',
            text: params.emoji,
          },
        ],
      ],
    }),
    defineBehavior({
      on: 'key.down',
      guard: ({context, event}) => {
        const matches = emojiPickerActor.getSnapshot().context.matches

        if (matches.length === 0) {
          return false
        }

        const isEscape = isHotkey('Escape', event.keyboardEvent)

        if (isEscape) {
          return {action: 'reset' as const}
        }

        const isEnter = isHotkey('Enter', event.keyboardEvent)
        const isTab = isHotkey('Tab', event.keyboardEvent)

        if (isEnter || isTab) {
          const selectedIndex =
            emojiPickerActor.getSnapshot().context.selectedIndex

          const emoji = matches[selectedIndex]
            ? config.parseMatch({match: matches[selectedIndex]})
            : undefined

          if (!emoji) {
            return false
          }

          const focusBlock = selectors.getFocusTextBlock({context})
          const textBefore = selectors.getBlockTextBefore({context})
          const emojiKeyword = textBefore.match(incompleteEmojiRegEx)?.[1]

          if (!focusBlock || emojiKeyword === undefined) {
            return false
          }

          const emojiStringLength = emojiKeyword.length + 1

          if (emoji) {
            return {
              action: 'select' as const,
              focusBlock,
              emoji,
              emojiStringLength,
              textBeforeLength: textBefore.length,
            }
          }

          return false
        }

        const isArrowDown = isHotkey('ArrowDown', event.keyboardEvent)
        const isArrowUp = isHotkey('ArrowUp', event.keyboardEvent)

        if (isArrowDown && matches.length > 0) {
          return {action: 'navigate down' as const}
        }

        if (isArrowUp && matches.length > 0) {
          return {action: 'navigate up' as const}
        }

        return false
      },
      actions: [
        (_, params) => {
          if (params.action === 'select') {
            return [
              {
                type: 'effect',
                effect: () => {
                  emojiPickerActor.send({type: 'select'})
                },
              },
              {
                type: 'delete.text',
                anchor: {
                  path: params.focusBlock.path,
                  offset: params.textBeforeLength - params.emojiStringLength,
                },
                focus: {
                  path: params.focusBlock.path,
                  offset: params.textBeforeLength,
                },
              },
              {
                type: 'insert.text',
                text: params.emoji,
              },
            ]
          }

          if (params.action === 'navigate up') {
            return [
              // If we are navigating then we want to hijack the key event and
              // turn it into a noop.
              {
                type: 'noop',
              },
              {
                type: 'effect',
                effect: () => {
                  emojiPickerActor.send({type: 'navigate up'})
                },
              },
            ]
          }

          if (params.action === 'navigate down') {
            return [
              // If we are navigating then we want to hijack the key event and
              // turn it into a noop.
              {
                type: 'noop',
              },
              {
                type: 'effect',
                effect: () => {
                  emojiPickerActor.send({type: 'navigate down'})
                },
              },
            ]
          }

          return [
            {
              type: 'effect',
              effect: () => {
                emojiPickerActor.send({type: 'reset'})
              },
            },
          ]
        },
      ],
    }),
    defineBehavior({
      on: 'delete.backward',
      guard: ({event}) => {
        return event.unit !== 'character'
      },
      actions: [
        () => [
          {
            type: 'effect',
            effect: () => {
              emojiPickerActor.send({type: 'reset'})
            },
          },
        ],
      ],
    }),
    defineBehavior({
      on: 'delete.backward',
      guard: ({context, event}) => {
        const matches = emojiPickerActor.getSnapshot().context.matches

        if (matches.length === 0) {
          return false
        }

        if (event.unit !== 'character') {
          return false
        }

        const focusBlock = selectors.getFocusTextBlock({context})
        const textBefore = selectors.getBlockTextBefore({context})
        const emojiKeyword = textBefore
          .slice(0, textBefore.length - 1)
          .match(incompleteEmojiRegEx)?.[1]

        if (!focusBlock || emojiKeyword === undefined) {
          return {emojis: []}
        }

        const textAfter = selectors.getBlockTextAfter({context})
        const trailingEmojiChars = textAfter.match(trailingEmojiCharsRegEx)?.[1]

        const emojis = config.matchEmojis({
          keyword: `${emojiKeyword}${trailingEmojiChars}`,
        })

        return {emojis}
      },
      actions: [
        (_, params) => [
          {
            type: 'effect',
            effect: () => {
              emojiPickerActor.send({
                type: 'emojis found',
                matches: params.emojis,
              })
            },
          },
        ],
      ],
    }),
    defineBehavior({
      on: 'delete.forward',
      guard: ({event}) => {
        return event.unit !== 'character'
      },
      actions: [
        () => [
          {
            type: 'effect',
            effect: () => {
              emojiPickerActor.send({type: 'reset'})
            },
          },
        ],
      ],
    }),
    defineBehavior({
      on: 'delete.forward',
      guard: ({context, event}) => {
        if (event.unit !== 'character') {
          return false
        }

        const matches = emojiPickerActor.getSnapshot().context.matches

        if (matches.length === 0) {
          return false
        }

        const focusBlock = selectors.getFocusTextBlock({context})
        const textBefore = selectors.getBlockTextBefore({context})
        const emojiKeyword = textBefore.match(incompleteEmojiRegEx)?.[1] //

        if (!focusBlock || emojiKeyword === undefined) {
          return {emojis: []}
        }

        const textAfter = selectors.getBlockTextAfter({context})
        const trailingEmojiChars = textAfter
          .slice(1)
          .match(trailingEmojiCharsRegEx)?.[1]

        const emojis = config.matchEmojis({
          keyword: `${emojiKeyword}${trailingEmojiChars}`,
        })

        return {emojis}
      },
      actions: [
        (_, params) => [
          {
            type: 'effect',
            effect: () => {
              emojiPickerActor.send({
                type: 'emojis found',
                matches: params.emojis,
              })
            },
          },
        ],
      ],
    }),
  ]
}

function createEmojiPickerMachine<TEmojiSearchResult>() {
  return setup({
    types: {
      context: {} as {
        matches: Array<TEmojiSearchResult>
        selectedIndex: number
      },
      events: {} as
        | {
            type: 'emojis found'
            matches: Array<TEmojiSearchResult>
          }
        | {
            type: 'navigate down' | 'navigate up' | 'select' | 'reset'
          },
    },
    actions: {
      'assign matches': assign({
        matches: ({event}) => {
          assertEvent(event, 'emojis found')
          return event.matches
        },
      }),
      'reset matches': assign({
        matches: [],
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
    },
    guards: {
      'no matches': ({context}) => context.matches.length === 0,
    },
  }).createMachine({
    id: 'emoji picker',
    context: {
      matches: [],
      selectedIndex: 0,
    },
    initial: 'idle',
    states: {
      'idle': {
        on: {
          'emojis found': {
            actions: 'assign matches',
            target: 'showing matches',
          },
        },
      },
      'showing matches': {
        always: {
          guard: 'no matches',
          target: 'idle',
        },
        exit: ['reset selected index'],
        on: {
          'emojis found': {
            actions: 'assign matches',
          },
          'navigate down': {
            actions: 'increment selected index',
          },
          'navigate up': {
            actions: 'decrement selected index',
          },
          'reset': {
            target: 'idle',
            actions: ['reset selected index', 'reset matches'],
          },
          'select': {
            target: 'idle',
            actions: ['reset selected index', 'reset matches'],
          },
        },
      },
    },
  })
}

function createEmojiPickerBehaviors2<TEmojiMatch>(config: {
  matchEmojis: ({keyword}: {keyword: string}) => Array<TEmojiMatch>
  onMatch: ({match}: {match: TEmojiMatch}) => void
}) {
  const emojiPickerActor = createActor(createEmojiPickerMachine2(config))
  emojiPickerActor.start()

  return [
    defineBehavior({
      on: 'insert.text',
      guard: ({event}) => event.text === ':',
      actions: [
        () => [
          {
            type: 'effect',
            effect: () => {
              emojiPickerActor.send({type: 'init picker'})
            },
          },
        ],
      ],
    }),
    defineBehavior({
      on: 'key.down',
      guard: ({event}) => isHotkey('ArrowDown', event.keyboardEvent),
      actions: [
        () => [
          {
            type: 'effect',
            effect: () => {
              emojiPickerActor.send({type: 'select next match'})
            },
          },
        ],
      ],
    }),
    defineBehavior({
      on: 'key.down',
      guard: ({event}) => isHotkey('ArrowUp', event.keyboardEvent),
      actions: [
        () => [
          {
            type: 'effect',
            effect: () => {
              emojiPickerActor.send({type: 'select previous match'})
            },
          },
        ],
      ],
    }),
    defineBehavior({
      on: 'key.down',
      guard: ({event}) =>
        isHotkey('Enter', event.keyboardEvent) ||
        isHotkey('Tab', event.keyboardEvent),
      actions: [
        () => [
          {
            type: 'effect',
            effect: () => {
              emojiPickerActor.send({type: 'attempt match'})
            },
          },
        ],
      ],
    }),
    defineBehavior({
      on: 'key.down',
      guard: ({event}) => isHotkey('Escape', event.keyboardEvent),
      actions: [
        () => [
          {
            type: 'effect',
            effect: () => {
              emojiPickerActor.send({type: 'reset picker'})
            },
          },
        ],
      ],
    }),
  ]
}

function createEmojiPickerMachine2<TEmojiMatch>(config: {
  matchEmojis: ({keyword}: {keyword: string}) => Array<TEmojiMatch>
  onMatch: ({match}: {match: TEmojiMatch}) => void
}) {
  type EmojiPickerEvent =
    | {type: 'init picker'}
    | {type: 'attempt match'}
    | {type: 'reset picker'}
    | {type: 'update keyword'; keyword: string}
    | {type: 'matches found'; matches: Array<TEmojiMatch>}
    | {type: 'no match'}
    | {type: 'select next match'}
    | {type: 'select previous match'}

  const matchEmojisCallback: CallbackLogicFunction<
    AnyEventObject,
    EmojiPickerEvent,
    {keyword: string}
  > = ({sendBack, input}) => {
    const matches = config.matchEmojis(input)
    if (matches.length === 0) {
      sendBack({type: 'no match'})
    } else {
      sendBack({type: 'matches found', matches})
    }
  }

  return setup({
    types: {
      context: {} as {
        keyword: string
        matches: Array<TEmojiMatch>
        selectedIndex: number
      },
      events: {} as EmojiPickerEvent,
    },
    actions: {
      'assign keyword': assign({
        keyword: ({event}) => {
          assertEvent(event, 'update keyword')
          return event.keyword
        },
      }),
      'assign matches': assign({
        matches: ({event}) => {
          assertEvent(event, 'matches found')
          return event.matches
        },
      }),
      'reset keyword': assign({
        keyword: '',
      }),
      'reset matches': assign({
        matches: [],
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
    },
    actors: {
      'emoji search': fromCallback(matchEmojisCallback),
    },
  }).createMachine({
    id: 'emoji picker',
    context: {
      keyword: '',
      matches: [],
      selectedIndex: 0,
    },
    initial: 'idle',
    on: {
      'reset picker': {
        target: 'idle',
      },
      'attempt match': {
        target: 'attempting to match',
      },
    },
    states: {
      'idle': {
        entry: ['reset matches', 'reset keyword', 'reset selected index'],
        on: {
          'init picker': {
            target: 'waiting for keyword',
          },
        },
      },
      'waiting for keyword': {
        on: {
          'update keyword': {
            actions: 'assign keyword',
            target: 'searching',
          },
        },
      },
      'searching': {
        invoke: {
          src: 'emoji search',
          input: ({context}) => ({keyword: context.keyword}),
        },
        on: {
          'matches found': {
            target: 'has matches',
            actions: 'assign matches',
          },
          'no match': {
            target: 'no matches',
            actions: 'reset matches',
          },
        },
      },
      'has matches': {
        on: {
          'select next match': {
            actions: 'increment selected index',
          },
          'select previous match': {
            actions: 'decrement selected index',
          },
        },
      },
      'no matches': {
        on: {
          'update keyword': {
            actions: 'assign keyword',
            target: 'searching',
          },
        },
      },
      'attempting to match': {
        entry: [
          ({context}) => {
            const match = context.matches[context.selectedIndex]

            if (match) {
              config.onMatch({match})
            }
          },
        ],
        always: {target: 'idle'},
      },
    },
  })
}
