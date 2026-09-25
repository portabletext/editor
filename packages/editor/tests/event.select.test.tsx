import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {
  defineBehavior,
  effect,
  forward,
  raise,
  type BehaviorEvent,
} from '../src/behaviors'
import type {EditorEmittedEvent} from '../src/editor/relay'
import {BehaviorPlugin, EventListenerPlugin} from '../src/plugins'
import {getFocusTextBlock} from '../src/selectors'
import {createTestEditor} from '../src/test/vitest'
import {getBlockStartPoint, isEqualSelectionPoints} from '../src/utils'
import {
  getSelectionAfterText,
  getSelectionBeforeText,
} from '../test-utils/text-selection'

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
      editor.getSnapshot().context,
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo|')

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

  test('Scenario: Selecting backward across blocks reports `backward: true`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockAKey = keyGenerator()
    const spanAKey = keyGenerator()
    const blockBKey = keyGenerator()
    const spanBKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _key: blockAKey,
          _type: 'block',
          children: [
            {
              _key: spanAKey,
              _type: 'span',
              marks: [],
              text: "It's a beautiful day on planet earth",
            },
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: blockBKey,
          _type: 'block',
          children: [
            {
              _key: spanBKey,
              _type: 'span',
              marks: [],
              text: 'The birds are singing',
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({type: 'focus'})
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockBKey}, 'children', {_key: spanBKey}],
          offset: 9,
        },
        focus: {
          path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
          offset: 7,
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockBKey}, 'children', {_key: spanBKey}],
          offset: 9,
        },
        focus: {
          path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
          offset: 7,
        },
        backward: true,
      })
    })
  })

  describe('Shift+ArrowLeft/Right', () => {
    test('Scenario: Extending forward and back across empty blocks moves the focus one block per press', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockA = keyGenerator()
      const spanA = keyGenerator()
      const blockB = keyGenerator()
      const spanB = keyGenerator()
      const blockC = keyGenerator()
      const spanC = keyGenerator()

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        initialValue: [
          emptyBlock(blockA, spanA),
          emptyBlock(blockB, spanB),
          emptyBlock(blockC, spanC),
        ],
      })

      await userEvent.click(locator)
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: blockA}, 'children', {_key: spanA}],
            offset: 0,
          },
          focus: {path: [{_key: blockA}, 'children', {_key: spanA}], offset: 0},
        },
      })
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockA}, 'children', {_key: spanA}],
            offset: 0,
          },
          focus: {path: [{_key: blockA}, 'children', {_key: spanA}], offset: 0},
          backward: false,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockA}, 'children', {_key: spanA}],
            offset: 0,
          },
          focus: {path: [{_key: blockB}, 'children', {_key: spanB}], offset: 0},
          backward: false,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockA}, 'children', {_key: spanA}],
            offset: 0,
          },
          focus: {path: [{_key: blockC}, 'children', {_key: spanC}], offset: 0},
          backward: false,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockA}, 'children', {_key: spanA}],
            offset: 0,
          },
          focus: {path: [{_key: blockB}, 'children', {_key: spanB}], offset: 0},
          backward: false,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockA}, 'children', {_key: spanA}],
            offset: 0,
          },
          focus: {path: [{_key: blockA}, 'children', {_key: spanA}], offset: 0},
          backward: false,
        })
      })
    })

    test('Scenario: Extending backward and forward across empty blocks moves the focus one block per press', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockA = keyGenerator()
      const spanA = keyGenerator()
      const blockB = keyGenerator()
      const spanB = keyGenerator()
      const blockC = keyGenerator()
      const spanC = keyGenerator()

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        initialValue: [
          emptyBlock(blockA, spanA),
          emptyBlock(blockB, spanB),
          emptyBlock(blockC, spanC),
        ],
      })

      await userEvent.click(locator)
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: blockC}, 'children', {_key: spanC}],
            offset: 0,
          },
          focus: {path: [{_key: blockC}, 'children', {_key: spanC}], offset: 0},
        },
      })
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockC}, 'children', {_key: spanC}],
            offset: 0,
          },
          focus: {path: [{_key: blockC}, 'children', {_key: spanC}], offset: 0},
          backward: false,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockC}, 'children', {_key: spanC}],
            offset: 0,
          },
          focus: {path: [{_key: blockB}, 'children', {_key: spanB}], offset: 0},
          backward: true,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockC}, 'children', {_key: spanC}],
            offset: 0,
          },
          focus: {path: [{_key: blockA}, 'children', {_key: spanA}], offset: 0},
          backward: true,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockC}, 'children', {_key: spanC}],
            offset: 0,
          },
          focus: {path: [{_key: blockB}, 'children', {_key: spanB}], offset: 0},
          backward: true,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockC}, 'children', {_key: spanC}],
            offset: 0,
          },
          focus: {path: [{_key: blockC}, 'children', {_key: spanC}], offset: 0},
          backward: false,
        })
      })
    })

    test('Scenario: Extending inside text moves the focus one character per press', async () => {
      const keyGenerator = createTestKeyGenerator()
      const block = keyGenerator()
      const span = keyGenerator()

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        initialValue: [textBlock(block, span, 'foo')],
      })

      await userEvent.click(locator)
      editor.send({
        type: 'select',
        at: {
          anchor: {path: [{_key: block}, 'children', {_key: span}], offset: 1},
          focus: {path: [{_key: block}, 'children', {_key: span}], offset: 1},
        },
      })
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: [{_key: block}, 'children', {_key: span}], offset: 1},
          focus: {path: [{_key: block}, 'children', {_key: span}], offset: 1},
          backward: false,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: [{_key: block}, 'children', {_key: span}], offset: 1},
          focus: {path: [{_key: block}, 'children', {_key: span}], offset: 2},
          backward: false,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: [{_key: block}, 'children', {_key: span}], offset: 1},
          focus: {path: [{_key: block}, 'children', {_key: span}], offset: 1},
          backward: false,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: [{_key: block}, 'children', {_key: span}], offset: 1},
          focus: {path: [{_key: block}, 'children', {_key: span}], offset: 0},
          backward: true,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: [{_key: block}, 'children', {_key: span}], offset: 1},
          focus: {path: [{_key: block}, 'children', {_key: span}], offset: 1},
          backward: false,
        })
      })
    })

    test('Scenario: Extending over a multi-code-point grapheme moves the focus past it in one press', async () => {
      const keyGenerator = createTestKeyGenerator()
      const block = keyGenerator()
      const span = keyGenerator()

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        initialValue: [textBlock(block, span, 'foo👨‍👩‍👧bar')],
      })

      await userEvent.click(locator)
      editor.send({
        type: 'select',
        at: {
          anchor: {path: [{_key: block}, 'children', {_key: span}], offset: 3},
          focus: {path: [{_key: block}, 'children', {_key: span}], offset: 3},
        },
      })
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: [{_key: block}, 'children', {_key: span}], offset: 3},
          focus: {path: [{_key: block}, 'children', {_key: span}], offset: 3},
          backward: false,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: [{_key: block}, 'children', {_key: span}], offset: 3},
          focus: {path: [{_key: block}, 'children', {_key: span}], offset: 11},
          backward: false,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: [{_key: block}, 'children', {_key: span}], offset: 3},
          focus: {path: [{_key: block}, 'children', {_key: span}], offset: 3},
          backward: false,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: [{_key: block}, 'children', {_key: span}], offset: 3},
          focus: {path: [{_key: block}, 'children', {_key: span}], offset: 2},
          backward: true,
        })
      })
    })

    test('Scenario: Extending forward over an inline object stops on the inline object first', async () => {
      const keyGenerator = createTestKeyGenerator()
      const block = keyGenerator()
      const fooSpan = keyGenerator()
      const stockTicker = keyGenerator()
      const barSpan = keyGenerator()

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        initialValue: [
          {
            _key: block,
            _type: 'block',
            children: [
              {_key: fooSpan, _type: 'span', marks: [], text: 'foo'},
              {_key: stockTicker, _type: 'stock-ticker'},
              {_key: barSpan, _type: 'span', marks: [], text: 'bar'},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        schemaDefinition: defineSchema({
          inlineObjects: [{name: 'stock-ticker'}],
        }),
      })

      await userEvent.click(locator)
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: block}, 'children', {_key: fooSpan}],
            offset: 3,
          },
          focus: {
            path: [{_key: block}, 'children', {_key: fooSpan}],
            offset: 3,
          },
        },
      })
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: block}, 'children', {_key: fooSpan}],
            offset: 3,
          },
          focus: {
            path: [{_key: block}, 'children', {_key: fooSpan}],
            offset: 3,
          },
          backward: false,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: block}, 'children', {_key: fooSpan}],
            offset: 3,
          },
          focus: {
            path: [{_key: block}, 'children', {_key: stockTicker}],
            offset: 0,
          },
          backward: false,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: block}, 'children', {_key: fooSpan}],
            offset: 3,
          },
          focus: {
            path: [{_key: block}, 'children', {_key: barSpan}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Extending forward from a block object moves the focus to the next block start', async () => {
      const keyGenerator = createTestKeyGenerator()
      const image = keyGenerator()
      const block = keyGenerator()
      const span = keyGenerator()

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        initialValue: [
          {_key: image, _type: 'image'},
          textBlock(block, span, 'foo'),
        ],
        schemaDefinition: defineSchema({
          blockObjects: [{name: 'image'}],
        }),
      })

      await userEvent.click(locator)
      editor.send({
        type: 'select',
        at: {
          anchor: {path: [{_key: image}], offset: 0},
          focus: {path: [{_key: image}], offset: 0},
        },
      })
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: [{_key: image}], offset: 0},
          focus: {path: [{_key: image}], offset: 0},
          backward: false,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: [{_key: image}], offset: 0},
          focus: {path: [{_key: block}, 'children', {_key: span}], offset: 0},
          backward: false,
        })
      })
    })

    test('Scenario: Extending backward at the document start leaves the selection unchanged', async () => {
      const events: Array<EditorEmittedEvent> = []
      const keyGenerator = createTestKeyGenerator()
      const blockA = keyGenerator()
      const spanA = keyGenerator()
      const blockB = keyGenerator()
      const spanB = keyGenerator()

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        initialValue: [emptyBlock(blockA, spanA), emptyBlock(blockB, spanB)],
        children: (
          <EventListenerPlugin
            on={(event) => {
              events.push(event)
            }}
          />
        ),
      })

      await userEvent.click(locator)
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: blockA}, 'children', {_key: spanA}],
            offset: 0,
          },
          focus: {path: [{_key: blockA}, 'children', {_key: spanA}], offset: 0},
        },
      })
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockA}, 'children', {_key: spanA}],
            offset: 0,
          },
          focus: {path: [{_key: blockA}, 'children', {_key: spanA}], offset: 0},
          backward: false,
        })
      })

      const eventsBeforeBoundaryPress = events.length
      const arrowKeydowns: Array<{key: string; defaultPrevented: boolean}> = []

      function recordArrowKeydown(event: KeyboardEvent) {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          arrowKeydowns.push({
            key: event.key,
            defaultPrevented: event.defaultPrevented,
          })
        }
      }

      document.addEventListener('keydown', recordArrowKeydown)

      await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}')
      await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')

      document.removeEventListener('keydown', recordArrowKeydown)

      expect(arrowKeydowns).toEqual([
        {key: 'ArrowLeft', defaultPrevented: true},
        {key: 'ArrowRight', defaultPrevented: true},
      ])

      await vi.waitFor(() => {
        expect(events.slice(eventsBeforeBoundaryPress)).toEqual([
          {
            type: 'selection',
            selection: {
              anchor: {
                path: [{_key: blockA}, 'children', {_key: spanA}],
                offset: 0,
              },
              focus: {
                path: [{_key: blockB}, 'children', {_key: spanB}],
                offset: 0,
              },
              backward: false,
            },
          },
        ])
      })
    })

    test('Scenario: Extending forward at the document end leaves the selection unchanged', async () => {
      const events: Array<EditorEmittedEvent> = []
      const keyGenerator = createTestKeyGenerator()
      const blockA = keyGenerator()
      const spanA = keyGenerator()
      const blockB = keyGenerator()
      const spanB = keyGenerator()

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        initialValue: [emptyBlock(blockA, spanA), emptyBlock(blockB, spanB)],
        children: (
          <EventListenerPlugin
            on={(event) => {
              events.push(event)
            }}
          />
        ),
      })

      await userEvent.click(locator)
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: blockB}, 'children', {_key: spanB}],
            offset: 0,
          },
          focus: {path: [{_key: blockB}, 'children', {_key: spanB}], offset: 0},
        },
      })
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockB}, 'children', {_key: spanB}],
            offset: 0,
          },
          focus: {path: [{_key: blockB}, 'children', {_key: spanB}], offset: 0},
          backward: false,
        })
      })

      const eventsBeforeBoundaryPress = events.length
      const arrowKeydowns: Array<{key: string; defaultPrevented: boolean}> = []

      function recordArrowKeydown(event: KeyboardEvent) {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          arrowKeydowns.push({
            key: event.key,
            defaultPrevented: event.defaultPrevented,
          })
        }
      }

      document.addEventListener('keydown', recordArrowKeydown)

      await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
      await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}')

      document.removeEventListener('keydown', recordArrowKeydown)

      expect(arrowKeydowns).toEqual([
        {key: 'ArrowRight', defaultPrevented: true},
        {key: 'ArrowLeft', defaultPrevented: true},
      ])

      await vi.waitFor(() => {
        expect(events.slice(eventsBeforeBoundaryPress)).toEqual([
          {
            type: 'selection',
            selection: {
              anchor: {
                path: [{_key: blockB}, 'children', {_key: spanB}],
                offset: 0,
              },
              focus: {
                path: [{_key: blockA}, 'children', {_key: spanA}],
                offset: 0,
              },
              backward: true,
            },
          },
        ])
      })
    })

    test('Scenario: A `select` Behavior can redirect the extended focus', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockA = keyGenerator()
      const spanA = keyGenerator()
      const blockB = keyGenerator()
      const spanB = keyGenerator()
      const blockC = keyGenerator()
      const spanC = keyGenerator()

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        initialValue: [
          emptyBlock(blockA, spanA),
          emptyBlock(blockB, spanB),
          emptyBlock(blockC, spanC),
        ],
        children: (
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: 'select',
                guard: ({snapshot, event}) => {
                  if (
                    snapshot.context.selection &&
                    isEqualSelectionPoints(snapshot.context.selection.anchor, {
                      path: [{_key: blockC}, 'children', {_key: spanC}],
                      offset: 0,
                    }) &&
                    isEqualSelectionPoints(snapshot.context.selection.focus, {
                      path: [{_key: blockB}, 'children', {_key: spanB}],
                      offset: 0,
                    }) &&
                    event.at &&
                    isEqualSelectionPoints(event.at.anchor, {
                      path: [{_key: blockC}, 'children', {_key: spanC}],
                      offset: 0,
                    }) &&
                    isEqualSelectionPoints(event.at.focus, {
                      path: [{_key: blockC}, 'children', {_key: spanC}],
                      offset: 0,
                    })
                  ) {
                    return {anchor: event.at.anchor}
                  }

                  return false
                },
                actions: [
                  (_, {anchor}) => [
                    raise({
                      type: 'select',
                      at: {
                        anchor,
                        focus: {
                          path: [{_key: blockA}, 'children', {_key: spanA}],
                          offset: 0,
                        },
                      },
                    }),
                  ],
                ],
              }),
            ]}
          />
        ),
      })

      await userEvent.click(locator)
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: blockC}, 'children', {_key: spanC}],
            offset: 0,
          },
          focus: {path: [{_key: blockC}, 'children', {_key: spanC}], offset: 0},
        },
      })
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockC}, 'children', {_key: spanC}],
            offset: 0,
          },
          focus: {path: [{_key: blockC}, 'children', {_key: spanC}], offset: 0},
          backward: false,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockC}, 'children', {_key: spanC}],
            offset: 0,
          },
          focus: {path: [{_key: blockB}, 'children', {_key: spanB}], offset: 0},
          backward: true,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockC}, 'children', {_key: spanC}],
            offset: 0,
          },
          focus: {path: [{_key: blockA}, 'children', {_key: spanA}], offset: 0},
          backward: true,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockC}, 'children', {_key: spanC}],
            offset: 0,
          },
          focus: {path: [{_key: blockB}, 'children', {_key: spanB}], offset: 0},
          backward: true,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockC}, 'children', {_key: spanC}],
            offset: 0,
          },
          focus: {path: [{_key: blockA}, 'children', {_key: spanA}], offset: 0},
          backward: true,
        })
      })
    })

    test('Scenario: Shift+Arrow with Alt, Ctrl, or Meta is left to the browser', async () => {
      const keyGenerator = createTestKeyGenerator()
      const block = keyGenerator()
      const span = keyGenerator()

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        initialValue: [textBlock(block, span, 'foo bar baz')],
      })

      await userEvent.click(locator)
      editor.send({
        type: 'select',
        at: {
          anchor: {path: [{_key: block}, 'children', {_key: span}], offset: 5},
          focus: {path: [{_key: block}, 'children', {_key: span}], offset: 5},
        },
      })
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: [{_key: block}, 'children', {_key: span}], offset: 5},
          focus: {path: [{_key: block}, 'children', {_key: span}], offset: 5},
          backward: false,
        })
      })

      const arrowKeydowns: Array<{
        key: string
        altKey: boolean
        ctrlKey: boolean
        metaKey: boolean
        defaultPrevented: boolean
      }> = []

      function recordArrowKeydown(event: KeyboardEvent) {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          arrowKeydowns.push({
            key: event.key,
            altKey: event.altKey,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            defaultPrevented: event.defaultPrevented,
          })
        }
      }

      document.addEventListener('keydown', recordArrowKeydown)

      await userEvent.keyboard('{Shift>}{Alt>}{ArrowLeft}{/Alt}{/Shift}')
      await userEvent.keyboard('{Shift>}{Alt>}{ArrowRight}{/Alt}{/Shift}')
      await userEvent.keyboard(
        '{Shift>}{Control>}{ArrowLeft}{/Control}{/Shift}',
      )
      await userEvent.keyboard(
        '{Shift>}{Control>}{ArrowRight}{/Control}{/Shift}',
      )
      await userEvent.keyboard('{Shift>}{Meta>}{ArrowLeft}{/Meta}{/Shift}')
      await userEvent.keyboard('{Shift>}{Meta>}{ArrowRight}{/Meta}{/Shift}')
      await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}')

      document.removeEventListener('keydown', recordArrowKeydown)

      expect(arrowKeydowns).toEqual([
        {
          key: 'ArrowLeft',
          altKey: true,
          ctrlKey: false,
          metaKey: false,
          defaultPrevented: false,
        },
        {
          key: 'ArrowRight',
          altKey: true,
          ctrlKey: false,
          metaKey: false,
          defaultPrevented: false,
        },
        {
          key: 'ArrowLeft',
          altKey: false,
          ctrlKey: true,
          metaKey: false,
          defaultPrevented: false,
        },
        {
          key: 'ArrowRight',
          altKey: false,
          ctrlKey: true,
          metaKey: false,
          defaultPrevented: false,
        },
        {
          key: 'ArrowLeft',
          altKey: false,
          ctrlKey: false,
          metaKey: true,
          defaultPrevented: false,
        },
        {
          key: 'ArrowRight',
          altKey: false,
          ctrlKey: false,
          metaKey: true,
          defaultPrevented: false,
        },
        {
          key: 'ArrowLeft',
          altKey: false,
          ctrlKey: false,
          metaKey: false,
          defaultPrevented: true,
        },
      ])
    })

    test('Scenario: Shift+ArrowLeft in right-to-left text moves the focus forward', async () => {
      const keyGenerator = createTestKeyGenerator()
      const block = keyGenerator()
      const span = keyGenerator()

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        initialValue: [textBlock(block, span, 'שלום')],
      })

      await userEvent.click(locator)
      editor.send({
        type: 'select',
        at: {
          anchor: {path: [{_key: block}, 'children', {_key: span}], offset: 1},
          focus: {path: [{_key: block}, 'children', {_key: span}], offset: 1},
        },
      })
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: [{_key: block}, 'children', {_key: span}], offset: 1},
          focus: {path: [{_key: block}, 'children', {_key: span}], offset: 1},
          backward: false,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: [{_key: block}, 'children', {_key: span}], offset: 1},
          focus: {path: [{_key: block}, 'children', {_key: span}], offset: 2},
          backward: false,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: [{_key: block}, 'children', {_key: span}], offset: 1},
          focus: {path: [{_key: block}, 'children', {_key: span}], offset: 1},
          backward: false,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: [{_key: block}, 'children', {_key: span}], offset: 1},
          focus: {path: [{_key: block}, 'children', {_key: span}], offset: 0},
          backward: true,
        })
      })
    })
  })
})

function emptyBlock(blockKey: string, spanKey: string) {
  return textBlock(blockKey, spanKey, '')
}

function textBlock(blockKey: string, spanKey: string, text: string) {
  return {
    _key: blockKey,
    _type: 'block',
    children: [{_key: spanKey, _type: 'span', marks: [], text}],
    markDefs: [],
    style: 'normal',
  }
}
