import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {
  defineBehavior,
  effect,
  forward,
  type BehaviorEvent,
} from '../src/behaviors'
import {BehaviorPlugin} from '../src/plugins'
import {createTestEditor} from '../src/test/vitest'
import {
  getSelectionAfterText,
  getSelectionBeforeText,
} from '../test-utils/text-selection'

describe('event.delete', () => {
  describe('backwards selection starting on a block object', () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const fooBlock = {
      _key: fooBlockKey,
      _type: 'block',
      children: [{_key: fooSpanKey, _type: 'span', text: 'foo', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const barBlock = {
      _key: barBlockKey,
      _type: 'block',
      children: [{_key: barSpanKey, _type: 'span', text: 'bar', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const image = {
      _key: imageKey,
      _type: 'image',
    }
    const bazBlock = {
      _key: bazBlockKey,
      _type: 'block',
      children: [{_key: bazSpanKey, _type: 'span', text: 'baz', marks: []}],
      markDefs: [],
      style: 'normal',
    }

    describe('with trailing text block', () => {
      test('Scenario: Deleting the selection leaves the caret in an empty text block', async () => {
        const {locator, editor} = await createTestEditor({
          keyGenerator,
          schemaDefinition: defineSchema({
            blockObjects: [{name: 'image'}],
          }),
          initialValue: [fooBlock, barBlock, image, bazBlock],
        })

        const selection = {
          anchor: {
            path: [{_key: imageKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: fooBlockKey}],
            offset: 0,
          },
          backward: true,
        }

        await userEvent.click(locator)

        editor.send({
          type: 'select',
          at: selection,
        })
        editor.send({
          type: 'delete',
        })

        await vi.waitFor(() => {
          expect(toTextspec(editor.getSnapshot().context)).toEqual(
            ['B: |', 'B: baz'].join('\n'),
          )
          expect(editor.getSnapshot().context.selection).toEqual({
            anchor: {
              path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
              offset: 0,
            },
            focus: {
              path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
              offset: 0,
            },
            backward: false,
          })
        })
      })
    })
  })

  test('Scenario: Deleting collapsed selection with unit block deletes the block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockAKey = keyGenerator()
    const spanAKey = keyGenerator()
    const blockBKey = keyGenerator()
    const spanBKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockAKey,
          children: [
            {_type: 'span', _key: spanAKey, text: 'Block A', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBKey,
          children: [
            {_type: 'span', _key: spanBKey, text: 'Block B', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: blockBKey}, 'children', {_key: spanBKey}],
          offset: 7,
        },
        focus: {
          path: [{_key: blockBKey}, 'children', {_key: spanBKey}],
          offset: 7,
        },
      },
      unit: 'block',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockAKey,
          children: [
            {_type: 'span', _key: spanAKey, text: 'Block A', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Deleting all blocks with unit block leaves a placeholder block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockAKey = keyGenerator()
    const spanAKey = keyGenerator()
    const blockBKey = keyGenerator()
    const spanBKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockAKey,
          children: [
            {_type: 'span', _key: spanAKey, text: 'Block A', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBKey,
          children: [
            {_type: 'span', _key: spanBKey, text: 'Block B', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockBKey}, 'children', {_key: spanBKey}],
          offset: 7,
        },
      },
      unit: 'block',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k6',
          children: [{_type: 'span', _key: 'k7', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Deleting a range spanning two blocks leaves the remainder in a single block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockAKey = keyGenerator()
    const spanAKey = keyGenerator()
    const blockBKey = keyGenerator()
    const spanBKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockAKey,
          children: [
            {_type: 'span', _key: spanAKey, text: 'Block A', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBKey,
          children: [
            {_type: 'span', _key: spanBKey, text: 'Block B', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockBKey}, 'children', {_key: spanBKey}],
          offset: 5,
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockBKey,
          children: [{_type: 'span', _key: spanBKey, text: ' B', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Deleting before selection', async () => {
    const {editor, locator} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo bar baz'}],
        },
      ],
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: getSelectionBeforeText(editor.getSnapshot().context, 'baz'),
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 4,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 8,
        },
      },
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo |baz')
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 4,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 4,
        },
        backward: false,
      })
    })
  })

  test('Scenario: Deleting after selection', async () => {
    const {editor, locator} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo bar baz'}],
        },
      ],
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: getSelectionAfterText(editor.getSnapshot().context, 'foo'),
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 4,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 8,
        },
      },
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo| baz')
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 3,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 3,
        },
        backward: false,
      })
    })
  })

  describe('unit: child', () => {
    describe('text block children', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const fooKey = keyGenerator()
      const stockTickerKey = keyGenerator()
      const barKey = keyGenerator()
      const initialValue = [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: fooKey, text: 'foo'},
            {_type: 'stock-ticker', _key: stockTickerKey},
            {_type: 'span', _key: barKey, text: 'bar'},
          ],
          markDefs: [],
          style: 'normal',
        },
      ]

      test('Scenario: Deleting an inline object selection removes the inline object', async () => {
        const {editor} = await createTestEditor({
          keyGenerator,
          schemaDefinition: defineSchema({
            inlineObjects: [{name: 'stock-ticker'}],
          }),
          initialValue,
        })

        editor.send({
          type: 'delete',
          at: {
            anchor: {
              path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
              offset: 0,
            },
            focus: {
              path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
              offset: 0,
            },
          },
          unit: 'child',
        })

        await vi.waitFor(() => {
          expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foobar')
        })
      })
    })

    test('Scenario: Deleting a partial range with unit child removes the whole span, leaving a placeholder span', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockAKey = keyGenerator()
      const spanAKey = keyGenerator()
      const blockBKey = keyGenerator()
      const spanBKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [
          {
            _type: 'block',
            _key: blockAKey,
            children: [
              {_type: 'span', _key: spanAKey, text: 'Block A', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: blockBKey,
            children: [
              {_type: 'span', _key: spanBKey, text: 'Block B', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      editor.send({
        type: 'delete',
        at: {
          anchor: {
            path: [{_key: blockBKey}, 'children', {_key: spanBKey}],
            offset: 5,
          },
          focus: {
            path: [{_key: blockBKey}, 'children', {_key: spanBKey}],
            offset: 7,
          },
        },
        unit: 'child',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockAKey,
            children: [
              {_type: 'span', _key: spanAKey, text: 'Block A', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: blockBKey,
            children: [{_type: 'span', _key: 'k6', text: '', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
    })
  })

  test('Scenario: Deleting lonely block object', async () => {
    const behaviorEvents: Array<BehaviorEvent> = []
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    // Given a lonely block object
    const initialValue = [
      {
        _type: 'image',
        _key: imageKey,
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      initialValue,
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: '*',
              actions: [
                ({event}) => [
                  effect(() => {
                    behaviorEvents.push(event)
                  }),
                  forward(event),
                ],
              ],
            }),
          ]}
        />
      ),
    })

    // When the object is deleted
    editor.send({
      type: 'delete',
      at: {
        anchor: {path: [{_key: imageKey}], offset: 0},
        focus: {path: [{_key: imageKey}], offset: 0},
      },
    })

    await vi.waitFor(() => {
      // Then a placeholder block is silently inserted
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: |')
      expect(behaviorEvents).toEqual([
        {
          type: 'delete',
          at: {
            anchor: {path: [{_key: imageKey}], offset: 0},
            focus: {path: [{_key: imageKey}], offset: 0},
          },
        },
      ])
    })
  })
})
