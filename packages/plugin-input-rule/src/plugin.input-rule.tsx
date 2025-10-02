import {useEditor, type BlockOffset, type Editor} from '@portabletext/editor'
import {
  defineBehavior,
  effect,
  forward,
  raise,
  type BehaviorAction,
  type BehaviorGuard,
} from '@portabletext/editor/behaviors'
import {
  getBlockOffsets,
  getBlockTextBefore,
  getFocusTextBlock,
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
}

function createInputRuleBehavior(config: {
  rules: Array<InputRule>
  guard: BehaviorGuard<{type: 'insert.text'; text: string}, boolean> | undefined
  onApply: ({
    endOffsets,
  }: {
    endOffsets: {start: BlockOffset; end: BlockOffset} | undefined
  }) => void
}) {
  return defineBehavior({
    on: 'insert.text',
    guard: ({snapshot, event, dom}) => {
      if (config.guard && !config.guard({snapshot, event, dom})) {
        return false
      }

      const focusTextBlock = getFocusTextBlock(snapshot)

      if (!focusTextBlock) {
        return false
      }

      const originalTextBefore = getBlockTextBefore(snapshot)
      let textBefore = originalTextBefore
      const originalNewText = textBefore + event.text
      let newText = originalNewText

      const matches: Array<InputRuleMatch> = []
      const actions: Array<BehaviorAction> = []

      for (const rule of config.rules) {
        const matcher = new RegExp(rule.matcher.source, 'gd')

        while (true) {
          // Find matches in the text before the insertion
          const matchesInTextBefore = [...textBefore.matchAll(matcher)].flatMap(
            (ruleMatch) => {
              if (ruleMatch.indices === undefined) {
                return []
              }

              const [index] = ruleMatch.indices.at(0) ?? [undefined, undefined]

              if (index === undefined) {
                return []
              }

              const groupMatches =
                ruleMatch.indices.length > 1
                  ? ruleMatch.indices.slice(1).map(([start, end]) => ({
                      index: start,
                      length: end - start,
                    }))
                  : ruleMatch.indices.map(([start, end]) => ({
                      index: start,
                      length: end - start,
                    }))

              return groupMatches.map((groupMatch) => {
                const adjustedIndex =
                  groupMatch.index + originalNewText.length - newText.length

                return {
                  selection: {
                    anchor: {
                      path: focusTextBlock.path,
                      offset: adjustedIndex,
                    },
                    focus: {
                      path: focusTextBlock.path,
                      offset: adjustedIndex + groupMatch.length,
                    },
                    backward: false,
                  },
                }
              })
            },
          )
          const matchesInNewText = [...newText.matchAll(matcher)]

          // Find matches in the text after the insertion
          const ruleMatches = matchesInNewText.flatMap((ruleMatch) => {
            if (ruleMatch.indices === undefined) {
              return []
            }

            const [index] = ruleMatch.indices.at(0) ?? [undefined, undefined]

            if (index === undefined) {
              return []
            }

            const groupMatches =
              ruleMatch.indices.length > 1
                ? ruleMatch.indices.slice(1).map(([start, end]) => ({
                    index: start,
                    length: end - start,
                  }))
                : ruleMatch.indices.map(([start, end]) => ({
                    index: start,
                    length: end - start,
                  }))

            const adjustedIndex =
              index + originalNewText.length - newText.length

            const alreadyFound = matches.some(
              (match) => match.selection.anchor.offset === adjustedIndex,
            )

            // Ignore if this match has already been found
            if (alreadyFound) {
              return []
            }

            const existsInTextBefore = matchesInTextBefore.some(
              (matchInTextBefore) =>
                matchInTextBefore.selection.anchor.offset === adjustedIndex,
            )

            // Ignore if this match occurs in the text before the insertion
            if (existsInTextBefore) {
              return []
            }

            return groupMatches.map((groupMatch) => {
              const adjustedIndex =
                groupMatch.index + originalNewText.length - newText.length

              const selection = {
                anchor: {
                  path: focusTextBlock.path,
                  offset: adjustedIndex,
                },
                focus: {
                  path: focusTextBlock.path,
                  offset: adjustedIndex + groupMatch.length,
                },
                backward: false,
              }

              return {
                selection,
              }
            })
          })

          if (ruleMatches.length > 0) {
            const result = rule.transform({
              matches: ruleMatches,
              snapshot,
              textBefore: originalTextBefore,
              focusTextBlock,
              event,
            })

            for (const action of result.actions) {
              actions.push(action)
            }

            // endCaretPosition = result.endCaretPosition

            for (const ruleMatch of ruleMatches) {
              // Remember each match and adjust `textBefore` and `newText` so
              // no subsequent matches can overlap with this one
              matches.push(ruleMatch)
              textBefore = newText.slice(
                0,
                ruleMatch.selection.focus.offset ?? 0,
              )
              newText = originalNewText.slice(
                ruleMatch.selection.focus.offset ?? 0,
              )
            }
          } else {
            // If no match was found, break out of the loop to try the next
            // rule
            break
          }
        }
      }

      if (actions.length === 0) {
        return false
      }

      return {actions}
    },
    actions: [
      ({event}) => [forward(event)],
      (_, {actions}) => actions,
      ({snapshot}) => [
        effect(() => {
          const blockOffsets = getBlockOffsets(snapshot)

          config.onApply({endOffsets: blockOffsets})
        }),
      ],
    ],
  })
}

