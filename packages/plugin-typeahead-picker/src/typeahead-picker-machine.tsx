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
  isSelectionCollapsed,
  type MarkState,
} from '@portabletext/editor/selectors'
import {isEqualPaths, isEqualSelectionPoints} from '@portabletext/editor/utils'
import {createKeyboardShortcut} from '@portabletext/keyboard-shortcuts'
import {
  defineInputRule,
  defineInputRuleBehavior,
  type InputRuleMatch,
} from '@portabletext/plugin-input-rule'
import {
  assign,
  fromCallback,
  fromPromise,
  sendTo,
  setup,
  type AnyEventObject,
  type CallbackLogicFunction,
} from 'xstate'
import {extractKeyword} from './extract-keyword'
import type {
  AutoCompleteMatch,
  TypeaheadPickerDefinition,
} from './typeahead-picker.types'

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Build the trigger pattern from the definition.
 */
function buildTriggerPattern<TMatch extends object>(
  definition: TypeaheadPickerDefinition<TMatch>,
): RegExp {
  return new RegExp(definition.trigger.source)
}

/**
 * Build the partial pattern (trigger + keyword) from the definition.
 */
function buildPartialPattern<TMatch extends object>(
  definition: TypeaheadPickerDefinition<TMatch>,
): RegExp {
  return new RegExp(definition.trigger.source + definition.keyword.source)
}

/**
 * Build the complete pattern (trigger + keyword + delimiter) from the definition.
 */
function buildCompletePattern<TMatch extends object>(
  definition: TypeaheadPickerDefinition<TMatch>,
): RegExp | undefined {
  if (!definition.delimiter) {
    return undefined
  }

  const escapedDelimiter = escapeRegExp(definition.delimiter)
  return new RegExp(
    definition.trigger.source + definition.keyword.source + escapedDelimiter,
  )
}

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

type FocusSpanData = {
  node: PortableTextSpan
  path: ChildPath
  textBefore: string
  textAfter: string
}

function createTriggerActions({
  snapshot,
  payload,
  keywordState,
  pickerId,
}: {
  snapshot: EditorSnapshot
  payload: TriggerPayload
  keywordState: 'partial' | 'complete'
  pickerId: string
}) {
  if (payload.markState.state === 'unchanged') {
    const textBeforeMatch = payload.focusSpanTextBefore.slice(
      0,
      payload.lastMatch.targetOffsets.anchor.offset,
    )
    const focusSpan = {
      node: {
        _key: payload.focusSpan.node._key,
        _type: payload.focusSpan.node._type,
        text: `${textBeforeMatch}${payload.lastMatch.text}${payload.focusSpanTextAfter}`,
        marks: payload.markState.marks,
      },
      path: payload.focusSpan.path,
      textBefore: textBeforeMatch,
      textAfter: payload.focusSpanTextAfter,
    }

    if (keywordState === 'complete') {
      return [
        raise(
          createKeywordFoundEvent({
            focusSpan,
            extractedKeyword: payload.extractedKeyword,
            pickerId,
          }),
        ),
      ]
    }

    return [
      raise(
        createTriggerFoundEvent({
          focusSpan,
          extractedKeyword: payload.extractedKeyword,
          pickerId,
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

  let focusSpan: FocusSpanData = {
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
              extractedKeyword: payload.extractedKeyword,
              pickerId,
            }),
          ),
        ]
      : [
          raise(
            createTriggerFoundEvent({
              focusSpan,
              extractedKeyword: payload.extractedKeyword,
              pickerId,
            }),
          ),
        ]),
  ]
}

type TriggerFoundEvent = {
  type: 'custom.typeahead trigger found'
  focusSpan: FocusSpanData
  extractedKeyword: string
  pickerId: string
}

function createTriggerFoundEvent(payload: {
  focusSpan: FocusSpanData
  extractedKeyword: string
  pickerId: string
}): TriggerFoundEvent {
  return {
    type: 'custom.typeahead trigger found',
    ...payload,
  }
}

type KeywordFoundEvent = {
  type: 'custom.typeahead keyword found'
  focusSpan: FocusSpanData
  extractedKeyword: string
  pickerId: string
}

function createKeywordFoundEvent(payload: {
  focusSpan: FocusSpanData
  extractedKeyword: string
  pickerId: string
}): KeywordFoundEvent {
  return {
    type: 'custom.typeahead keyword found',
    ...payload,
  }
}

type TypeaheadPickerMachineContext<TMatch extends object> = {
  editor: Editor
  definition: TypeaheadPickerDefinition<TMatch>
  triggerPattern: RegExp
  partialPattern: RegExp
  completePattern: RegExp | undefined
  matches: ReadonlyArray<TMatch>
  selectedIndex: number
  focusSpan: FocusSpanData | undefined
  patternText: string
  keyword: string
  requestedKeyword: string
  error: Error | undefined
  isLoading: boolean
}

