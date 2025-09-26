import {useEditor, type BlockOffset, type Editor} from '@portabletext/editor'
import {
  defineBehavior,
  effect,
  forward,
  raise,
} from '@portabletext/editor/behaviors'
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

function createInputRuleBehavior(config: {
  rules: Array<InputRule>
  onApply: (blockOffset: BlockOffset) => void
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
      const rules = config.rules

      let newMatches: {
        index: number
        length: number | undefined
        transform: string
      }[] = []

      for (const rule of rules) {
        while (true) {
          if (rule.matcher.global) {
            const previousMatches = [...textBefore.matchAll(rule.matcher)].map(
              (match) => ({
                index: match.index,
                length: match?.at(0)?.length,
              }),
            )
            const matches = [...newText.matchAll(rule.matcher)].map(
              (match) => ({
                match,
                index: match.index,
                length: match?.at(0)?.length,
                transform: rule.transform(),
              }),
            )
            const ruleMatches = matches.filter(
              (match) =>
                !newMatches.some(
                  (newMatch) => newMatch.index === match.index,
                ) &&
                !previousMatches.some(
                  (previousMatch) => previousMatch.index === match.index,
                ),
            )
            const ruleMatch = ruleMatches.at(0)

            if (ruleMatch) {
              newMatches.push(ruleMatch)

              textBefore = newText.slice(
                0,
                ruleMatch.index + (ruleMatch.length ?? 0),
              )
            } else {
              break
            }
          } else {
            const match = newText.match(rule.matcher)

            if (match) {
              newMatches = [
                {
                  index: match.index ?? 0,
                  length: match?.at(0)?.length,
                  transform: rule.transform(),
                },
              ]
            }
          }
        }
      }

      if (newMatches.length === 0) {
        return false
      }

      const offsetPairs = newMatches
        .flatMap((match) => {
          if (match.length === undefined) {
            return []
          }

          const anchor = {
            path: focusTextBlock.path,
            offset: match.index,
          }
          const focus = {
            path: focusTextBlock.path,
            offset: match.index + (match.length ?? 0),
          }

          const markState = getMarkState({
            ...snapshot,
            context: {
              ...snapshot.context,
              selection: {
                anchor,
                focus: {
                  path: focusTextBlock.path,
                  offset: Math.min(focus.offset, originalTextBefore.length),
                },
              },
            },
          })

          return [
            {
              anchor,
              focus,
              markState,
              transform: match.transform,
            },
          ]
        })
        .reverse()

      if (offsetPairs.length === 0) {
        return false
      }

      const targetOffset =
        (offsetPairs.at(0)?.focus.offset ?? 0) -
        offsetPairs.reduce(
          (acc, pair) =>
            acc -
            (pair.transform.length - (pair.focus.offset - pair.anchor.offset)),
          0,
        )

      const targetBlockOffset = {
        path: focusTextBlock.path,
        offset: targetOffset,
      }

      return {
        offsetPairs,
        targetBlockOffset,
      }
    },
    actions: [
      ({event}) => [forward(event)],
      ({snapshot}, {offsetPairs, targetBlockOffset}) => [
        ...offsetPairs.flatMap((offsetPair) => [
          raise({type: 'select', at: offsetPair}),
          raise({type: 'delete', at: offsetPair}),
          raise({
            type: 'insert.child',
            child: {
              _type: snapshot.context.schema.span.name,
              text: offsetPair.transform,
              marks: offsetPair.markState?.marks ?? [],
            },
          }),
        ]),
        raise({
          type: 'select',
          at: {
            anchor: targetBlockOffset,
            focus: targetBlockOffset,
          },
        }),
      ],
      (_, {targetBlockOffset}) => [
        effect(() => config.onApply(targetBlockOffset)),
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
  | {type: 'input rule raised'; targetOffset: BlockOffset}
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
      onApply: (targetOffset) => {
        sendBack({type: 'input rule raised', targetOffset})
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
      offsetAfterInputRule?: BlockOffset
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

      if (!event.blockOffsets || !context.offsetAfterInputRule) {
        return true
      }

      return (
        context.offsetAfterInputRule.path[0]._key !==
          event.blockOffsets.start.path[0]._key ||
        context.offsetAfterInputRule.offset !==
          event.blockOffsets.start.offset ||
        context.offsetAfterInputRule.path[0]._key !==
          event.blockOffsets.end.path[0]._key ||
        context.offsetAfterInputRule.offset !== event.blockOffsets.end.offset
      )
    },
  },
})

const assignOffsetAfterInputRule = inputRuleSetup.assign({
  offsetAfterInputRule: ({context, event}) =>
    event.type === 'input rule raised'
      ? event.targetOffset
      : context.offsetAfterInputRule,
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
      actions: assignOffsetAfterInputRule,
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
