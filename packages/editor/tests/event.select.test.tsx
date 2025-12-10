import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {
  defineBehavior,
  effect,
  forward,
  raise,
  type BehaviorEvent,
} from '../src/behaviors'
import type {EditorEmittedEvent} from '../src/editor/relay-machine'
import {
  getSelectionAfterText,
  getSelectionBeforeText,
} from '../src/internal-utils/text-selection'
import {BehaviorPlugin, EventListenerPlugin} from '../src/plugins'
import {getFocusTextBlock} from '../src/selectors'
import {createTestEditor} from '../src/test/vitest'
import {getBlockStartPoint} from '../src/utils'

describe('event.select', () => {
  test('Scenario: Arrow navigation causes `select` event', async () => {
    const selectEvents: Array<BehaviorEvent> = []
    const selectionEvents: Array<EditorEmittedEvent> = []
    let resolveInitialSelection: () => void
    const initialSelectionPromise = new Promise<void>((resolve) => {
      resolveInitialSelection = resolve
    })

    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const initialValue = [
      {
        _key: fooBlockKey,
        _type: 'block',
        children: [{_key: fooSpanKey, _type: 'span', text: 'foo'}],
      },
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
      children: (
        <>
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: 'select',
                actions: [
                  ({event}) => [forward(event)],
                  ({event}) => [
                    effect(() => {
                      selectEvents.push(event)

                      if (selectEvents.length === 1) {
                        resolveInitialSelection()
                      }
                    }),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'selection') {
                selectionEvents.push(event)
              }
            }}
          />
        </>
      ),
    })

    await userEvent.click(locator)

    await initialSelectionPromise

    const beforeFooSelection = getSelectionBeforeText(
      {
        schema: editor.getSnapshot().context.schema,
        value: editor.getSnapshot().context.value,
      },
      'foo',
    )
    editor.send({
      type: 'select',
      at: beforeFooSelection,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(beforeFooSelection)
    })

    await userEvent.keyboard('{ArrowRight}')

    const beforeOoSelection = {
      anchor: {
        path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
        offset: 1,
      },
      focus: {
        path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
        offset: 1,
      },
      backward: false,
    }

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(beforeOoSelection)
    })

    await vi.waitFor(() => {
      expect(selectEvents.slice(1)).toEqual([
        {
          type: 'select',
          at: beforeFooSelection,
        },
        {
          type: 'select',
          at: beforeOoSelection,
        },
      ])

      expect(selectionEvents).toEqual([
        // Initial selection
        {
          type: 'selection',
          selection: {
            anchor: {
              path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
              offset: 3,
            },
            focus: {
              path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
              offset: 3,
            },
            backward: false,
          },
        },
        // Before 'foo'
        {
          type: 'selection',
          selection: beforeFooSelection,
        },
        // Before 'oo'
        {
          type: 'selection',
          selection: beforeOoSelection,
        },
      ])
    })
  })

  test('Scenario: No double-`select` event', async () => {
    const selectEvents: Array<BehaviorEvent> = []
    const selectionEvents: Array<EditorEmittedEvent> = []
    let resolveInitialSelection: () => void
    const initialSelectionPromise = new Promise<void>((resolve) => {
      resolveInitialSelection = resolve
    })

    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const initialValue = [
      {
        _key: fooBlockKey,
        _type: 'block',
        children: [{_key: fooSpanKey, _type: 'span', text: 'foo'}],
      },
      {
        _key: barBlockKey,
        _type: 'block',
        children: [{_key: barSpanKey, _type: 'span', text: 'bar'}],
      },
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
      children: (
        <>
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: 'select',
                actions: [
                  ({event}) => [forward(event)],
                  ({event}) => [
                    effect(() => {
                      selectEvents.push(event)

                      if (selectEvents.length === 1) {
                        resolveInitialSelection()
                      }
                    }),
                  ],
                ],
              }),
              defineBehavior({
                on: 'keyboard.keydown',
                guard: ({snapshot, event}) => {
                  if (event.originEvent.key !== 'ArrowUp') {
                    return false
                  }

                  const focusTextBlock = getFocusTextBlock(snapshot)

                  if (!focusTextBlock) {
                    return false
                  }

                  const startPoint = getBlockStartPoint({
                    context: snapshot.context,
                    block: focusTextBlock,
                  })

                  return {startPoint}
                },
                actions: [
                  (_, {startPoint}) => [
                    raise({
                      type: 'select',
                      at: {
                        anchor: startPoint,
                        focus: startPoint,
                        backward: false,
                      },
                    }),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'selection') {
                selectionEvents.push(event)
              }
            }}
          />
        </>
      ),
    })
    await userEvent.click(locator)

    await initialSelectionPromise

    const midBarSelection = {
      anchor: {
        path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
        offset: 2,
      },
      focus: {
        path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
        offset: 2,
      },
      backward: false,
    }

    editor.send({
      type: 'select',
      at: midBarSelection,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(midBarSelection)
    })

    await userEvent.keyboard('{ArrowUp}')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
          offset: 0,
        },
        backward: false,
      })
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    await vi.waitFor(() => {
      const finalSelection = {
        anchor: {
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
          offset: 0,
        },
        backward: false,
      }

      expect(selectEvents.slice(1)).toEqual([
        {
          type: 'select',
          at: midBarSelection,
        },
        {
          type: 'select',
          at: finalSelection,
        },
      ])

      // We don't assert the initial selection since it might vary across
      // browsers
      expect(selectionEvents.slice(1)).toEqual([
        // Mid-bar selection
        {
          type: 'selection',
          selection: midBarSelection,
        },
        // After ArrowUp
        {
          type: 'selection',
          selection: finalSelection,
        },
      ])
    })
  })

  test('Scenario: Typing text does not raise `select` event', async () => {
    const selectEvents: Array<BehaviorEvent> = []
    const selectionEvents: Array<EditorEmittedEvent> = []
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      children: (
        <>
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: 'select',
                actions: [
                  ({event}) => [forward(event)],
                  ({event}) => [
                    effect(() => {
                      selectEvents.push(event)
                    }),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'selection') {
                selectionEvents.push(event)
              }
            }}
          />
        </>
      ),
    })

    const initialSelection = getSelectionBeforeText(
      editor.getSnapshot().context,
      '',
    )

    await userEvent.click(locator)

    await userEvent.type(locator, 'f')

    await vi.waitFor(() => {
      const finalSelection = getSelectionAfterText(
        editor.getSnapshot().context,
        'f',
      )

      expect(editor.getSnapshot().context.selection).toEqual(finalSelection)

      expect(selectEvents).toEqual([
        {
          type: 'select',
          at: initialSelection,
        },
      ])

      expect(selectionEvents).toEqual([
        // Initial selection
        {
          type: 'selection',
          selection: initialSelection,
        },
        // After 'f'
        {
          type: 'selection',
          selection: finalSelection,
        },
      ])
    })
  })

  test('Scenario: `focus` event raises `select` event', async () => {
    const selectEvents: Array<BehaviorEvent> = []
    const selectionEvents: Array<EditorEmittedEvent> = []

    const {editor, locator} = await createTestEditor({
      children: (
        <>
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: 'select',
                actions: [
                  ({event}) => [forward(event)],
                  ({event}) => [
                    effect(() => {
                      selectEvents.push(event)
                    }),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'selection') {
                selectionEvents.push(event)
              }
            }}
          />
        </>
      ),
    })

    await userEvent.click(locator)

    await vi.waitFor(() => {
      const selection = {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        backward: false,
      }

      expect(editor.getSnapshot().context.selection).toEqual(selection)

      expect(selectEvents).toEqual([
        {
          type: 'select',
          at: selection,
        },
      ])

      expect(selectionEvents).toEqual([
        {
          type: 'selection',
          selection,
        },
      ])
    })
  })

  test('Scenario: Overriding arrow navigation by raising `select` event', async () => {
    const selectEvents: Array<BehaviorEvent> = []
    const selectionEvents: Array<EditorEmittedEvent> = []
    const keyGenerator = createTestKeyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      children: (
        <>
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: 'select',
                actions: [
                  ({event}) => [forward(event)],
                  ({event}) => [
                    effect(() => {
                      selectEvents.push(event)
                    }),
                  ],
                ],
              }),
              defineBehavior({
                on: 'keyboard.keydown',
                guard: ({snapshot, event}) => {
                  if (event.originEvent.key !== 'ArrowUp') {
                    return false
                  }

                  const at = getSelectionBeforeText(snapshot.context, 'oo')

                  if (!at) {
                    return false
                  }

                  return {at}
                },
                actions: [
                  (_, {at}) => [
                    raise({
                      type: 'select',
                      at,
                    }),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'selection') {
                selectionEvents.push(event)
              }
            }}
          />
        </>
      ),
    })

    await userEvent.click(locator)
    await userEvent.type(locator, 'foo')
    await userEvent.keyboard('{ArrowUp}')

    await vi.waitFor(() => {
      const selection = getSelectionBeforeText(
        editor.getSnapshot().context,
        'oo',
      )

      expect(selection).not.toBeNull()
      expect(editor.getSnapshot().context.selection).toEqual(selection)

      expect(selectEvents).toEqual([
        {
          type: 'select',
          at: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
            backward: false,
          },
        },
        {
          type: 'select',
          at: selection,
        },
      ])

      expect(selectionEvents).toEqual([
        // Initial selection
        {
          type: 'selection',
          selection: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
            backward: false,
          },
        },
        // After 'f'
        {
          type: 'selection',
          selection: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
            backward: false,
          },
        },
        // After 'fo'
        {
          type: 'selection',
          selection: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
            backward: false,
          },
        },
        // After 'foo'
        {
          type: 'selection',
          selection: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
            backward: false,
          },
        },
        // After ArrowUp
        {
          type: 'selection',
          selection,
        },
      ])
    })
  })

  test('Scenario: Preventing arrow navigation by swallowing the `select` event', async () => {
    const selectEvents: Array<BehaviorEvent> = []
    const selectionEvents: Array<EditorEmittedEvent> = []
    const keyGenerator = createTestKeyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      children: (
        <>
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: 'select',
                actions: [
                  ({event}) => [forward(event)],
                  ({event}) => [
                    effect(() => {
                      selectEvents.push(event)
                    }),
                  ],
                ],
              }),
            ]}
          />
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: 'select',
                guard: ({event}) => {
                  return event.at?.focus.offset === 2
                },
                actions: [],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'selection') {
                selectionEvents.push(event)
              }
            }}
          />
        </>
      ),
    })

    await userEvent.click(locator)
    await userEvent.type(locator, 'foo')
    await userEvent.keyboard('{ArrowLeft}')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
        backward: false,
      })

      expect(selectionEvents).toEqual([
        // Initial selection
        {
          type: 'selection',
          selection: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
            backward: false,
          },
        },
        // After 'f'
        {
          type: 'selection',
          selection: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
            backward: false,
          },
        },
        // After 'fo'
        {
          type: 'selection',
          selection: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
            backward: false,
          },
        },
        // After 'foo'
        {
          type: 'selection',
          selection: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
            backward: false,
          },
        },
      ])

      expect(selectEvents).toEqual([
        {
          type: 'select',
          at: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
            backward: false,
          },
        },
        // Didn't get executed
        {
          type: 'select',
          at: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
            backward: false,
          },
        },
      ])
    })
  })

  test('Scenario: Arrow navigation raises `select` event', async () => {
    const selectEvents: Array<BehaviorEvent> = []
    const selectionEvents: Array<EditorEmittedEvent> = []
    const keyGenerator = createTestKeyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      children: (
        <>
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: 'select',
                actions: [
                  ({event}) => [forward(event)],
                  ({event}) => [
                    effect(() => {
                      selectEvents.push(event)
                    }),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'selection') {
                selectionEvents.push(event)
              }
            }}
          />
        </>
      ),
    })

    await userEvent.click(locator)
    await userEvent.type(locator, 'foo')
    await userEvent.keyboard('{ArrowLeft}')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
        backward: false,
      })

      expect(selectEvents).toEqual([
        {
          type: 'select',
          at: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
            backward: false,
          },
        },
        {
          type: 'select',
          at: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
            backward: false,
          },
        },
      ])

      expect(selectionEvents).toEqual([
        // Initial selection
        {
          type: 'selection',
          selection: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
            backward: false,
          },
        },
        // After 'f'
        {
          type: 'selection',
          selection: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
            backward: false,
          },
        },
        // After 'fo'
        {
          type: 'selection',
          selection: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
            backward: false,
          },
        },
        // After 'foo'
        {
          type: 'selection',
          selection: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
            backward: false,
          },
        },
        // After ArrowLeft
        {
          type: 'selection',
          selection: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
            backward: false,
          },
        },
      ])
    })
  })

  test('Scenario: Synthetic `insert.text` event does not raise `select` event', async () => {
    const selectEvents: Array<BehaviorEvent> = []
    const selectionEvents: Array<EditorEmittedEvent> = []
    const keyGenerator = createTestKeyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      children: (
        <>
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: 'select',
                actions: [
                  ({event}) => [forward(event)],
                  ({event}) => [
                    effect(() => {
                      selectEvents.push(event)
                    }),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'selection') {
                selectionEvents.push(event)
              }
            }}
          />
        </>
      ),
    })

    editor.send({
      type: 'insert.text',
      text: 'foo',
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo'])

      expect(selectEvents).toEqual([
        {
          type: 'select',
          at: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
          },
        },
      ])

      expect(selectionEvents).toEqual([
        // Initial selection
        {
          type: 'selection',
          selection: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
            backward: false,
          },
        },
        // After 'foo'
        {
          type: 'selection',
          selection: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
            backward: false,
          },
        },
      ])
    })
  })
})
