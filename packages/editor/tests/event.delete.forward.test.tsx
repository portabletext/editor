import {
  applyAll,
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {server, userEvent} from 'vitest/browser'
import {defineInlineObject} from '../src'
import {effect, forward} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import type {BehaviorEvent} from '../src/behaviors/behavior.types.event'
import {EventListenerPlugin, NodePlugin} from '../src/plugins'
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
      expect(foreignValue).toEqual(undefined)

      expect(patches).toEqual([unset([{_key: imageKey}]), unset([])])
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
      expect(patches.slice(2)).toEqual([
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

  test('Scenario: forward-deleting an Indic conjunct cluster', async () => {
    // GB9c treats KA VIRAMA TA (\u0915\u094d\u0924) as a single grapheme
    // cluster, so one forward delete at the cluster's start removes all
    // three code points instead of stopping after KA VIRAMA.
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const conjunct = '\u0915\u094d\u0924'

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: `a${conjunct}b`}],
        },
      ],
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 1,
        },
      },
    })

    await userEvent.keyboard('{Delete}')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'ab', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
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
  describe('Deleting line', () => {
    test('Scenario: Deleting a line forward from a selection removes the text after the caret', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'foo bar baz'}],
          },
        ],
      })

      await userEvent.click(locator)

      const selection = getSelectionAfterText(
        editor.getSnapshot().context,
        'foo bar',
      )

      editor.send({
        type: 'select',
        at: selection,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual(selection)
      })

      editor.send({
        type: 'delete',
        direction: 'forward',
        unit: 'line',
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo bar|')
      })
    })

    test('Scenario: Deleting a line forward at `at` removes the text after it', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'foo bar baz'}],
          },
        ],
      })

      editor.send({
        type: 'delete',
        direction: 'forward',
        unit: 'line',
        at: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 7,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 7,
          },
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo bar')
      })
    })

    test('Scenario: Deleting a line forward in a wrapped block removes the text up to the end of the visual line', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'foobarbaz'}],
          },
        ],
        editableProps: {
          style: {
            width: '4ch',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          },
        },
      })

      editor.send({
        type: 'delete',
        direction: 'forward',
        unit: 'line',
        at: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 5,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 5,
          },
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foobaz')
      })
    })

    test('Scenario: Deleting a line forward at a soft wrap removes the text on the line after the wrap', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'foobarbaz'}],
          },
        ],
        editableProps: {
          style: {
            width: '4ch',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          },
        },
      })

      editor.send({
        type: 'delete',
        direction: 'forward',
        unit: 'line',
        at: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 4,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 4,
          },
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foobz')
      })
    })

    test('Scenario: Deleting a line forward over an expanded selection removes the selection', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'foo bar baz'}],
          },
        ],
      })

      editor.send({
        type: 'delete',
        direction: 'forward',
        unit: 'line',
        at: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 4,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 7,
          },
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo  baz')
      })
    })

    test('Scenario: Deleting a line forward before an explicit newline removes the text up to the newline', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'foo\nbar'}],
          },
        ],
      })

      editor.send({
        type: 'delete',
        direction: 'forward',
        unit: 'line',
        at: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 1,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 1,
          },
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: f\nbar')
      })
    })

    test('Scenario: Deleting a line forward directly before an explicit newline removes the newline', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey, _type: 'span', text: 'foo\nbar'}],
          },
        ],
      })

      editor.send({
        type: 'delete',
        direction: 'forward',
        unit: 'line',
        at: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 3,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 3,
          },
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foobar')
      })
    })

    test('Scenario: Deleting a line forward at the end of a span before a soft wrap removes the next span up to the end of the visual line', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const fooKey = keyGenerator()
      const barKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: fooKey, _type: 'span', text: 'foob', marks: ['strong']},
              {_key: barKey, _type: 'span', text: 'arbaz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        editableProps: {
          style: {
            width: '4ch',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          },
        },
      })

      editor.send({
        type: 'delete',
        direction: 'forward',
        unit: 'line',
        at: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: fooKey}],
            offset: 4,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: fooKey}],
            offset: 4,
          },
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: [strong:foob]z',
        )
      })
    })

    test('Scenario: Deleting a line forward at the start of a span after a soft wrap removes the span up to the end of the visual line', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const fooKey = keyGenerator()
      const barKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: fooKey, _type: 'span', text: 'foob', marks: ['strong']},
              {_key: barKey, _type: 'span', text: 'arbaz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        editableProps: {
          style: {
            width: '4ch',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          },
        },
      })

      editor.send({
        type: 'delete',
        direction: 'forward',
        unit: 'line',
        at: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: barKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: barKey}],
            offset: 0,
          },
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: [strong:foob]z',
        )
      })
    })

    test('Scenario: Deleting a line forward across an inline object removes the text and the inline object up to the end of the line', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const fooKey = keyGenerator()
      const stockTickerKey = keyGenerator()
      const barKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          inlineObjects: [{name: 'stock-ticker'}],
        }),
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: fooKey, _type: 'span', text: 'foo', marks: []},
              {_key: stockTickerKey, _type: 'stock-ticker'},
              {_key: barKey, _type: 'span', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      editor.send({
        type: 'delete',
        direction: 'forward',
        unit: 'line',
        at: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: fooKey}],
            offset: 1,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: fooKey}],
            offset: 1,
          },
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: f')
      })
    })
    // Known limitation in WebKit: two characters share a line only when
    // each one's vertical middle falls inside the other's rect, and WebKit
    // places an inline object at the end of a wrapped line so that it fails
    // that check against the text before it. The delete stops before the
    // object and leaves it behind.
    const testUnlessWebKit = server.browser === 'webkit' ? test.fails : test

    testUnlessWebKit(
      'Scenario: Deleting a line forward in a wrapped block removes the inline object that ends the visual line',
      async () => {
        const keyGenerator = createTestKeyGenerator()
        const blockKey = keyGenerator()
        const fooKey = keyGenerator()
        const stockTickerKey = keyGenerator()
        const barKey = keyGenerator()
        const stockTicker = defineInlineObject({
          type: 'stock-ticker',
          render: ({attributes, children}) => (
            <span {...attributes}>
              {children}
              <span
                contentEditable={false}
                style={{display: 'inline-block', width: '1ch', height: '1em'}}
              />
            </span>
          ),
        })
        const {editor} = await createTestEditor({
          keyGenerator,
          schemaDefinition: defineSchema({
            inlineObjects: [{name: 'stock-ticker'}],
          }),
          initialValue: [
            {
              _key: blockKey,
              _type: 'block',
              children: [
                {_key: fooKey, _type: 'span', text: 'foo', marks: []},
                {_key: stockTickerKey, _type: 'stock-ticker'},
                {_key: barKey, _type: 'span', text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
          editableProps: {
            style: {
              width: '4ch',
              fontFamily: 'monospace',
              wordBreak: 'break-all',
            },
          },
          children: <NodePlugin nodes={[stockTicker]} />,
        })

        editor.send({
          type: 'delete',
          direction: 'forward',
          unit: 'line',
          at: {
            anchor: {
              path: [{_key: blockKey}, 'children', {_key: fooKey}],
              offset: 1,
            },
            focus: {
              path: [{_key: blockKey}, 'children', {_key: fooKey}],
              offset: 1,
            },
          },
        })

        await vi.waitFor(() => {
          expect(toTextspec(editor.getSnapshot().context)).toEqual('B: fbar')
        })
      },
    )

    // Known limitation: two characters share a line only when each one's
    // vertical middle falls inside the other's rect. An inline object taller
    // than the text fails that check against the text beside it, so a forward
    // line delete stops before the object and leaves it behind.
    test.fails('Scenario: Deleting a line forward removes an inline object taller than the text at the end of the line', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const fooKey = keyGenerator()
      const stockTickerKey = keyGenerator()
      const barKey = keyGenerator()
      const stockTicker = defineInlineObject({
        type: 'stock-ticker',
        render: ({attributes, children}) => (
          <span {...attributes}>
            {children}
            <span
              contentEditable={false}
              style={{display: 'inline-block', width: '1ch', height: '3em'}}
            />
          </span>
        ),
      })
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          inlineObjects: [{name: 'stock-ticker'}],
        }),
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: fooKey, _type: 'span', text: 'foo', marks: []},
              {_key: stockTickerKey, _type: 'stock-ticker'},
              {_key: barKey, _type: 'span', text: '', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        children: <NodePlugin nodes={[stockTicker]} />,
      })

      editor.send({
        type: 'delete',
        direction: 'forward',
        unit: 'line',
        at: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: fooKey}],
            offset: 1,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: fooKey}],
            offset: 1,
          },
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: f')
      })
    })
  })
})
