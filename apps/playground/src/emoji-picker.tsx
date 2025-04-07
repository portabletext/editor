import {
  useEditor,
  type BlockOffset,
  type Editor,
  type EditorSelectionPoint,
  type EditorSnapshot,
} from '@portabletext/editor'
import {
  defineBehavior,
  effect,
  execute,
  noop,
  raise,
} from '@portabletext/editor/behaviors'
import * as selectors from '@portabletext/editor/selectors'
import * as utils from '@portabletext/editor/utils'
import {useActorRef, useSelector} from '@xstate/react'
import {useEffect, useRef} from 'react'
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
import {Button} from './components/button'
import {matchEmojis, type EmojiMatch} from './emoji-search'

type EmojiPickerContext = {
  editor: Editor
  matches: Array<EmojiMatch>
  selectedIndex: number
  keywordAnchor?: {
    point: EditorSelectionPoint
    blockOffset: BlockOffset
  }
  keywordFocus?: BlockOffset
  incompleteKeywordRegex: RegExp
  keyword: string
}

type EmojiPickerEvent =
  | {
      type: 'colon inserted'
      point: EditorSelectionPoint
      blockOffset: BlockOffset
    }
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

const colonListenerCallback: CallbackLogicFunction<
  AnyEventObject,
  EmojiPickerEvent,
  {editor: Editor}
> = ({sendBack, input}) => {
  return input.editor.registerBehavior({
    behavior: defineBehavior({
      on: 'insert.text',
      guard: ({snapshot, event}) => {
        if (event.text !== ':' || !snapshot.context.selection) {
          return false
        }

        const blockOffset = utils.spanSelectionPointToBlockOffset({
          value: snapshot.context.value,
          selectionPoint: snapshot.context.selection.focus,
        })

        return blockOffset
          ? {
              point: snapshot.context.selection.focus,
              blockOffset,
            }
          : false
      },
      actions: [
        (_, {point, blockOffset}) => [
          execute({
            type: 'insert.text',
            text: ':',
          }),
          effect(() => {
            sendBack({type: 'colon inserted', point, blockOffset})
          }),
        ],
      ],
    }),
  })
}

const escapeListenerCallback: CallbackLogicFunction<
  AnyEventObject,
  EmojiPickerEvent,
  {editor: Editor}
