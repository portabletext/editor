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
import {extractKeywordFromPattern} from './extract-keyword'
import type {
  AutoCompleteMatch,
  TypeaheadPickerDefinition,
} from './typeahead-picker.types'

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Normalize a RegExp by stripping user-provided flags.
 *
 * The input rule system always uses 'gd' flags internally, ignoring any
 * user-provided flags. We normalize patterns to match this behavior and
 * ensure consistency across all pattern usage in the picker.
 */
function normalizePattern(pattern: RegExp): RegExp {
  return new RegExp(pattern.source)
}

/**
 * Build the complete pattern by appending autoCompleteWith to the base pattern.
 */
function buildCompletePattern<TMatch extends object>(
  definition: TypeaheadPickerDefinition<TMatch>,
): RegExp | undefined {
  if (!definition.autoCompleteWith) {
    return undefined
  }
  const autoCompleteWith = escapeRegExp(definition.autoCompleteWith)
  return new RegExp(`${definition.pattern.source}${autoCompleteWith}`)
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
  pickerId: symbol
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
  pickerId: symbol
}

function createTriggerFoundEvent(payload: {
  focusSpan: FocusSpanData
  extractedKeyword: string
  pickerId: symbol
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
  pickerId: symbol
}

function createKeywordFoundEvent(payload: {
  focusSpan: FocusSpanData
  extractedKeyword: string
  pickerId: symbol
}): KeywordFoundEvent {
  return {
    type: 'custom.typeahead keyword found',
    ...payload,
  }
}

type TypeaheadPickerMachineContext<TMatch extends object> = {
  editor: Editor
  definition: TypeaheadPickerDefinition<TMatch>
  partialPattern: RegExp
  completePattern: RegExp | undefined
  matches: ReadonlyArray<TMatch>
  selectedIndex: number
  focusSpan: FocusSpanData | undefined
  fullMatch: string
  keyword: string
  loadingFullMatch: string
  error: Error | undefined
  isLoading: boolean
}

type TypeaheadPickerMachineEvent<TMatch extends object> =
  | TriggerFoundEvent
  | KeywordFoundEvent
  | {type: 'selection changed'}
  | {type: 'dismiss'}
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
 * Extract the full match (trigger + keyword) from focus span data.
 */
function extractFullMatchFromFocusSpan(focusSpan: FocusSpanData): string {
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

/**
 * Validate and update focus span based on current editor state.
 * Returns updated focus span or undefined if invalid.
 */
function validateFocusSpan(
  currentFocusSpan: FocusSpanData,
  editor: Editor,
  partialPattern: RegExp,
  completePattern: RegExp | undefined,
): FocusSpanData | undefined {
  const snapshot = editor.getSnapshot()
  const focusSpan = getFocusSpan(snapshot)

  if (!snapshot.context.selection || !focusSpan) {
    return undefined
  }

  const nextSpan = getNextSpan({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: {
        anchor: {path: currentFocusSpan.path, offset: 0},
        focus: {path: currentFocusSpan.path, offset: 0},
      },
    },
  })

  if (!isEqualPaths(focusSpan.path, currentFocusSpan.path)) {
    if (
      nextSpan &&
      currentFocusSpan.textAfter.length === 0 &&
      snapshot.context.selection.focus.offset === 0 &&
      isSelectionCollapsed(snapshot)
    ) {
      return currentFocusSpan
    }

    return undefined
  }

  if (!focusSpan.node.text.startsWith(currentFocusSpan.textBefore)) {
    return undefined
  }

  if (!focusSpan.node.text.endsWith(currentFocusSpan.textAfter)) {
    return undefined
  }

  const keywordAnchor = {
    path: focusSpan.path,
    offset: currentFocusSpan.textBefore.length,
  }
  const keywordFocus = {
    path: focusSpan.path,
    offset: focusSpan.node.text.length - currentFocusSpan.textAfter.length,
  }

  const selectionIsBeforeKeyword =
    isPointAfterSelection(keywordAnchor)(snapshot)
  const selectionIsAfterKeyword = isPointBeforeSelection(keywordFocus)(snapshot)

  if (selectionIsBeforeKeyword || selectionIsAfterKeyword) {
    return undefined
  }

  const keywordText = focusSpan.node.text.slice(
    currentFocusSpan.textBefore.length,
    currentFocusSpan.textAfter.length > 0
      ? -currentFocusSpan.textAfter.length
      : undefined,
  )
  const patternMatch = keywordText.match(partialPattern)

  if (!patternMatch || patternMatch.index !== 0) {
    return undefined
  }

  let matchEnd = currentFocusSpan.textBefore.length + patternMatch[0].length

  if (completePattern) {
    const completeMatch = keywordText.match(completePattern)

    if (
      completeMatch &&
      completeMatch.index === 0 &&
      completeMatch[0] === keywordText
    ) {
      matchEnd = currentFocusSpan.textBefore.length + completeMatch[0].length
    }
  }

  if (snapshot.context.selection.focus.offset > matchEnd) {
    return undefined
  }

  return {
    node: focusSpan.node,
    path: focusSpan.path,
    textBefore: currentFocusSpan.textBefore,
    textAfter: currentFocusSpan.textAfter,
  }
}

/**
 * Extract keyword from input rule match using groupMatches when available.
 * Falls back to extractKeywordFromPattern for patterns without capture groups
 * or when the capture group is empty (which can happen with patterns like
 * `/:(\S*):/` matching `::` where the capture group matches empty string).
 */
function extractKeywordFromMatch(
  match: InputRuleMatch,
  pattern: RegExp,
  autoCompleteWith?: string,
): string {
  const firstGroupMatch = match.groupMatches[0]
  if (firstGroupMatch && firstGroupMatch.text.length > 0) {
    return firstGroupMatch.text
  }
  return extractKeywordFromPattern(match.text, pattern, autoCompleteWith)
}

function createInputRules<TMatch extends object>(
  definition: TypeaheadPickerDefinition<TMatch>,
) {
  const rules: Array<ReturnType<typeof defineInputRule<TriggerPayload>>> = []

  const partialPattern = definition.pattern
  const completePattern = buildCompletePattern(definition)

  if (completePattern) {
    const completeTriggerRule = defineInputRule<TriggerPayload>({
      on: completePattern,
      guard: ({snapshot, event}) => {
        const lastMatch = event.matches.at(-1)

        if (!lastMatch) {
          return false
        }

        if (lastMatch.targetOffsets.anchor.offset < event.textBefore.length) {
          return false
        }

        const triggerState = getTriggerState(snapshot)

        if (!triggerState) {
          return false
        }

        const textAfterInsertion = event.textBefore + event.textInserted
        const textAfterMatch = textAfterInsertion.slice(
          lastMatch.targetOffsets.focus.offset,
        )

        if (textAfterMatch.length > 0) {
          return false
        }

        return {
          ...triggerState,
          lastMatch,
          extractedKeyword: extractKeywordFromMatch(
            lastMatch,
            partialPattern,
            definition.autoCompleteWith,
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

    rules.push(completeTriggerRule)
  }

  const partialTriggerRule = defineInputRule<TriggerPayload>({
    on: partialPattern,
    guard: ({snapshot, event}) => {
      const lastMatch = event.matches.at(-1)

      if (!lastMatch) {
        return false
      }

      if (lastMatch.targetOffsets.anchor.offset < event.textBefore.length) {
        return false
      }

      const triggerState = getTriggerState(snapshot)

      if (!triggerState) {
        return false
      }

      if (completePattern) {
        const fullText = triggerState.focusSpan.node.text
        const textFromMatchStart = fullText.slice(
          lastMatch.targetOffsets.anchor.offset,
        )

        const completeMatch = textFromMatchStart.match(completePattern)
        if (completeMatch && completeMatch.index === 0) {
          return false
        }
      }

      return {
        ...triggerState,
        lastMatch,
        extractedKeyword: extractKeywordFromMatch(
          lastMatch,
          partialPattern,
          definition.autoCompleteWith,
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

  rules.push(partialTriggerRule)

  return rules
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

    const unregisterBehaviors = [
      input.editor.registerBehavior({
        behavior: defineInputRuleBehavior({rules}),
      }),
      input.editor.registerBehavior({
        behavior: defineBehavior<KeywordFoundEvent, KeywordFoundEvent['type']>({
          on: 'custom.typeahead keyword found',
          guard: ({event}) => event.pickerId === input.definition._id,
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
          on: 'custom.typeahead trigger found',
          guard: ({event}) => event.pickerId === input.definition._id,
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
  AnyEventObject,
  TypeaheadPickerMachineEvent<TMatch>,
  {editor: Editor}
> => {
  return ({sendBack, input}) => {
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
          on: 'keyboard.keydown',
          guard: ({event}) =>
            (enterShortcut.guard(event.originEvent) ||
              tabShortcut.guard(event.originEvent)) &&
            context.fullMatch.length === 1,
          actions: [
            ({event}) => [
              forward(event),
              effect(() => {
                sendBack({type: 'dismiss'})
              }),
            ],
          ],
        }),
      }),
      input.context.editor.registerBehavior({
        behavior: defineBehavior({
          on: 'keyboard.keydown',
          guard: ({event}) =>
            (enterShortcut.guard(event.originEvent) ||
              tabShortcut.guard(event.originEvent)) &&
            context.fullMatch.length > 1 &&
            context.matches.length === 0,
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
}

type InsertMatchEvent<TMatch extends object> = {
  type: 'custom.typeahead insert match'
  match: TMatch
  focusSpan: FocusSpanData
  keyword: string
  pickerId: symbol
}

const insertMatchListenerCallback = <
  TMatch extends object,
>(): CallbackLogicFunction<
  AnyEventObject,
  TypeaheadPickerMachineEvent<TMatch>,
  {context: TypeaheadPickerMachineContext<TMatch>}
> => {
  return ({sendBack, input}) => {
    return input.context.editor.registerBehavior({
      behavior: defineBehavior<InsertMatchEvent<TMatch>>({
        on: 'custom.typeahead insert match',
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

            const allActions: Array<
              ReturnType<typeof raise> | ReturnType<typeof effect>
            > = [
              effect(() => {
                sendBack({type: 'dismiss'})
              }),
            ]

            for (const actionSet of input.context.definition.actions) {
              const actions = actionSet(
                {
                  snapshot,
                  dom,
                  event: {
                    type: 'typeahead.select',
                    match: event.match,
                    keyword: event.keyword,
                    patternSelection,
                  },
                },
                true,
              )
              for (const action of actions) {
                allActions.push(
                  action as
                    | ReturnType<typeof raise>
                    | ReturnType<typeof effect>,
                )
              }
            }

            // Dispatch a select event after all actions complete to exit
            // input-rule's "input rule applied" state. We use queueMicrotask
            // to ensure this runs after the cursor has moved to its final position.
            allActions.push(
              effect(() => {
                queueMicrotask(() => {
                  const currentSelection =
                    input.context.editor.getSnapshot().context.selection
                  if (currentSelection) {
                    input.context.editor.send({
                      type: 'select',
                      at: currentSelection,
                    })
                  }
                })
              }),
            )

            return allActions
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
      'insert match listener': fromCallback(
        insertMatchListenerCallback<TMatch>(),
      ),
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
        const fullMatch = extractFullMatchFromFocusSpan(focusSpan)
        const keyword = event.extractedKeyword

        if (
          context.definition.mode === 'async' ||
          context.definition.debounceMs
        ) {
          return {
            focusSpan,
            fullMatch,
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
          fullMatch,
          keyword,
          matches,
          loadingFullMatch: fullMatch,
          isLoading: false,
          selectedIndex: 0,
        }
      }),
      'handle selection changed': assign(({context}) => {
        if (!context.focusSpan) {
          return {
            focusSpan: undefined,
            fullMatch: '',
            keyword: '',
            matches: [],
            selectedIndex: 0,
            isLoading: false,
          }
        }

        const updatedFocusSpan = validateFocusSpan(
          context.focusSpan,
          context.editor,
          context.partialPattern,
          context.completePattern,
        )

        if (!updatedFocusSpan) {
          return {
            focusSpan: undefined,
            fullMatch: '',
            keyword: '',
            matches: [],
            selectedIndex: 0,
            isLoading: false,
          }
        }

        const fullMatch = extractFullMatchFromFocusSpan(updatedFocusSpan)

        if (fullMatch === context.fullMatch) {
          return {focusSpan: updatedFocusSpan}
        }

        const keyword = extractKeywordFromPattern(
          fullMatch,
          context.definition.pattern,
          context.definition.autoCompleteWith,
        )

        if (
          context.definition.mode === 'async' ||
          context.definition.debounceMs
        ) {
          return {
            focusSpan: updatedFocusSpan,
            fullMatch,
            keyword,
            selectedIndex: 0,
            isLoading:
              context.isLoading || context.loadingFullMatch !== fullMatch,
          }
        }

        const matches = context.definition.getMatches({
          keyword,
        }) as Array<TMatch>

        return {
          focusSpan: updatedFocusSpan,
          fullMatch,
          keyword,
          matches,
          loadingFullMatch: fullMatch,
          selectedIndex: 0,
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
          return {isLoading: context.fullMatch !== context.loadingFullMatch}
        }

        return {
          matches: output.matches,
          isLoading: context.fullMatch !== context.loadingFullMatch,
        }
      }),
      'reset': assign({
        fullMatch: '',
        keyword: '',
        matches: [],
        selectedIndex: 0,
        isLoading: false,
        loadingFullMatch: '',
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
      'insert match': ({context}, params: {exact?: boolean}) => {
        if (!context.focusSpan) {
          return
        }

        const match = params.exact
          ? getExactMatch(context.matches)
          : context.matches[context.selectedIndex]

        if (!match) {
          return
        }

        context.editor.send({
          type: 'custom.typeahead insert match',
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
      'handle error': assign({
        isLoading: false,
        error: ({event}) => (event as {error: Error}).error,
      }),
    },
    guards: {
      'no focus span': ({context}) => !context.focusSpan,
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
        return hasExactlyOneExactMatch(context.matches)
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
      partialPattern: normalizePattern(input.definition.pattern),
      completePattern: buildCompletePattern(input.definition),
      matches: [],
      selectedIndex: 0,
      focusSpan: undefined,
      fullMatch: '',
      keyword: '',
      loadingFullMatch: '',
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
            src: 'insert match listener',
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
                  hasExactlyOneExactMatch(event.output.matches),
                target: 'idle',
                actions: [
                  assign({matches: ({event}) => event.output.matches}),
                  {type: 'insert match', params: {exact: true}},
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
            src: 'insert match listener',
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
            src: 'submit listener',
            id: 'submit listener',
            input: ({context}) => ({context}),
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
          'selection changed': {
            actions: [
              'handle selection changed',
              'update submit listener context',
              'update text insertion listener context',
            ],
          },
        },
        always: [
          {
            guard: 'no focus span',
            target: 'idle',
          },
          {
            guard: 'is complete keyword',
            actions: [{type: 'insert match', params: {exact: false}}],
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
            entry: [
              assign({loadingFullMatch: ({context}) => context.fullMatch}),
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
                    target: '#typeahead picker.active.evaluating',
                    actions: [
                      assign(({context, event}) => {
                        if (event.output.keyword !== context.keyword) {
                          return {
                            isLoading:
                              context.fullMatch !== context.loadingFullMatch,
                          }
                        }

                        return {
                          matches: event.output.matches,
                          isLoading:
                            context.fullMatch !== context.loadingFullMatch,
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
                  assign({loadingFullMatch: ({context}) => context.fullMatch}),
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
                actions: [{type: 'insert match', params: {exact: false}}],
              },
            },
            initial: 'idle',
            states: {
              idle: {
                always: [{guard: 'is loading', target: 'loading'}],
              },
              loading: {
                entry: [
                  assign({loadingFullMatch: ({context}) => context.fullMatch}),
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
 * Check if matches contain exactly one exact match.
 */
function hasExactlyOneExactMatch<TMatch extends object>(
  matches: ReadonlyArray<TMatch>,
): boolean {
  return (
    matches.filter(
      (match) =>
        (match as unknown as AutoCompleteMatch | undefined)?.type === 'exact',
    ).length === 1
  )
}

/**
 * Get the single exact match from matches, if there is exactly one.
 */
function getExactMatch<TMatch extends object>(
  matches: ReadonlyArray<TMatch>,
): TMatch | undefined {
  const exactMatches = matches.filter(
    (match) =>
      (match as unknown as AutoCompleteMatch | undefined)?.type === 'exact',
  )

  return exactMatches.length === 1 ? exactMatches[0] : undefined
}