type TypeaheadPickerMachineEvent<TMatch extends object> =
  | TriggerFoundEvent
  | KeywordFoundEvent
  | {type: 'selection changed'}
  | {type: 'close'}
  | {type: 'navigate down'}
  | {type: 'navigate up'}
  | {type: 'navigate to'; index: number}
  | {type: 'select'}
  | {type: 'matches loaded'; matches: ReadonlyArray<TMatch>}
  | {type: 'matches error'; error: Error}

type TriggerPayload = ReturnType<typeof getTriggerState> & {
  lastMatch: InputRuleMatch
  extractedKeyword: string
}

/**
 * Extract the pattern text (trigger + keyword) from focus span data.
 */
function extractPatternTextFromFocusSpan(focusSpan: FocusSpanData): string {
  if (focusSpan.textBefore.length > 0 && focusSpan.textAfter.length > 0) {
    return focusSpan.node.text.slice(
      focusSpan.textBefore.length,
      -focusSpan.textAfter.length,
    )
  }

  if (focusSpan.textBefore.length > 0) {
    return focusSpan.node.text.slice(focusSpan.textBefore.length)
  }

  if (focusSpan.textAfter.length > 0) {
    return focusSpan.node.text.slice(0, -focusSpan.textAfter.length)
  }

  return focusSpan.node.text
}

function createInputRules<TMatch extends object>(
  definition: TypeaheadPickerDefinition<TMatch>,
) {
  const rules: Array<ReturnType<typeof defineInputRule<TriggerPayload>>> = []

  const triggerPattern = buildTriggerPattern(definition)
  const partialPattern = buildPartialPattern(definition)
  const completePattern = buildCompletePattern(definition)

  if (completePattern) {
    const completeRule = defineInputRule<TriggerPayload>({
      on: completePattern,
      guard: ({snapshot, event}) => {
        const lastMatch = event.matches.at(-1)

        if (lastMatch === undefined) {
          return false
        }

        if (lastMatch.targetOffsets.anchor.offset < event.textBefore.length) {
          // Match starts before insertion. Check if the inserted text itself
          // matches the complete pattern (e.g., inserting `:dog:` after `foo:`).
          const insertedMatch = event.textInserted.match(completePattern)

          if (insertedMatch === null || insertedMatch.index !== 0) {
            return false
          }

          const triggerState = getTriggerState(snapshot)

          if (!triggerState) {
            return false
          }

          return {
            ...triggerState,
            lastMatch: {
              ...lastMatch,
              text: event.textInserted,
              targetOffsets: {
                ...lastMatch.targetOffsets,
                anchor: {
                  ...lastMatch.targetOffsets.anchor,
                  offset: event.textBefore.length,
                },
              },
            },
            extractedKeyword: extractKeyword(
              event.textInserted,
              triggerPattern,
              definition.delimiter,
              completePattern,
            ),
          }
        }

        const triggerState = getTriggerState(snapshot)

        if (!triggerState) {
          return false
        }

        return {
          ...triggerState,
          lastMatch,
          extractedKeyword: extractKeyword(
            lastMatch.text,
            triggerPattern,
            definition.delimiter,
            completePattern,
          ),
        }
      },
      actions: [
        ({snapshot}, payload) =>
          createTriggerActions({
            snapshot,
            payload,
            keywordState: 'complete',
            pickerId: definition._id,
          }),
      ],
    })

    rules.push(completeRule)
  }

  const partialRule = defineInputRule<TriggerPayload>({
    on: partialPattern,
    guard: ({snapshot, event}) => {
      const lastMatch = event.matches.at(-1)

      if (lastMatch === undefined) {
        return false
      }

      if (lastMatch.targetOffsets.anchor.offset < event.textBefore.length) {
        // Match starts before insertion. Check if the inserted text itself
        // matches the partial pattern (e.g., inserting `:dog` after `foo:`).
        const insertedMatch = event.textInserted.match(partialPattern)

        if (insertedMatch === null || insertedMatch.index !== 0) {
          return false
        }

        // Don't match if this is actually a complete pattern
        if (completePattern) {
          const completeMatch = event.textInserted.match(completePattern)

          if (
            completeMatch !== null &&
            completeMatch.index === 0 &&
            completeMatch[0] === event.textInserted
          ) {
            return false
          }
        }

        const triggerState = getTriggerState(snapshot)

        if (!triggerState) {
          return false
        }

        return {
          ...triggerState,
          lastMatch: {
            ...lastMatch,
            text: event.textInserted,
            targetOffsets: {
              ...lastMatch.targetOffsets,
              anchor: {
                ...lastMatch.targetOffsets.anchor,
                offset: event.textBefore.length,
              },
            },
          },
          extractedKeyword: extractKeyword(
            event.textInserted,
            triggerPattern,
            definition.delimiter,
          ),
        }
      }

      const triggerState = getTriggerState(snapshot)

      if (!triggerState) {
        return false
      }

      return {
        ...triggerState,
        lastMatch,
        extractedKeyword: extractKeyword(
          lastMatch.text,
          triggerPattern,
          definition.delimiter,
        ),
      }
    },
    actions: [
      ({snapshot}, payload) =>
        createTriggerActions({
          snapshot,
          payload,
          keywordState: 'partial',
          pickerId: definition._id,
        }),
    ],
  })

  rules.push(partialRule)

  const triggerRule = defineInputRule<TriggerPayload>({
    on: triggerPattern,
    guard: ({snapshot, event}) => {
      const lastMatch = event.matches.at(-1)

      if (lastMatch === undefined) {
        return false
      }

      if (event.textInserted !== lastMatch.text) {
        return false
      }

      const triggerState = getTriggerState(snapshot)

      if (!triggerState) {
        return false
      }

      return {
        ...triggerState,
        lastMatch,
        extractedKeyword: '',
      }
    },
    actions: [
      ({snapshot}, payload) =>
        createTriggerActions({
          snapshot,
          payload,
          keywordState: 'partial',
          pickerId: definition._id,
        }),
    ],
  })

  rules.push(triggerRule)

  return rules
}