> = ({sendBack, input}) => {
  return input.editor.registerBehavior({
    behavior: defineBehavior({
      on: 'keyboard.keydown',
      guard: ({event}) => event.originEvent.key === 'Escape',
      actions: [
        () => [
          noop(),
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
        guard: ({event}) => event.originEvent.key === 'ArrowDown',
        actions: [
          () => [
            {
              type: 'noop',
            },
            {
              type: 'effect',
              effect: () => {
                sendBack({type: 'navigate down'})
              },
            },
          ],
        ],
      }),
    }),
    input.editor.registerBehavior({
      behavior: defineBehavior({
        on: 'keyboard.keydown',
        guard: ({event}) => event.originEvent.key === 'ArrowUp',
        actions: [
          () => [
            {
              type: 'noop',
            },
            {
              type: 'effect',
              effect: () => {
                sendBack({type: 'navigate up'})
              },
            },
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
            execute({
              type: 'delete.text',
              at: {anchor: event.anchor, focus: event.focus},
            }),
            execute({
              type: 'insert.text',
              text: event.emoji,
            }),
          ],
        ],
      }),
    }),
    input.context.editor.registerBehavior({
      behavior: defineBehavior({
        on: 'insert.text',
        guard: ({event}) => {
          if (event.text !== ':') {
            return false
          }

          const anchor = context.keywordAnchor?.blockOffset
          const focus = context.keywordFocus
          const match = context.matches[context.selectedIndex]

          return match && match.type === 'exact' && anchor && focus
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
        guard: ({event}) => {
          if (
            event.originEvent.key !== 'Enter' &&
            event.originEvent.key !== 'Tab'
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
          event.originEvent.key === 'Enter' || event.originEvent.key === 'Tab',
        actions: [
          () => [
            {
              type: 'noop',
            },
            {
              type: 'effect',
              effect: () => {
                sendBack({type: 'dismiss'})
              },
            },
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
            execute(event),
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
            execute(event),
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
            execute(event),
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

const emojiPickerMachine = setup({
  types: {
    context: {} as EmojiPickerContext,
    input: {} as {
      editor: Editor
    },
    events: {} as EmojiPickerEvent,
  },
  actors: {
    'emoji insert listener': fromCallback(emojiInsertListener),
    'arrow listener': fromCallback(arrowListenerCallback),
    'colon listener': fromCallback(colonListenerCallback),
    'escape listener': fromCallback(escapeListenerCallback),
    'selection listener': fromCallback(selectionListenerCallback),
    'text change listener': fromCallback(textChangeListener),
  },
  actions: {
    'init keyword': assign({
      keyword: ':',
    }),
    'set keyword anchor': assign({
      keywordAnchor: ({event}) => {
        assertEvent(event, 'colon inserted')

        return {
          point: event.point,
          blockOffset: event.blockOffset,
        }
      },
    }),
    'set keyword focus': assign({
      keywordFocus: ({event}) => {
        assertEvent(event, 'colon inserted')

        return {
          path: event.blockOffset.path,
          offset: event.blockOffset.offset + 1,
        }
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
          value: event.snapshot.context.value,
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
        const rawKeyword = context.keyword.match(
          context.incompleteKeywordRegex,
        )?.[1]

        if (rawKeyword === undefined) {
          return []
        }

        return matchEmojis(rawKeyword)
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
    'insert selected match': ({context}) => {
      const match = context.matches[context.selectedIndex]

      if (!match || !context.keywordAnchor || !context.keywordFocus) {
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
        value: event.snapshot.context.value,
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
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5RgLYHsBWBLABABywGMBrMAJwDosIAbMAYkLRrQDsctXZyAXSAbQAMAXUSg8aWFh5Y2YkAA9EARmUB2AJwUAzADYNADgCs65YO1q1ygDQgAnojUG1O5c+W7tAJmdfdRgF8A21RMXAIScgpuAEMyQgALTih6Tm4yHgo+BR4hUSQQCSkZOQKlBABaZW0DHSMAFksNQUF6oyNzL1sHBC9vCnrGtS8GtQaNNt0gkPRsfCJSSlj4pNYUiDA6PgoAMzQyAHc4iDz5IulZVnlyr3MKE30LA31DZoNuxD6vAaHdP29vOo1NNwLNwgsostEsl6BstmAKAAjGIkI5kE4iM6SC6lUDlerabT3arDfS3eoaPQfXr9QaWEaNcaTEGhOYRRbRMBxaFrWFYWAofmwU4Fc4lK5lFTqWqDAwUjReeoGbwaNTU1TPCh-QxNNS6XQGHwssHzSJLLkrGHcOiEcU4RIxNYCTGi7Hi66IfxE1oeZX1EbeZXUhUUZSKjxOOV6bTmY1hU0cqGrFLWsC2y72hKOmAnZT5cRuy4ehDVXQUVXDIyWGpmAzveyfLRKwQaVRVwR1ixeONsiHm7nJ+gigvFIuSkvKVuhgwaEwKmMKwbqkaCAaverqVuvKbBUHx9mQi08qAUVhoHAoGI8RJwHCwBJoA4w4eFQu4xSfaoDA3KOmCVSTn06r-i4-hGH0ZiEoI4H1D24JmpyA7JNED5PmsF5XjesD0KwMQAG5YFAV5gDgECPqwL5imOeKIIM9ShsoRh1i2erPB41L6C40GqISUb6n8cEJoeSFrChj7JBh14JHAOH4YRxE4AArnglFvhKNEIGoq4+E0yraPULa6PUHGqhQ3HVDUBL8dogkHv2lqife4noZeUkybhBFEXwOA8Ggqmju+5RGPqFBqP6ujDD4v4tjYDYIMqLjVKo5gdM4TGBLurLwYmR7JmJaFQJJWGpFwvB3psaZ8BARUJP5OLqR+CD1Loq5ymYfyeP4spGOqv70fpv7NBSBKtBlMz7n2iEOSeTkFTVMl1e645eB49wGP+K0UpBbjaMBzQUF4IzBYq7TNa2QS7meGzwAUWVCWQWIBQ15RVJq2ijJoLRtB03jUhUVYUHKtz-gqeoxkYGi2ZN1B0I99XFqobTlh4-5-Ot4H1j0ZirbcENhR4RmKrBmUmnZU3HnDS0aVUjHlh2cqtkqfTBdSSr0RMGieBS7htASUMIUmyFnvNsB3qhySU9RjUVBFdN1ltTPvbowZOGZEWHe9xgTHo-M5SJM3iy5mHSTdI7w+OlnlgY6heJzbgUv4ytxaqtSCBFg1eJFM4XQEQA */
  id: 'emoji picker',
  context: ({input}) => ({
    editor: input.editor,
    keyword: '',
    incompleteKeywordRegex: /:([a-zA-Z-_0-9:]*)$/,
    matches: [],
    selectedIndex: 0,
  }),
  initial: 'idle',
  states: {
    idle: {
      entry: ['reset'],
      invoke: {
        src: 'colon listener',
        input: ({context}) => ({editor: context.editor}),
      },
      on: {
        'colon inserted': {
          target: 'searching',
          actions: ['set keyword anchor', 'set keyword focus', 'init keyword'],
        },
      },
    },
    searching: {
      invoke: [
        {
          src: 'emoji insert listener',
          id: 'emoji insert listener',
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
        'insert.text': {
          actions: ['update keyword focus'],
        },
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
              'update emoji insert listener context',
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
                'update emoji insert listener context',
              ],
            },
            'navigate up': {
              actions: [
                'decrement selected index',
                'update emoji insert listener context',
              ],
            },
            'navigate to': {
              actions: [
                'set selected index',
                'update emoji insert listener context',
              ],
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

export function EmojiPickerPlugin() {
  const editor = useEditor()
  const emojiPickerActor = useActorRef(emojiPickerMachine, {input: {editor}})
  const keyword = useSelector(
    emojiPickerActor,
    (snapshot) => snapshot.context.keyword,
  )
  const matches = useSelector(
    emojiPickerActor,
    (snapshot) => snapshot.context.matches,
  )
  const selectedIndex = useSelector(
    emojiPickerActor,
    (snapshot) => snapshot.context.selectedIndex,
  )

  return (
    <EmojiListBox
      keyword={keyword}
      matches={matches}
      selectedIndex={selectedIndex}
      onDismiss={() => {
        emojiPickerActor.send({type: 'dismiss'})
      }}
      onNavigateTo={(index) => {
        emojiPickerActor.send({type: 'navigate to', index})
      }}
      onSelect={() => {
        emojiPickerActor.send({type: 'insert selected match'})
        editor.send({type: 'focus'})
      }}
    />
  )
}

export function EmojiListBox(props: {
  keyword: string
  matches: Array<EmojiMatch>
  selectedIndex: number
  onDismiss: () => void
  onNavigateTo: (index: number) => void
  onSelect: () => void
}) {
  if (props.keyword.length < 2) {
    return null
  }

  return (
    <div className="border border-gray-300 rounded bg-white shadow">
      {props.matches.length === 0 ? (
        <div className="p-2 flex align-middle gap-2">
          No results found{' '}
          <Button size="sm" variant="secondary" onPress={props.onDismiss}>
            Dismiss
          </Button>
        </div>
      ) : (
        <ol className="p-2" style={{maxHeight: 200, overflowY: 'auto'}}>
          {props.matches.map((match, index) => (
            <EmojiListItem
              key={
                match.type === 'exact'
                  ? `${match.emoji}-${match.keyword}`
                  : `${match.emoji}-${match.startSlice}${match.keyword}${match.endSlice}`
              }
              match={match}
              selected={props.selectedIndex === index}
              onMouseEnter={() => {
                props.onNavigateTo(index)
              }}
              onSelect={props.onSelect}
            />
          ))}
        </ol>
      )}
    </div>
  )
}

function EmojiListItem(props: {
  match: EmojiMatch
  selected: boolean
  onMouseEnter: () => void
  onSelect: () => void
}) {
  const ref = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (props.selected && ref.current) {
      ref.current.scrollIntoView({behavior: 'smooth', block: 'nearest'})
    }
  }, [props.selected])

  if (props.match.type === 'exact') {
    return (
      <li
        ref={ref}
        style={{
          background: props.selected ? 'lightblue' : 'unset',
        }}
        onMouseEnter={props.onMouseEnter}
        onClick={props.onSelect}
      >
        <span>{props.match.emoji} :</span>
        <span style={{background: 'yellow'}}>{props.match.keyword}</span>:
      </li>
    )
  }

  return (
    <li
      ref={ref}
      style={{
        background: props.selected ? 'lightblue' : 'unset',
      }}
      onMouseEnter={props.onMouseEnter}
      onClick={props.onSelect}
    >
      <span>{props.match.emoji} :</span>
      {props.match.startSlice}
      <span style={{background: 'yellow'}}>{props.match.keyword}</span>
      {props.match.endSlice}:
    </li>
  )
}