type InputRulePluginProps = {
  rules: Array<InputRule>
  guard?: BehaviorGuard<{type: 'insert.text'; text: string}, boolean>
}

/**
 * @beta
 */
export function InputRulePlugin(props: InputRulePluginProps) {
  const editor = useEditor()

  useActorRef(inputRuleMachine, {
    input: {editor, rules: props.rules, guard: props.guard},
  })

  return null
}

type InputRuleEvent =
  | {
      type: 'input rule raised'
      endOffsets: {start: BlockOffset; end: BlockOffset} | undefined
    }
  | {type: 'history.undo raised'}
  | {
      type: 'selection changed'
      blockOffsets: {start: BlockOffset; end: BlockOffset} | undefined
    }

const inputRuleListenerCallback: CallbackLogicFunction<
  AnyEventObject,
  InputRuleEvent,
  {
    editor: Editor
    guard:
      | BehaviorGuard<{type: 'insert.text'; text: string}, boolean>
      | undefined
    rules: Array<InputRule>
  }
> = ({input, sendBack}) => {
  const unregister = input.editor.registerBehavior({
    behavior: createInputRuleBehavior({
      rules: input.rules,
      guard: input.guard,
      onApply: ({endOffsets}) => {
        sendBack({type: 'input rule raised', endOffsets})
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
      guard:
        | BehaviorGuard<{type: 'insert.text'; text: string}, boolean>
        | undefined
      rules: Array<InputRule>
      endOffsets: {start: BlockOffset; end: BlockOffset} | undefined
    },
    input: {} as {
      editor: Editor
      guard:
        | BehaviorGuard<{type: 'insert.text'; text: string}, boolean>
        | undefined
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

      if (!event.blockOffsets || !context.endOffsets) {
        return true
      }

      const startChanged =
        context.endOffsets.start.path[0]._key !==
          event.blockOffsets.start.path[0]._key ||
        context.endOffsets.start.offset !== event.blockOffsets.start.offset
      const endChanged =
        context.endOffsets.end.path[0]._key !==
          event.blockOffsets.end.path[0]._key ||
        context.endOffsets.end.offset !== event.blockOffsets.end.offset

      return startChanged || endChanged
    },
  },
})

const assignEndOffsets = inputRuleSetup.assign({
  endOffsets: ({context, event}) =>
    event.type === 'input rule raised' ? event.endOffsets : context.endOffsets,
})

const inputRuleMachine = inputRuleSetup.createMachine({
  id: 'input rule',
  context: ({input}) => ({
    editor: input.editor,
    guard: input.guard,
    rules: input.rules,
    endOffsets: undefined,
  }),
  initial: 'idle',
  invoke: {
    src: 'input rule listener',
    input: ({context}) => ({
      editor: context.editor,
      guard: context.guard,
      rules: context.rules,
    }),
  },
  on: {
    'input rule raised': {
      target: '.input rule applied',
      actions: assignEndOffsets,
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
