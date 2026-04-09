import {
  applyAll,
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema} from '../src'
import {effect, execute, forward} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import type {BehaviorEvent} from '../src/behaviors/behavior.types.event'
import {EventListenerPlugin} from '../src/plugins'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {RendererPlugin} from '../src/plugins/plugin.renderer'
import {createTestEditor} from '../src/test/vitest'
import {
  getSelectionAfterText,
  getSelectionBeforeText,
  getTextSelection,
} from '../test-utils/text-selection'

describe('event.delete.backward', () => {
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
    await userEvent.keyboard('{Backspace}')

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

  test('Scenario: Executing delete.backward', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'delete.backward',
              actions: [({event}) => [execute(event)]],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'foo')

    await userEvent.keyboard('{Backspace}')

    await vi.waitFor(() => {
      return expect(getTersePt(editor.getSnapshot().context)).toEqual(['fo'])
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
      at: getSelectionBeforeText(editor.getSnapshot().context, 'bar'),
    })

    await userEvent.keyboard('{Backspace}')

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

  describe('Scenario: Deleting word', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const initialValue = [
      {
        _key: blockKey,
        _type: 'block',
        children: [{_key: spanKey, _type: 'span', text: 'foo bar baz'}],
      },
    ]

    describe('with selection', () => {
      test('collapsed selection', async () => {
        const {editor, locator} = await createTestEditor({
          initialValue,
        })

        await userEvent.click(locator)

        const selection = getSelectionAfterText(
          editor.getSnapshot().context,
          'bar',
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
          direction: 'backward',
          unit: 'word',
        })

        await vi.waitFor(() => {
          expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo  baz'])
        })
      })

      test('expanded selection', async () => {
        const {editor, locator} = await createTestEditor({
          initialValue,
        })

        await userEvent.click(locator)

        const selection = getTextSelection(editor.getSnapshot().context, 'ar')

        editor.send({
          type: 'select',
          at: selection,
        })

        await vi.waitFor(() => {
          expect(editor.getSnapshot().context.selection).toEqual(selection)
        })

        editor.send({
          type: 'delete',
          direction: 'backward',
          unit: 'word',
        })

        await vi.waitFor(() => {
          expect(getTersePt(editor.getSnapshot().context)).toEqual([
            'foo b baz',
          ])
        })
      })
    })

    describe('without selection', () => {
      test('collapsed selection', async () => {
        const {editor} = await createTestEditor({
          initialValue,
        })

        editor.send({
          type: 'delete',
          direction: 'backward',
          unit: 'word',
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
          expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo  baz'])
        })
      })

      test('expanded selection', async () => {
        const {editor} = await createTestEditor({
          initialValue,
        })

        editor.send({
          type: 'delete',
          direction: 'backward',
          unit: 'word',
          at: {
            anchor: {
              path: [{_key: blockKey}, 'children', {_key: spanKey}],
              offset: 5,
            },
            focus: {
              path: [{_key: blockKey}, 'children', {_key: spanKey}],
              offset: 7,
            },
          },
        })

        await vi.waitFor(() => {
          expect(getTersePt(editor.getSnapshot().context)).toEqual([
            'foo b baz',
          ])
        })
      })
    })
  })

  describe('Scenario: Deleting line', () => {
    test('with selection', async () => {
      const {editor, locator} = await createTestEditor({
        initialValue: [
          {
            _key: 'k0',
            _type: 'block',
            children: [{_key: 'k1', _type: 'span', text: 'foo bar baz'}],
          },
        ],
      })

      await userEvent.click(locator)

      const selection = getSelectionBeforeText(
        editor.getSnapshot().context,
        'bar',
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
        direction: 'backward',
        unit: 'line',
      })

      await vi.waitFor(() => {
        expect(getTersePt(editor.getSnapshot().context)).toEqual(['bar baz'])
      })
    })

    test('without selection', async () => {
      const {editor} = await createTestEditor({
        initialValue: [
          {
            _key: 'k0',
            _type: 'block',
            children: [{_key: 'k1', _type: 'span', text: 'foo bar baz'}],
          },
        ],
      })

      editor.send({
        type: 'delete',
        direction: 'backward',
        unit: 'line',
        at: {
          anchor: {
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
            offset: 4,
          },
          focus: {
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
            offset: 4,
          },
        },
      })

      await vi.waitFor(() => {
        expect(getTersePt(editor.getSnapshot().context)).toEqual(['bar baz'])
      })
    })
  })

  describe('containers', () => {
    const calloutSchemaDefinition = defineSchema({
      blockObjects: [
        {
          name: 'callout',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [{type: 'block'}],
            },
          ],
        },
      ],
    })

    function CalloutRenderer({
      attributes,
      children,
    }: {
      attributes: Record<string, unknown>
      children: React.ReactNode
    }) {
      return <div {...attributes}>{children}</div>
    }

    test('delete.backward merges text blocks inside container', async () => {
      const keyGenerator = createTestKeyGenerator()
      const calloutKey = keyGenerator()
      const block1Key = keyGenerator()
      const span1Key = keyGenerator()
      const block2Key = keyGenerator()
      const span2Key = keyGenerator()

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: calloutSchemaDefinition,
        initialValue: [
          {
            _type: 'callout',
            _key: calloutKey,
            content: [
              {
                _type: 'block',
                _key: block1Key,
                children: [
                  {
                    _type: 'span',
                    _key: span1Key,
                    text: 'first',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
              {
                _type: 'block',
                _key: block2Key,
                children: [
                  {
                    _type: 'span',
                    _key: span2Key,
                    text: 'second',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
        children: (
          <RendererPlugin
            renderers={[{renderer: {type: 'callout', render: CalloutRenderer}}]}
          />
        ),
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [
              {_key: calloutKey},
              'content',
              {_key: block2Key},
              'children',
              {_key: span2Key},
            ],
            offset: 0,
          },
          focus: {
            path: [
              {_key: calloutKey},
              'content',
              {_key: block2Key},
              'children',
              {_key: span2Key},
            ],
            offset: 0,
          },
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).not.toBeNull()
      })

      editor.send({type: 'delete.backward'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'callout',
            _key: calloutKey,
            content: [
              {
                _type: 'block',
                _key: block1Key,
                children: [
                  {
                    _type: 'span',
                    _key: span1Key,
                    text: 'firstsecond',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [
              {_key: calloutKey},
              'content',
              {_key: block1Key},
              'children',
              {_key: span1Key},
            ],
            offset: 5,
          },
          focus: {
            path: [
              {_key: calloutKey},
              'content',
              {_key: block1Key},
              'children',
              {_key: span1Key},
            ],
            offset: 5,
          },
          backward: false,
        })
      })
    })

    test('delete.backward deletes character inside container', async () => {
      const keyGenerator = createTestKeyGenerator()
      const calloutKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: calloutSchemaDefinition,
        initialValue: [
          {
            _type: 'callout',
            _key: calloutKey,
            content: [
              {
                _type: 'block',
                _key: blockKey,
                children: [
                  {
                    _type: 'span',
                    _key: spanKey,
                    text: 'hello',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
        children: (
          <RendererPlugin
            renderers={[{renderer: {type: 'callout', render: CalloutRenderer}}]}
          />
        ),
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [
              {_key: calloutKey},
              'content',
              {_key: blockKey},
              'children',
              {_key: spanKey},
            ],
            offset: 3,
          },
          focus: {
            path: [
              {_key: calloutKey},
              'content',
              {_key: blockKey},
              'children',
              {_key: spanKey},
            ],
            offset: 3,
          },
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).not.toBeNull()
      })

      editor.send({type: 'delete.backward'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'callout',
            _key: calloutKey,
            content: [
              {
                _type: 'block',
                _key: blockKey,
                children: [
                  {
                    _type: 'span',
                    _key: spanKey,
                    text: 'helo',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [
              {_key: calloutKey},
              'content',
              {_key: blockKey},
              'children',
              {_key: spanKey},
            ],
            offset: 2,
          },
          focus: {
            path: [
              {_key: calloutKey},
              'content',
              {_key: blockKey},
              'children',
              {_key: spanKey},
            ],
            offset: 2,
          },
          backward: false,
        })
      })
    })
  })
})