function createTriggerGuard<TMatch extends object>(
  definition: TypeaheadPickerDefinition<TMatch>,
) {
  return ({
    event,
    snapshot,
    dom,
  }: {
    event: TriggerFoundEvent | KeywordFoundEvent
    snapshot: EditorSnapshot
    dom: Parameters<NonNullable<typeof definition.guard>>[0]['dom']
  }): true | false => {
    if (event.pickerId !== definition._id) {
      return false
    }

    if (!definition.guard) {
      return true
    }

    return definition.guard({
      snapshot,
      dom,
      event: {
        type: 'custom.typeahead trigger found',
      },
    })
  }
}

const triggerListenerCallback = <
  TMatch extends object,
>(): CallbackLogicFunction<
  AnyEventObject,
  TypeaheadPickerMachineEvent<TMatch>,
  {editor: Editor; definition: TypeaheadPickerDefinition<TMatch>}
> => {
  return ({sendBack, input}) => {
    const rules = createInputRules(input.definition)
    const triggerGuard = createTriggerGuard(input.definition)

    const unregisterBehaviors = [
      input.editor.registerBehavior({
        behavior: defineInputRuleBehavior({rules}),
      }),
      input.editor.registerBehavior({
        behavior: defineBehavior<KeywordFoundEvent, KeywordFoundEvent['type']>({
          name: 'typeahead:keywordFound',
          on: 'custom.typeahead keyword found',
          guard: triggerGuard,
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
          name: 'typeahead:triggerFound',
          on: 'custom.typeahead trigger found',
          guard: triggerGuard,
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
}

const escapeListenerCallback = <TMatch extends object>(): CallbackLogicFunction<
  {type: 'context changed'; context: TypeaheadPickerMachineContext<TMatch>},
  TypeaheadPickerMachineEvent<TMatch>,
  {context: TypeaheadPickerMachineContext<TMatch>}
> => {
  return ({sendBack, input, receive}) => {
    let context = input.context

    receive((event) => {
      context = event.context
    })

    return input.context.editor.registerBehavior({
      behavior: defineBehavior({
        name: 'typeahead:escape',
        on: 'keyboard.keydown',
        guard: ({event}) => escapeShortcut.guard(event.originEvent),
        actions: [
          ({snapshot, dom}) => {
            if (!context.focusSpan || !context.definition.onDismiss) {
              return [effect(() => sendBack({type: 'close'}))]
            }

            const patternSelection = {
              anchor: {
                path: context.focusSpan.path,
                offset: context.focusSpan.textBefore.length,
              },
              focus: {
                path: context.focusSpan.path,
                offset:
                  context.focusSpan.node.text.length -
                  context.focusSpan.textAfter.length,
              },
            }

            const dismissActions = context.definition.onDismiss.flatMap(
              (actionSet) =>
                actionSet(
                  {
                    snapshot,
                    dom,
                    event: {
                      type: 'custom.typeahead dismiss',
                      patternSelection,
                    },
                  },
                  true,
                ),
            )

            return [...dismissActions, effect(() => sendBack({type: 'close'}))]
          },
        ],
      }),
    })
  }
}

const arrowListenerCallback = <TMatch extends object>(): CallbackLogicFunction<
  AnyEventObject,
  TypeaheadPickerMachineEvent<TMatch>,
  {editor: Editor}
> => {
  return ({sendBack, input}) => {
    const unregisterBehaviors = [
      input.editor.registerBehavior({
        behavior: defineBehavior({
          name: 'typeahead:arrowDown',
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
          name: 'typeahead:arrowUp',
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
}

const selectionListenerCallback = <
  TMatch extends object,
>(): CallbackLogicFunction<
  AnyEventObject,
  TypeaheadPickerMachineEvent<TMatch>,
  {editor: Editor}
> => {
  return ({sendBack, input}) => {
    const subscription = input.editor.on('selection', () => {
      sendBack({type: 'selection changed'})
    })

    return subscription.unsubscribe
  }
}

type DismissEvent = {
  type: 'custom.typeahead dismiss'
  pickerId: string
}

const dismissListenerCallback = <
  TMatch extends object,
>(): CallbackLogicFunction<
  {type: 'context changed'; context: TypeaheadPickerMachineContext<TMatch>},
  TypeaheadPickerMachineEvent<TMatch>,
  {context: TypeaheadPickerMachineContext<TMatch>}
> => {
  return ({sendBack, input, receive}) => {
    let context = input.context

    receive((event) => {
      context = event.context
    })

    return input.context.editor.registerBehavior({
      behavior: defineBehavior<DismissEvent, DismissEvent['type']>({
        name: 'typeahead:dismiss',
        on: 'custom.typeahead dismiss',
        guard: ({event}) => event.pickerId === context.definition._id,
        actions: [
          ({snapshot, dom}) => {
            if (!context.focusSpan || !context.definition.onDismiss) {
              return [effect(() => sendBack({type: 'close'}))]
            }

            const patternSelection = {
              anchor: {
                path: context.focusSpan.path,
                offset: context.focusSpan.textBefore.length,
              },
              focus: {
                path: context.focusSpan.path,
                offset:
                  context.focusSpan.node.text.length -
                  context.focusSpan.textAfter.length,
              },
            }

            const dismissActions = context.definition.onDismiss.flatMap(
              (actionSet) =>
                actionSet(
                  {
                    snapshot,
                    dom,
                    event: {
                      type: 'custom.typeahead dismiss',
                      patternSelection,
                    },
                  },
                  true,
                ),
            )

            return [...dismissActions, effect(() => sendBack({type: 'close'}))]
          },
        ],
      }),
    })
  }
}

const submitListenerCallback = <TMatch extends object>(): CallbackLogicFunction<
  {type: 'context changed'; context: TypeaheadPickerMachineContext<TMatch>},
  TypeaheadPickerMachineEvent<TMatch>,
  {context: TypeaheadPickerMachineContext<TMatch>}
> => {
  return ({sendBack, input, receive}) => {
    let context = input.context

    receive((event) => {
      context = event.context
    })

    const unregisterBehaviors = [
      input.context.editor.registerBehavior({
        behavior: defineBehavior({
          name: 'typeahead:submitMatch',
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

            return match && focusSpan ? {focusSpan, match} : false
          },
          actions: [
            () => [
              effect(() => {
                sendBack({type: 'select'})
              }),
            ],
          ],
        }),
      }),
      input.context.editor.registerBehavior({
        behavior: defineBehavior({
          name: 'typeahead:submitTriggerOnly',
          on: 'keyboard.keydown',
          guard: ({event}) =>
            (enterShortcut.guard(event.originEvent) ||
              tabShortcut.guard(event.originEvent)) &&
            context.patternText.length === 1,
          actions: [
            ({event}) => [
              forward(event),
              effect(() => {
                sendBack({type: 'close'})
              }),
            ],
          ],
        }),
      }),
      input.context.editor.registerBehavior({
        behavior: defineBehavior({
          name: 'typeahead:submitNoMatches',
          on: 'keyboard.keydown',
          guard: ({event}) =>
            (enterShortcut.guard(event.originEvent) ||
              tabShortcut.guard(event.originEvent)) &&
            context.patternText.length > 1 &&
            context.matches.length === 0,
          actions: [
            ({snapshot, dom}) => {
              if (!context.focusSpan || !context.definition.onDismiss) {
                return [effect(() => sendBack({type: 'close'}))]
              }

              const patternSelection = {
                anchor: {
                  path: context.focusSpan.path,
                  offset: context.focusSpan.textBefore.length,
                },
                focus: {
                  path: context.focusSpan.path,
                  offset:
                    context.focusSpan.node.text.length -
                    context.focusSpan.textAfter.length,
                },
              }

              const dismissActions = context.definition.onDismiss.flatMap(
                (actionSet) =>
                  actionSet(
                    {
                      snapshot,
                      dom,
                      event: {
                        type: 'custom.typeahead dismiss',
                        patternSelection,
                      },
                    },
                    true,
                  ),
              )

              return [
                ...dismissActions,
                effect(() => sendBack({type: 'close'})),
              ]
            },
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
}

const textInsertionListenerCallback = <
  TMatch extends object,
>(): CallbackLogicFunction<
  {type: 'context changed'; context: TypeaheadPickerMachineContext<TMatch>},
  TypeaheadPickerMachineEvent<TMatch>,
  {context: TypeaheadPickerMachineContext<TMatch>}
> => {
  return ({sendBack, input, receive}) => {
    let context = input.context

    receive((event) => {
      context = event.context
    })

    return input.context.editor.registerBehavior({
      behavior: defineBehavior({
        name: 'typeahead:textInsertion',
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
              sendBack({type: 'close'})
            }),
          ],
        ],
      }),
    })
  }
}

type InsertMatchEvent<TMatch extends object> = {
  type: 'custom.typeahead insert match'
  match: TMatch
  focusSpan: FocusSpanData
  keyword: string
  pickerId: string
}

const selectMatchListenerCallback = <
  TMatch extends object,
>(): CallbackLogicFunction<
  AnyEventObject,
  TypeaheadPickerMachineEvent<TMatch>,
  {context: TypeaheadPickerMachineContext<TMatch>}
> => {
  return ({sendBack, input}) => {
    return input.context.editor.registerBehavior({
      behavior: defineBehavior<InsertMatchEvent<TMatch>>({
        name: 'typeahead:selectMatch',
        on: 'custom.typeahead select match',
        guard: ({event}) => event.pickerId === input.context.definition._id,
        actions: [
          ({event, snapshot, dom}) => {
            const patternSelection = {
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
            }

            const selectActions = input.context.definition.onSelect.flatMap(
              (actionSet) =>
                actionSet(
                  {
                    snapshot,
                    dom,
                    event: {
                      type: 'custom.typeahead select',
                      match: event.match,
                      keyword: event.keyword,
                      patternSelection,
                    },
                  },
                  true,
                ),
            )

            return [
              effect(() => {
                sendBack({type: 'close'})
              }),
              ...selectActions,
            ]
          },
        ],
      }),
    })
  }
}

export function createTypeaheadPickerMachine<TMatch extends object>() {
  return setup({
    types: {
      context: {} as TypeaheadPickerMachineContext<TMatch>,
      input: {} as {
        editor: Editor
        definition: TypeaheadPickerDefinition<TMatch>
      },
      events: {} as TypeaheadPickerMachineEvent<TMatch>,
    },
    delays: {
      DEBOUNCE: ({context}) => context.definition.debounceMs ?? 0,
    },
    actors: {
      'trigger listener': fromCallback(triggerListenerCallback<TMatch>()),
      'escape listener': fromCallback(escapeListenerCallback<TMatch>()),
      'arrow listener': fromCallback(arrowListenerCallback<TMatch>()),
      'selection listener': fromCallback(selectionListenerCallback<TMatch>()),
      'submit listener': fromCallback(submitListenerCallback<TMatch>()),
      'text insertion listener': fromCallback(
        textInsertionListenerCallback<TMatch>(),
      ),
      'select match listener': fromCallback(
        selectMatchListenerCallback<TMatch>(),
      ),
      'dismiss listener': fromCallback(dismissListenerCallback<TMatch>()),
      'get matches': fromPromise(
        async ({
          input,
        }: {
          input: {
            keyword: string
            getMatches: TypeaheadPickerDefinition<TMatch>['getMatches']
          }
        }) => {
          const result = input.getMatches({keyword: input.keyword})
          const matches = await Promise.resolve(result)
          return {keyword: input.keyword, matches}
        },
      ),
    },
    actions: {
      'handle trigger found': assign(({context, event}) => {
        if (
          event.type !== 'custom.typeahead trigger found' &&
          event.type !== 'custom.typeahead keyword found'
        ) {
          return {}
        }

        const focusSpan = event.focusSpan
        const patternText = extractPatternTextFromFocusSpan(focusSpan)
        const keyword = event.extractedKeyword

        if (
          context.definition.mode === 'async' ||
          context.definition.debounceMs
        ) {
          return {
            focusSpan,
            patternText,
            keyword,
            isLoading: true,
            selectedIndex: 0,
          }
        }

        const matches = context.definition.getMatches({
          keyword,
        }) as Array<TMatch>

        return {
          focusSpan,
          patternText,
          keyword,
          matches,
          requestedKeyword: keyword,
          isLoading: false,
          selectedIndex: 0,
        }
      }),
      'handle selection changed': assign(({context}) => {
        if (!context.focusSpan) {
          return {focusSpan: undefined}
        }

        const snapshot = context.editor.getSnapshot()
        const currentFocusSpan = getFocusSpan(snapshot)

        if (!snapshot.context.selection || !currentFocusSpan) {
          return {focusSpan: undefined}
        }

        const nextSpan = getNextSpan({
          ...snapshot,
          context: {
            ...snapshot.context,
            selection: {
              anchor: {path: context.focusSpan.path, offset: 0},
              focus: {path: context.focusSpan.path, offset: 0},
            },
          },
        })

        if (!isEqualPaths(currentFocusSpan.path, context.focusSpan.path)) {
          if (
            nextSpan &&
            context.focusSpan.textAfter.length === 0 &&
            snapshot.context.selection.focus.offset === 0 &&
            isSelectionCollapsed(snapshot)
          ) {
            // Edge case: caret moved from end of focus span to start of next span
            return {}
          }
          return {focusSpan: undefined}
        }

        if (
          !currentFocusSpan.node.text.startsWith(context.focusSpan.textBefore)
        ) {
          return {focusSpan: undefined}
        }

        if (!currentFocusSpan.node.text.endsWith(context.focusSpan.textAfter)) {
          return {focusSpan: undefined}
        }

        const keywordAnchor = {
          path: currentFocusSpan.path,
          offset: context.focusSpan.textBefore.length,
        }
        const keywordFocus = {
          path: currentFocusSpan.path,
          offset:
            currentFocusSpan.node.text.length -
            context.focusSpan.textAfter.length,
        }

        const selectionIsBeforeKeyword =
          isPointAfterSelection(keywordAnchor)(snapshot)
        const selectionIsAfterKeyword =
          isPointBeforeSelection(keywordFocus)(snapshot)

        if (selectionIsBeforeKeyword || selectionIsAfterKeyword) {
          return {focusSpan: undefined}
        }

        const focusSpan = {
          node: currentFocusSpan.node,
          path: currentFocusSpan.path,
          textBefore: context.focusSpan.textBefore,
          textAfter: context.focusSpan.textAfter,
        }

        const patternText = extractPatternTextFromFocusSpan(focusSpan)

        const keyword = extractKeyword(
          patternText,
          context.triggerPattern,
          context.definition.delimiter,
          context.completePattern,
        )

        if (
          context.definition.mode === 'async' ||
          context.definition.debounceMs
        ) {
          return {
            focusSpan,
            patternText,
            keyword,
            selectedIndex:
              patternText !== context.patternText ? 0 : context.selectedIndex,
            isLoading:
              context.isLoading || context.requestedKeyword !== keyword,
          }
        }

        const matches = context.definition.getMatches({
          keyword,
        }) as Array<TMatch>

        return {
          focusSpan,
          patternText,
          keyword,
          matches,
          requestedKeyword: keyword,
          selectedIndex:
            patternText !== context.patternText ? 0 : context.selectedIndex,
          isLoading: false,
        }
      }),
      'handle async load complete': assign(({context, event}) => {
        const output = (
          event as unknown as {
            output: {keyword: string; matches: ReadonlyArray<TMatch>}
          }
        ).output

        if (output.keyword !== context.keyword) {
          return {isLoading: context.keyword !== context.requestedKeyword}
        }

        return {
          matches: output.matches,
          isLoading: context.keyword !== context.requestedKeyword,
        }
      }),
      'reset': assign({
        patternText: '',
        keyword: '',
        matches: [],
        selectedIndex: 0,
        isLoading: false,
        requestedKeyword: '',
        focusSpan: undefined,
        error: undefined,
      }),
      'navigate': assign(({context, event}) => {
        if (context.matches.length === 0) {
          return {selectedIndex: 0}
        }

        if (event.type === 'navigate to') {
          return {selectedIndex: event.index}
        }

        if (event.type === 'navigate up') {
          return {
            selectedIndex:
              (context.selectedIndex - 1 + context.matches.length) %
              context.matches.length,
          }
        }

        return {
          selectedIndex: (context.selectedIndex + 1) % context.matches.length,
        }
      }),
      'select match': ({context}, params: {exact?: boolean}) => {
        if (!context.focusSpan) {
          return
        }

        const match = params.exact
          ? getFirstExactMatch(context.matches)
          : context.matches[context.selectedIndex]

        if (!match) {
          return
        }

        context.editor.send({
          type: 'custom.typeahead select match',
          match,
          focusSpan: context.focusSpan,
          keyword: context.keyword,
          pickerId: context.definition._id,
        })
      },
      'update submit listener context': sendTo(
        'submit listener',
        ({context}) => ({type: 'context changed', context}),
      ),
      'update text insertion listener context': sendTo(
        'text insertion listener',
        ({context}) => ({type: 'context changed', context}),
      ),
      'update escape listener context': sendTo(
        'escape listener',
        ({context}) => ({type: 'context changed', context}),
      ),
      'update request dismiss listener context': sendTo(
        'dismiss listener',
        ({context}) => ({type: 'context changed', context}),
      ),
      'handle error': assign({
        isLoading: false,
        error: ({event}) => (event as {error: Error}).error,
      }),
    },
    guards: {
      'no focus span': ({context}) => !context.focusSpan,
      'invalid pattern': ({context}) => {
        if (!context.patternText) {
          return true
        }

        // Check if trigger pattern matches entire text (just the trigger, no keyword yet)
        const triggerMatch = context.patternText.match(context.triggerPattern)

        if (
          triggerMatch &&
          triggerMatch.index === 0 &&
          triggerMatch[0] === context.patternText
        ) {
          return false
        }

        // Check partial pattern matches entire text
        const partialMatch = context.patternText.match(context.partialPattern)

        if (
          partialMatch &&
          partialMatch.index === 0 &&
          partialMatch[0] === context.patternText
        ) {
          return false
        }

        // Check complete pattern matches entire text (if configured)
        if (context.completePattern) {
          const completeMatch = context.patternText.match(
            context.completePattern,
          )

          if (
            completeMatch &&
            completeMatch.index === 0 &&
            completeMatch[0] === context.patternText
          ) {
            return false
          }
        }

        return true
      },
      'no debounce': ({context}) =>
        !context.definition.debounceMs || context.definition.debounceMs === 0,
      'is complete keyword': ({context}) => {
        if (!context.completePattern || !context.focusSpan) {
          return false
        }

        const fullKeywordText = context.focusSpan.node.text.slice(
          context.focusSpan.textBefore.length,
          context.focusSpan.textAfter.length > 0
            ? -context.focusSpan.textAfter.length
            : undefined,
        )
        const completeMatch = fullKeywordText.match(context.completePattern)

        if (
          !completeMatch ||
          completeMatch.index !== 0 ||
          completeMatch[0] !== fullKeywordText
        ) {
          return false
        }

        return hasAtLeastOneExactMatch(context.matches)
      },
      'has matches': ({context}) => context.matches.length > 0,
      'no matches': ({context}) => context.matches.length === 0,
      'is loading': ({context}) => context.isLoading,
    },
  }).createMachine({
    id: 'typeahead picker',
    context: ({input}) => ({
      editor: input.editor,
      definition: input.definition,
      triggerPattern: buildTriggerPattern(input.definition),
      partialPattern: buildPartialPattern(input.definition),
      completePattern: buildCompletePattern(input.definition),
      matches: [],
      selectedIndex: 0,
      focusSpan: undefined,
      patternText: '',
      keyword: '',
      requestedKeyword: '',
      error: undefined,
      isLoading: false,
    }),
    initial: 'idle',
    states: {
      'idle': {
        entry: ['reset'],
        invoke: {
          src: 'trigger listener',
          input: ({context}) => ({
            editor: context.editor,
            definition: context.definition,
          }),
        },
        on: {
          'custom.typeahead trigger found': {
            target: 'active',
            actions: ['handle trigger found'],
          },
          'custom.typeahead keyword found': {
            target: 'checking complete',
            actions: ['handle trigger found'],
          },
        },
      },
      'checking complete': {
        invoke: [
          {
            src: 'select match listener',
            input: ({context}) => ({context}),
          },
          {
            src: 'get matches',
            input: ({context}) => ({
              keyword: context.keyword,
              getMatches: context.definition.getMatches,
            }),
            onDone: [
              {
                guard: ({event}) =>
                  hasAtLeastOneExactMatch(event.output.matches),
                target: 'idle',
                actions: [
                  assign({matches: ({event}) => event.output.matches}),
                  {type: 'select match', params: {exact: true}},
                ],
              },
              {
                target: 'active',
                actions: [assign({matches: ({event}) => event.output.matches})],
              },
            ],
            onError: {
              target: 'active.no matches',
              actions: ['handle error'],
            },
          },
        ],
      },
      'active': {
        invoke: [
          {
            src: 'select match listener',
            input: ({context}) => ({context}),
          },
          {
            src: 'escape listener',
            id: 'escape listener',
            input: ({context}) => ({context}),
          },
          {
            src: 'selection listener',
            input: ({context}) => ({editor: context.editor}),
          },
          {
            src: 'submit listener',
            id: 'submit listener',
            input: ({context}) => ({context}),
          },
          {
            src: 'text insertion listener',
            id: 'text insertion listener',
            input: ({context}) => ({context}),
          },
          {
            src: 'dismiss listener',
            id: 'dismiss listener',
            input: ({context}) => ({context}),
          },
        ],
        on: {
          'close': {
            target: 'idle',
          },
          'selection changed': {
            actions: [
              'handle selection changed',
              'update submit listener context',
              'update text insertion listener context',
              'update escape listener context',
              'update request dismiss listener context',
            ],
          },
        },
        always: [
          {
            guard: 'no focus span',
            target: 'idle',
          },
          {
            guard: 'invalid pattern',
            target: 'idle',
          },
          {
            guard: 'is complete keyword',
            actions: [{type: 'select match', params: {exact: false}}],
            target: 'idle',
          },
        ],
        initial: 'evaluating',
        states: {
          'evaluating': {
            always: [
              {
                guard: 'is loading',
                target: 'loading',
              },
              {
                guard: 'has matches',
                target: 'showing matches',
              },
              {
                target: 'no matches',
              },
            ],
          },
          'loading': {
            entry: [assign({requestedKeyword: ({context}) => context.keyword})],
            initial: 'debouncing',
            states: {
              debouncing: {
                always: [{guard: 'no debounce', target: 'fetching'}],
                after: {
                  DEBOUNCE: 'fetching',
                },
              },
              fetching: {
                invoke: {
                  src: 'get matches',
                  input: ({context}) => ({
                    keyword: context.keyword,
                    getMatches: context.definition.getMatches,
                  }),
                  onDone: {
                    target: '#typeahead picker.active.evaluating',
                    actions: [
                      assign(({context, event}) => {
                        if (event.output.keyword !== context.keyword) {
                          return {
                            isLoading:
                              context.patternText !== context.requestedKeyword,
                          }
                        }

                        return {
                          matches: event.output.matches,
                          isLoading:
                            context.keyword !== context.requestedKeyword,
                        }
                      }),
                    ],
                  },
                  onError: {
                    target: '#typeahead picker.active.no matches',
                    actions: ['handle error'],
                  },
                },
              },
            },
          },
          'no matches': {
            entry: [assign({selectedIndex: 0})],
            always: [
              {
                guard: 'has matches',
                target: 'showing matches',
              },
            ],
            initial: 'idle',
            states: {
              idle: {
                always: [{guard: 'is loading', target: 'loading'}],
              },
              loading: {
                entry: [
                  assign({
                    requestedKeyword: ({context}) => context.keyword,
                  }),
                ],
                initial: 'debouncing',
                states: {
                  debouncing: {
                    always: [{guard: 'no debounce', target: 'fetching'}],
                    after: {
                      DEBOUNCE: 'fetching',
                    },
                  },
                  fetching: {
                    invoke: {
                      src: 'get matches',
                      input: ({context}) => ({
                        keyword: context.keyword,
                        getMatches: context.definition.getMatches,
                      }),
                      onDone: {
                        target: '#typeahead picker.active.no matches.idle',
                        actions: ['handle async load complete'],
                      },
                      onError: {
                        target: '#typeahead picker.active.no matches.idle',
                        actions: ['handle error'],
                      },
                    },
                  },
                },
              },
            },
          },
          'showing matches': {
            entry: [
              'update submit listener context',
              'update text insertion listener context',
            ],
            invoke: {
              src: 'arrow listener',
              input: ({context}) => ({editor: context.editor}),
            },
            always: [
              {
                guard: 'no matches',
                target: 'no matches',
              },
            ],
            on: {
              'navigate down': {
                actions: [
                  'navigate',
                  'update submit listener context',
                  'update text insertion listener context',
                ],
              },
              'navigate up': {
                actions: [
                  'navigate',
                  'update submit listener context',
                  'update text insertion listener context',
                ],
              },
              'navigate to': {
                actions: [
                  'navigate',
                  'update submit listener context',
                  'update text insertion listener context',
                ],
              },
              'select': {
                target: '#typeahead picker.idle',
                actions: [{type: 'select match', params: {exact: false}}],
              },
            },
            initial: 'idle',
            states: {
              idle: {
                always: [{guard: 'is loading', target: 'loading'}],
              },
              loading: {
                entry: [
                  assign({
                    requestedKeyword: ({context}) => context.keyword,
                  }),
                ],
                initial: 'debouncing',
                states: {
                  debouncing: {
                    always: [{guard: 'no debounce', target: 'fetching'}],
                    after: {
                      DEBOUNCE: 'fetching',
                    },
                  },
                  fetching: {
                    invoke: {
                      src: 'get matches',
                      input: ({context}) => ({
                        keyword: context.keyword,
                        getMatches: context.definition.getMatches,
                      }),
                      onDone: {
                        target: '#typeahead picker.active.showing matches.idle',
                        actions: ['handle async load complete'],
                      },
                      onError: {
                        target: '#typeahead picker.active.showing matches.idle',
                        actions: ['handle error'],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
}

/**
 * Check if matches contain at least one exact match.
 */
function hasAtLeastOneExactMatch<TMatch extends object>(
  matches: ReadonlyArray<TMatch>,
): boolean {
  return matches.some(
    (match) =>
      (match as unknown as AutoCompleteMatch | undefined)?.type === 'exact',
  )
}

/**
 * Get the first exact match from matches.
 */
function getFirstExactMatch<TMatch extends object>(
  matches: ReadonlyArray<TMatch>,
): TMatch | undefined {
  return matches.find(
    (match) =>
      (match as unknown as AutoCompleteMatch | undefined)?.type === 'exact',
  )
}
