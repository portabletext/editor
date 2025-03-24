import {assertEvent, assign, createActor, setup} from 'xstate'
import {isHotkey} from '../internal-utils/is-hotkey'
import * as selectors from '../selectors'
import {defineBehavior} from './behavior.types.behavior'

const emojiCharRegEx = /^[a-zA-Z-_0-9]{1}$/
const incompleteEmojiRegEx = /:([a-zA-Z-_0-9]+)$/
const emojiRegEx = /:([a-zA-Z-_0-9]+):$/

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
      guard: ({snapshot, event}) => {
        if (event.text === ':') {
          return false
        }

        const isEmojiChar = emojiCharRegEx.test(event.text)

        if (!isEmojiChar) {
          return {emojis: []}
        }

        const focusBlock = selectors.getFocusTextBlock(snapshot)
        const textBefore = selectors.getBlockTextBefore(snapshot)
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
      guard: ({snapshot, event}) => {
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

        const focusBlock = selectors.getFocusTextBlock(snapshot)
        const textBefore = selectors.getBlockTextBefore(snapshot)
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
      on: 'keyboard.keydown',
      guard: ({snapshot, event}) => {
        const matches = emojiPickerActor.getSnapshot().context.matches

        if (matches.length === 0) {
          return false
        }

        const isEscape = isHotkey('Escape', event.originEvent)

        if (isEscape) {
          return {action: 'reset' as const}
        }

        const isEnter = isHotkey('Enter', event.originEvent)
        const isTab = isHotkey('Tab', event.originEvent)

        if (isEnter || isTab) {
          const selectedIndex =
            emojiPickerActor.getSnapshot().context.selectedIndex

          const emoji = matches[selectedIndex]
            ? config.parseMatch({match: matches[selectedIndex]})
            : undefined

          if (!emoji) {
            return false
          }

          const focusBlock = selectors.getFocusTextBlock(snapshot)
          const textBefore = selectors.getBlockTextBefore(snapshot)
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

        const isArrowDown = isHotkey('ArrowDown', event.originEvent)
        const isArrowUp = isHotkey('ArrowUp', event.originEvent)

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
      guard: ({snapshot, event}) => {
        if (event.unit !== 'character') {
          return false
        }

        const matches = emojiPickerActor.getSnapshot().context.matches

        if (matches.length === 0) {
          return false
        }

        const focusBlock = selectors.getFocusTextBlock(snapshot)
        const textBefore = selectors.getBlockTextBefore(snapshot)
        const emojiKeyword = textBefore
          .slice(0, textBefore.length - 1)
          .match(incompleteEmojiRegEx)?.[1]

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
