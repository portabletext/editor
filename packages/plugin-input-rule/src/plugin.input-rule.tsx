import {useEditor, type BlockOffset, type Editor} from '@portabletext/editor'
import {
  defineBehavior,
  effect,
  forward,
  raise,
  type BehaviorAction,
} from '@portabletext/editor/behaviors'
import {
  getBlockOffsets,
  getBlockTextBefore,
  getFocusTextBlock,
} from '@portabletext/editor/selectors'
import {isSelectionCollapsed} from '@portabletext/editor/utils'
import {useActorRef} from '@xstate/react'
import {
  fromCallback,
  setup,
  type AnyEventObject,
  type CallbackLogicFunction,
} from 'xstate'
import type {InputRule, InputRuleMatch} from './input-rule'
import {getInputRuleMatchLocation} from './input-rule-match-location'

/**
 * @alpha
 */
export function defineInputRuleBehavior(config: {
  rules: Array<InputRule<any>>
  onApply?: ({
    endOffsets,
  }: {
    endOffsets: {start: BlockOffset; end: BlockOffset} | undefined
  }) => void
}) {
  return defineBehavior({
    on: 'insert.text',
    guard: ({snapshot, event, dom}) => {
      if (
        !snapshot.context.selection ||
        !isSelectionCollapsed(snapshot.context.selection)
      ) {
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

      const foundMatches: Array<InputRuleMatch['groupMatches'][number]> = []
      const foundActions: Array<BehaviorAction> = []

      for (const rule of config.rules) {
        const matcher = new RegExp(rule.on.source, 'gd')

        while (true) {
          // Find matches in the text after the insertion
          const ruleMatches = [...newText.matchAll(matcher)].flatMap(
            (regExpMatch) => {
              if (regExpMatch.indices === undefined) {
                return []
              }

              const match = regExpMatch.indices.at(0)

              if (!match) {
                return []
              }

              const matchLocation = getInputRuleMatchLocation({
                match: [regExpMatch.at(0) ?? '', ...match],
                adjustIndexBy: originalNewText.length - newText.length,
                snapshot,
                focusTextBlock,
                originalTextBefore,
              })

              if (!matchLocation) {
                return []
              }

              const existsInTextBefore =
                matchLocation.targetOffsets.focus.offset <=
                originalTextBefore.length

              // Ignore if this match occurs in the text before the insertion
              if (existsInTextBefore) {
                return []
              }

              const alreadyFound = foundMatches.some(
                (foundMatch) =>
                  foundMatch.targetOffsets.anchor.offset ===
                  matchLocation.targetOffsets.anchor.offset,
              )

              // Ignore if this match has already been found
              if (alreadyFound) {
                return []
              }

              const groupMatches =
                regExpMatch.indices.length > 1
                  ? regExpMatch.indices
                      .slice(1)
                      .filter((indices) => indices !== undefined)
                  : []

              const ruleMatch = {
                text: matchLocation.text,
                selection: matchLocation.selection,
                targetOffsets: matchLocation.targetOffsets,
                groupMatches: groupMatches.flatMap((match, index) => {
                  const text = regExpMatch.at(index + 1) ?? ''
                  const groupMatchLocation = getInputRuleMatchLocation({
                    match: [text, ...match],
                    adjustIndexBy: originalNewText.length - newText.length,
                    snapshot,
                    focusTextBlock,
                    originalTextBefore,
                  })

                  if (!groupMatchLocation) {
                    return []
                  }

                  return groupMatchLocation
                }),
              }

              return [ruleMatch]
            },
          )

          if (ruleMatches.length > 0) {
            const guardResult =
              rule.guard?.({
                snapshot,
                event: {
                  type: 'custom.input rule',
                  matches: ruleMatches,
                  focusTextBlock,
                  textBefore: originalTextBefore,
                  textInserted: event.text,
                },
                dom,
              }) ?? true

            if (!guardResult) {
              break
            }

            const actionSets = rule.actions.map((action) =>
              action(
                {
                  snapshot,
                  event: {
                    type: 'custom.input rule',
                    matches: ruleMatches,
                    focusTextBlock,
                    textBefore: originalTextBefore,
                    textInserted: event.text,
                  },
                  dom,
                },
                guardResult,
              ),
            )

            for (const actionSet of actionSets) {
              for (const action of actionSet) {
                foundActions.push(action)
              }
            }

            const matches = ruleMatches.flatMap((match) =>
              match.groupMatches.length === 0 ? [match] : match.groupMatches,
            )

            for (const match of matches) {
              // Remember each match and adjust `textBefore` and `newText` so
              // no subsequent matches can overlap with this one
              foundMatches.push(match)
              textBefore = newText.slice(
                0,
                match.targetOffsets.focus.offset ?? 0,
              )
              newText = originalNewText.slice(
                match.targetOffsets.focus.offset ?? 0,
              )
            }
          } else {
            // If no match was found, break out of the loop to try the next
            // rule
            break
          }
        }
      }

      if (foundActions.length === 0) {
        return false
      }

      return {actions: foundActions}
    },
    actions: [
      ({event}) => [forward(event)],
      (_, {actions}) => actions,
      ({snapshot}) => [
        effect(() => {
          const blockOffsets = getBlockOffsets(snapshot)

          config.onApply?.({endOffsets: blockOffsets})
        }),
      ],
    ],
  })
}

type InputRulePluginProps = {
  rules: Array<InputRule<any>>
}

/**
 * Turn an array of `InputRule`s into a Behavior that can be used to apply the
 * rules to the editor.
 *
 * The plugin handles undo/redo out of the box including smart undo with
 * Backspace.
 *
 * @example
 * ```tsx
 * <InputRulePlugin rules={smartQuotesRules} />
 * ```
 *
 * @alpha
 */
export function InputRulePlugin(props: InputRulePluginProps) {
  const editor = useEditor()

  useActorRef(inputRuleMachine, {
    input: {editor, rules: props.rules},
  })

  return null
}

type InputRuleMachineEvent =
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
  InputRuleMachineEvent,
  {
    editor: Editor
    rules: Array<InputRule>
  }
> = ({input, sendBack}) => {
  const unregister = input.editor.registerBehavior({
    behavior: defineInputRuleBehavior({
      rules: input.rules,
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
  InputRuleMachineEvent,
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
  InputRuleMachineEvent,
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
      endOffsets: {start: BlockOffset; end: BlockOffset} | undefined
    },
    input: {} as {
      editor: Editor
      rules: Array<InputRule>
    },
    events: {} as InputRuleMachineEvent,
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
    rules: input.rules,
    endOffsets: undefined,
  }),
  initial: 'idle',
  invoke: {
    src: 'input rule listener',
    input: ({context}) => ({
      editor: context.editor,
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
