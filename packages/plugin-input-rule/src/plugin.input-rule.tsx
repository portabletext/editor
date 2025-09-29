import {useEditor, type BlockOffset, type Editor} from '@portabletext/editor'
import {
  defineBehavior,
  effect,
  forward,
  raise,
} from '@portabletext/editor/behaviors'
import type {MarkState} from '@portabletext/editor/selectors'
import {
  getBlockOffsets,
  getBlockTextBefore,
  getFocusTextBlock,
  getMarkState,
} from '@portabletext/editor/selectors'
import {useActorRef} from '@xstate/react'
import {
  fromCallback,
  setup,
  type AnyEventObject,
  type CallbackLogicFunction,
} from 'xstate'
import type {InputRule} from './input-rule'

type InputRuleMatch = {
  /**
   * The selection of the match
   */
  selection: {
    anchor: BlockOffset
    focus: BlockOffset
    backward: boolean
  }
  /**
   * The new text to replace the match with
   */
  transform: string
  /**
   * The mark state of the match
   */
  markState: MarkState | undefined
}

function createInputRuleBehavior(config: {
  rules: Array<InputRule>
  onApply: ({endCaretPosition}: {endCaretPosition: BlockOffset}) => void
}) {
  return defineBehavior({
    on: 'insert.text',
    guard: ({snapshot, event}) => {
      const focusTextBlock = getFocusTextBlock(snapshot)

      if (!focusTextBlock) {
        return false
      }

      const originalTextBefore = getBlockTextBefore(snapshot)
      let textBefore = originalTextBefore
      const newText = textBefore + event.text
      const matches: Array<InputRuleMatch> = []

      for (const rule of config.rules) {
        const matcher = rule.matcher.global
          ? rule.matcher
          : new RegExp(rule.matcher.source, 'g')

        // if (rule.matcher.global) {
        while (true) {
          // Find matches in the text before the insertion
          const matchesInTextBefore = [...textBefore.matchAll(matcher)].map(
            (match) => ({
              selection: {
                anchor: {
                  path: focusTextBlock.path,
                  offset: match.index,
                },
                focus: {
                  path: focusTextBlock.path,
                  offset: match.index + (match?.at(0)?.length ?? 0),
                },
                backward: false,
              },
            }),
          )

          // Find matches in the text after the insertion
          const ruleMatches = [...newText.matchAll(matcher)].flatMap(
            (ruleMatch) => {
              const matchLength = ruleMatch?.at(0)?.length

              if (matchLength === undefined) {
                return []
              }

              const alreadyFound = matches.some(
                (match) => match.selection.anchor.offset === ruleMatch.index,
              )

              // Ignore if this match has already been found
              if (alreadyFound) {
                return []
              }

              const existsInTextBefore = matchesInTextBefore.some(
                (matchInTextBefore) =>
                  matchInTextBefore.selection.anchor.offset === ruleMatch.index,
              )

              // Ignore if this match occurs in the text before the insertion
              if (existsInTextBefore) {
                return []
              }

              return [
                {
                  selection: {
                    anchor: {
                      path: focusTextBlock.path,
                      offset: ruleMatch.index,
                    },
                    focus: {
                      path: focusTextBlock.path,
                      offset: ruleMatch.index + matchLength,
                    },
                    backward: false,
                  },
                  transform: rule.transform(),
                  markState: getMarkState({
                    ...snapshot,
                    context: {
                      ...snapshot.context,
                      selection: {
                        anchor: {
                          path: focusTextBlock.path,
                          offset: ruleMatch.index,
                        },
                        focus: {
                          path: focusTextBlock.path,
                          offset: Math.min(
                            ruleMatch.index + matchLength,
                            originalTextBefore.length,
                          ),
                        },
                      },
                    },
                  }),
                },
              ]
            },
          )

          const ruleMatch = ruleMatches.at(0)

          if (ruleMatch) {
            // If a match was found, add it to the matches array and update
            // the text before the insertion
            matches.push(ruleMatch)
            textBefore = newText.slice(0, ruleMatch.selection.focus.offset ?? 0)
          } else {
            // If no match was found, break out of the loop to try the next
            // rule
            break
          }
        }
      }

      const lastMatch = matches.at(-1)

      // If no matches were found, abort to let the text insertion happen
      // uninterrupted
      if (!lastMatch) {
        return false
      }

      const textLengthDelta = matches.reduce(
        (length, match) =>
          length -
          (match.transform.length -
            (match.selection.focus.offset - match.selection.anchor.offset)),
        0,
      )

      const endCaretPosition = {
        path: focusTextBlock.path,
        offset: newText.length - textLengthDelta,
      }

      return {
        matches,
        endCaretPosition,
      }
    },
    actions: [
      ({event}) => [forward(event)],
      ({snapshot}, {matches, endCaretPosition}) => [
        ...matches.reverse().flatMap((match) => [
          raise({type: 'select', at: match.selection}),
          raise({type: 'delete', at: match.selection}),
          raise({
            type: 'insert.child',
            child: {
              _type: snapshot.context.schema.span.name,
              text: match.transform,
              marks: match.markState?.marks ?? [],
            },
          }),
        ]),
        raise({
          type: 'select',
          at: {
            anchor: endCaretPosition,
            focus: endCaretPosition,
          },
        }),
      ],
      (_, {endCaretPosition}) => [
        effect(() => config.onApply({endCaretPosition})),
      ],
    ],
  })
}

