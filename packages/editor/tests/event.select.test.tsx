import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {
  defineBehavior,
  effect,
  forward,
  raise,
  type BehaviorEvent,
} from '../src/behaviors'
import {getSelectionBeforeText} from '../src/internal-utils/text-selection'
import {BehaviorPlugin} from '../src/plugins'
import {getFocusTextBlock} from '../src/selectors'
import {createTestEditor} from '../src/test/vitest'
import {getBlockStartPoint} from '../src/utils/_exports'

describe('event.select', () => {
  test('Scenario: Arrow navigation causes `select` event', async () => {
    const selectEvents: Array<BehaviorEvent> = []
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
    })
  })

  test('Scenario: No double-`select` event', async () => {
    const selectEvents: Array<BehaviorEvent> = []
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
      expect(selectEvents.slice(1)).toEqual([
        {
          type: 'select',
          at: midBarSelection,
        },
        {
          type: 'select',
          at: {
            anchor: {
              path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
              offset: 0,
            },
            focus: {
              path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
              offset: 0,
            },
          },
        },
      ])
    })
  })
})
