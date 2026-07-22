import {
  applyAll,
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {effect, forward} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import type {BehaviorEvent} from '../src/behaviors/behavior.types.event'
import {EventListenerPlugin} from '../src/plugins'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {createTestEditor} from '../src/test/vitest'
import {getSelectionAfterText} from '../test-utils/text-selection'

describe('event.delete.forward', () => {
  test('Scenario: Deleting lonely block object', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    let foreignValue = [
      {
        _type: 'image',
        _key: imageKey,
      },
    ]
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: foreignValue,
      schemaDefinition: defineSchema({
        block: {fields: [{name: 'foo', type: 'string'}]},
        blockObjects: [{name: 'image'}],
      }),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
              foreignValue = applyAll(foreignValue, [patch])
            }
          }}
        />
      ),
    })

    await userEvent.click(locator)
    await userEvent.keyboard('{Delete}')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k3',
          children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(foreignValue).toEqual([])

      expect(patches).toEqual([unset([{_key: imageKey}])])
    })

    editor.send({
      type: 'block.set',
      at: [{_key: 'k3'}],
      props: {
        foo: 'bar',
      },
    })

    await vi.waitFor(() => {
      const expectedValue = [
        {
          _type: 'block',
          _key: 'k3',
          children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
          foo: 'bar',
        },
      ]

      expect(editor.getSnapshot().context.value).toEqual(expectedValue)
      expect(foreignValue).toEqual(expectedValue)
      expect(patches.slice(1)).toEqual([
        setIfMissing([], []),
        insert(
          [
            {
              _type: 'block',
              _key: 'k3',
              children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          'before',
          [0],
        ),
        set('bar', [{_key: 'k3'}, 'foo']),
      ])
    })
  })

  test('Scenario: Merging two text blocks', async () => {
    const keyGenerator = createTestKeyGenerator()
    const block1Key = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const block2Key = keyGenerator()
    const bazSpanKey = keyGenerator()
    const linkKey = keyGenerator()

    const behaviorEvents: Array<BehaviorEvent> = []

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
      initialValue: [
        {
          _key: block1Key,
          _type: 'block',
          children: [{_key: fooSpanKey, _type: 'span', text: 'foo'}],
        },
        {
          _key: block2Key,
          _type: 'block',
          children: [
            {_key: barSpanKey, _type: 'span', text: 'bar', marks: ['strong']},
            {_key: bazSpanKey, _type: 'span', text: 'baz', marks: [linkKey]},
          ],
          markDefs: [
            {
              _type: 'link',
              _key: linkKey,
              href: 'https://example.com',
            },
          ],
        },
      ],
      children: (
        <>
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
        </>
      ),
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: getSelectionAfterText(editor.getSnapshot().context, 'foo'),
    })

    await userEvent.keyboard('{Delete}')

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: block1Key,
          _type: 'block',
          children: [
            {_key: fooSpanKey, _type: 'span', text: 'foo', marks: []},
            {_key: barSpanKey, _type: 'span', text: 'bar', marks: ['strong']},
            {_key: bazSpanKey, _type: 'span', text: 'baz', marks: [linkKey]},
          ],
          style: 'normal',
          markDefs: [
            {
              _type: 'link',
              _key: linkKey,
              href: 'https://example.com',
            },
          ],
        },
      ])
    })

    await vi.waitFor(() => {
      expect(
        behaviorEvents.some(
          (behaviorEvent) => behaviorEvent.type === 'delete.block',
        ),
      ).toBe(true)
      expect(
        behaviorEvents.some(
          (behaviorEvent) => behaviorEvent.type === 'insert.block',
        ),
      ).toBe(true)
    })
  })

  describe('expanded selection covering empty blocks', () => {
    // Field report: pressing Enter a few times creates empty lines, the
    // user highlights them and presses Delete, and the lines remain. Pins
    // the collapsed-selection requirement on the forward-delete
    // empty-block hop in `behavior.abstract.delete.ts`: without it, the
    // hop intercepts an expanded selection ending at an empty block and
    // replaces the range-delete with a single block hop.
    function block(key: string, text: string) {
      return {
        _type: 'block',
        _key: key,
        children: [{_type: 'span', _key: `${key}-s`, text, marks: []}],
        markDefs: [],
        style: 'normal',
      }
    }

    test('Scenario: gesture-deleting a selection that covers empty blocks', async () => {
      const {editor, locator} = await createTestEditor({
        keyGenerator: createTestKeyGenerator(),
        initialValue: [
          block('b1', 'before'),
          block('e1', ''),
          block('e2', ''),
          block('e3', ''),
          block('b2', 'after'),
        ],
      })

      await userEvent.click(locator)
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 'b1-s'}],
            offset: 6,
          },
          focus: {path: [{_key: 'b1'}, 'children', {_key: 'b1-s'}], offset: 6},
        },
      })
      await userEvent.keyboard(
        '{Shift>}{ArrowDown}{ArrowDown}{ArrowDown}{/Shift}',
      )

      // The keyboard selection reaches the last empty line before Delete.
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection?.focus.path).toEqual([
          {_key: 'e3'},
          'children',
          {_key: 'e3-s'},
        ])
      })
      await userEvent.keyboard('{Delete}')

      // Deleting the range from the end of "before" to the start of the
      // last empty line merges the endpoints: every covered empty block is
      // gone.
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          block('b1', 'before'),
          block('b2', 'after'),
        ])
      })
    })

    test("Scenario: synthetic `delete` with `direction: 'forward'` over the same range", async () => {
      // The editable's expanded-selection branch sends exactly this event
      // for the Delete key. Before the fix, the forward empty-block hop
      // behavior matched on the focus block alone and replaced the
      // range-delete.
      const {editor} = await createTestEditor({
        keyGenerator: createTestKeyGenerator(),
        initialValue: [
          block('b1', 'before'),
          block('e1', ''),
          block('e2', ''),
          block('e3', ''),
          block('b2', 'after'),
        ],
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 'b1-s'}],
            offset: 6,
          },
          focus: {path: [{_key: 'e3'}, 'children', {_key: 'e3-s'}], offset: 0},
        },
      })
      editor.send({type: 'delete', direction: 'forward'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          block('b1', 'before'),
          block('b2', 'after'),
        ])
      })
    })

    test('Scenario: the same gesture over non-empty lines deletes the range', async () => {
      const {editor, locator} = await createTestEditor({
        keyGenerator: createTestKeyGenerator(),
        initialValue: [
          block('b1', 'before'),
          block('t1', 'one'),
          block('t2', 'two'),
          block('t3', 'three'),
          block('b2', 'after'),
        ],
      })

      await userEvent.click(locator)
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 'b1-s'}],
            offset: 6,
          },
          focus: {path: [{_key: 'b1'}, 'children', {_key: 'b1-s'}], offset: 6},
        },
      })
      await userEvent.keyboard(
        '{Shift>}{ArrowDown}{ArrowDown}{ArrowDown}{/Shift}',
      )

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection?.focus.path).toEqual([
          {_key: 't3'},
          'children',
          {_key: 't3-s'},
        ])
      })
      await userEvent.keyboard('{Delete}')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          block('b1', 'before'),
          block('b2', 'after'),
        ])
      })
    })
  })
})