/**
 * @beta
 */
export function InputRulePlugin(props: {rules: Array<InputRule>}) {
  const editor = useEditor()

  useActorRef(inputRuleMachine, {
    input: {editor, rules: props.rules},
  })

  return null
}

type InputRuleEvent =
  | {type: 'input rule raised'; endCaretPosition: BlockOffset}
  | {type: 'history.undo raised'}
  | {
      type: 'selection changed'
      blockOffsets: {start: BlockOffset; end: BlockOffset} | undefined
    }

const inputRuleListenerCallback: CallbackLogicFunction<
  AnyEventObject,
  InputRuleEvent,
  {editor: Editor; rules: Array<InputRule>}
> = ({input, sendBack}) => {
  const unregister = input.editor.registerBehavior({
    behavior: createInputRuleBehavior({
      rules: input.rules,
      onApply: ({endCaretPosition}) => {
        sendBack({type: 'input rule raised', endCaretPosition})
      },
    }),
  })

  return () => {
    unregister()
  }
}

const deleteBackwardListenerCallback: CallbackLogicFunction<
  AnyEventObject,
  InputRuleEvent,
  {editor: Editor}
> = ({input, sendBack}) => {
  return input.editor.registerBehavior({
    behavior: defineBehavior({
      on: 'delete.backward',
      actions: [
        () => [
          raise({type: 'history.undo'}),
          effect(() => {
            sendBack({type: 'history.undo raised'})
          }),
        ],
      ],
    }),
  })
}

const selectionListenerCallback: CallbackLogicFunction<
  AnyEventObject,
  InputRuleEvent,
  {editor: Editor}
> = ({sendBack, input}) => {
  const unregister = input.editor.registerBehavior({
    behavior: defineBehavior({
      on: 'select',
      guard: ({snapshot, event}) => {
        const blockOffsets = getBlockOffsets({
          ...snapshot,
          context: {
            ...snapshot.context,
            selection: event.at,
          },
        })

        return {blockOffsets}
      },
      actions: [
        ({event}, {blockOffsets}) => [
          effect(() => {
            sendBack({type: 'selection changed', blockOffsets})
          }),
          forward(event),
        ],
      ],
    }),
  })

  return unregister
}

const inputRuleSetup = setup({
  types: {
    context: {} as {
      editor: Editor
      rules: Array<InputRule>
      endCaretPosition?: BlockOffset
    },
    input: {} as {
      editor: Editor
      rules: Array<InputRule>
    },
    events: {} as InputRuleEvent,
  },
  actors: {
    'delete.backward listener': fromCallback(deleteBackwardListenerCallback),
    'input rule listener': fromCallback(inputRuleListenerCallback),
    'selection listener': fromCallback(selectionListenerCallback),
  },
  guards: {
    'block offset changed': ({context, event}) => {
      if (event.type !== 'selection changed') {
        return false
      }

      if (!event.blockOffsets || !context.endCaretPosition) {
        return true
      }

      return (
        context.endCaretPosition.path[0]._key !==
          event.blockOffsets.start.path[0]._key ||
        context.endCaretPosition.offset !== event.blockOffsets.start.offset ||
        context.endCaretPosition.path[0]._key !==
          event.blockOffsets.end.path[0]._key ||
        context.endCaretPosition.offset !== event.blockOffsets.end.offset
      )
    },
  },
})

const assignEndCaretPosition = inputRuleSetup.assign({
  endCaretPosition: ({context, event}) =>
    event.type === 'input rule raised'
      ? event.endCaretPosition
      : context.endCaretPosition,
})

const inputRuleMachine = inputRuleSetup.createMachine({
  id: 'input rule',
  context: ({input}) => ({
    editor: input.editor,
    rules: input.rules,
  }),
  initial: 'idle',
  invoke: {
    src: 'input rule listener',
    input: ({context}) => ({editor: context.editor, rules: context.rules}),
  },
  on: {
    'input rule raised': {
      target: '.input rule applied',
      actions: assignEndCaretPosition,
    },
  },
  states: {
    'idle': {},
    'input rule applied': {
      invoke: [
        {
          src: 'delete.backward listener',
          input: ({context}) => ({editor: context.editor}),
        },
        {
          src: 'selection listener',
          input: ({context}) => ({editor: context.editor}),
        },
      ],
      on: {
        'selection changed': {
          target: 'idle',
          guard: 'block offset changed',
        },
        'history.undo raised': {
          target: 'idle',
        },
      },
    },
  },
})
