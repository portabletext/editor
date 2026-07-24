import {createTestKeyGenerator} from '@portabletext/test'
import {makeDiff, makePatches, stringifyPatches} from '@sanity/diff-match-patch'
import {describe, expect, test, vi} from 'vitest'
import {
  defineSchema,
  type EditorEmittedEvent,
  type MutationEvent,
  type Patch,
} from '../src'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'
import {toTextspec} from '../test-utils/to-textspec'

describe('event.update value', () => {
  test('Scenario: Clearing placeholder value', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({}),
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [
          {
            _key: 'k1',
            _type: 'span',
            text: '',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])

    editor.send({
      type: 'update value',
      value: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [
            {
              _key: 'k1',
              _type: 'span',
              text: '',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Updating and then clearing placeholder value', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({}),
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _key: 'k0',
          _type: 'block',
          children: [
            {
              _key: 'k1',
              _type: 'span',
              text: 'foo',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [
            {
              _key: 'k1',
              _type: 'span',
              text: 'foo',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'update value',
      value: undefined,
    })

    // Clearing empties the first text block in place instead of minting a
    // fresh placeholder: a client that emptied the document by deleting
    // its text keeps these keys, and adopting clients converge on them.
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [
            {
              _key: 'k1',
              _type: 'span',
              text: '',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: updating block object property', async () => {
    const keyGenerator = createTestKeyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'url'}],
      }),
    })

    editor.send({
      type: 'insert.block object',
      blockObject: {
        name: 'url',
        value: {
          href: 'https://www.sanity.io',
        },
      },
      placement: 'auto',
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _key: 'k2',
          _type: 'url',
          href: 'https://www.sanity.io',
          description: 'Sanity is a headless CMS',
        },
      ],
    })

    await vi.waitFor(
      () => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: 'k2',
            _type: 'url',
            description: 'Sanity is a headless CMS',
            href: 'https://www.sanity.io',
          },
        ])
      },
      {
        timeout: 1100,
      },
    )
  })

  test('Scenario: Updating the text of an empty span', async () => {
    const keyGenerator = createTestKeyGenerator()

    const span = {_type: 'span', _key: 'span1', text: '', marks: []}
    const emptyFirstLine = {
      _key: 'block1', // Static key
      _type: 'block',
      children: [span],
      style: 'normal' as const,
      markDefs: [],
    }
    const populatedFirstLine = {
      ...emptyFirstLine,
      children: [{...span, text: 'e'}], // Same block key, different content
    }
    const lastLine = {
      _key: 'block2', // Static key
      _type: 'block',
      children: [{_type: 'span', _key: 'span2', text: 'last line', marks: []}],
      style: 'normal' as const,
      markDefs: [],
    }

    const {editor} = await createTestEditor({
      keyGenerator,
    })

    editor.send({
      type: 'update value',
      value: [emptyFirstLine, lastLine],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        emptyFirstLine,
        lastLine,
      ])
    })

    editor.send({
      type: 'update value',
      value: [populatedFirstLine, lastLine],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        populatedFirstLine,
        lastLine,
      ])
    })
  })

  test("Scenario: Updating before 'ready'", async () => {
    const keyGenerator = createTestKeyGenerator()
    const onEvent = vi.fn<() => EditorEmittedEvent>()
    const listBlock = {
      _key: keyGenerator(),
      _type: 'block',
      children: [
        {
          _key: keyGenerator(),
          _type: 'span',
          text: 'foo',
          marks: [],
        },
      ],
      level: 1,
      listItem: 'bullet',
      markDefs: [],
      style: 'normal',
    }

    const {editor} = await createTestEditor({
      children: <EventListenerPlugin on={onEvent} />,
      keyGenerator,
      schemaDefinition: defineSchema({
        lists: [{name: 'bullet'}],
        styles: [{name: 'normal'}, {name: 'h1'}],
      }),
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'block',
          children: [{_key: keyGenerator(), _type: 'span', text: 'a'}],
        },
      ],
    })

    editor.send({
      type: 'update value',
      value: [listBlock],
    })

    await vi.waitFor(() => {
      expect(onEvent).toHaveBeenCalledWith({type: 'ready'})
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([listBlock])
    })
  })

  test('Scenario: Adding blocks before existing block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const onEvent = vi.fn<() => EditorEmittedEvent>()

    const h2 = {
      _key: keyGenerator(),
      _type: 'block',
      children: [{_key: keyGenerator(), _type: 'span', text: 'h2', marks: []}],
      style: 'h2',
      markDefs: [],
    }
    const h1 = {
      _key: keyGenerator(),
      _type: 'block',
      children: [{_key: keyGenerator(), _type: 'span', text: 'h1', marks: []}],
      style: 'h1',
      markDefs: [],
    }
    const paragraph = {
      _key: keyGenerator(),
      _type: 'block',
      children: [
        {_key: keyGenerator(), _type: 'span', text: 'paragraph', marks: []},
      ],
      style: 'normal',
      markDefs: [],
    }

    const {editor} = await createTestEditor({
      children: <EventListenerPlugin on={onEvent} />,
      keyGenerator,
      schemaDefinition: defineSchema({}),
    })

    await vi.waitFor(() => {
      expect(onEvent).toHaveBeenCalledWith({type: 'ready'})
    })

    editor.send({
      type: 'update value',
      value: [h2],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([h2])
    })

    editor.send({
      type: 'update value',
      value: [h1, paragraph, h2],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([h1, paragraph, h2])
    })
  })

  test('Scenario: Clearing lonely block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'image',
          _key: imageKey,
        },
      ],
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'image',
          _key: imageKey,
        },
      ])
    })

    editor.send({
      type: 'update value',
      value: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k3',
          children: [
            {
              _type: 'span',
              _key: 'k4',
              text: '',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Clearing lonely text block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'foo',
              marks: [],
            },
          ],
          style: 'h1',
          markDefs: [],
        },
      ],
      schemaDefinition: defineSchema({
        styles: [{name: 'h1'}],
      }),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'foo',
              marks: [],
            },
          ],
          style: 'h1',
          markDefs: [],
        },
      ])
    })

    editor.send({
      type: 'update value',
      value: undefined,
    })

    // Clearing empties the block in place, keeping its keys and resetting
    // the style to the default, so converged clients agree on the empty
    // document's shape.
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: '',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Updating text while read-only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          style: 'normal',
          markDefs: [],
        },
      ],
      schemaDefinition: defineSchema({}),
    })

    editor.send({
      type: 'update readOnly',
      readOnly: true,
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'bar', marks: []}],
          style: 'normal',
          markDefs: [],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'bar', marks: []}],
          style: 'normal',
          markDefs: [],
        },
      ])
    })
  })

  test('Scenario: Updating with unknown block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const events: Array<EditorEmittedEvent> = []
    const {editor} = await createTestEditor({
      children: (
        <EventListenerPlugin
          on={(event) => {
            events.push(event)
          }}
        />
      ),
      keyGenerator,
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _key: keyGenerator(),
          _type: 'block',
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []},
          ],
        },
        {
          _key: keyGenerator(),
          _type: 'image',
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'bar', marks: []},
          ],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo')
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {type: 'ready'},
        // Sync applies the valid first block (replacing the seed block,
        // with parse fix-ups for the missing `markDefs`/`style`), then
        // stops at the unknown block object.
        {
          type: 'operation',
          operation: {type: 'unset', path: [{_key: 'k0'}]},
        },
        {
          type: 'operation',
          operation: {
            type: 'insert',
            path: [0],
            position: 'before',
            node: {
              _type: 'block',
              _key: 'k2',
              children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
            },
          },
        },
        {
          type: 'operation',
          operation: {
            type: 'set',
            path: [{_key: 'k2'}, 'markDefs'],
            value: [],
            inverse: {type: 'unset', path: [{_key: 'k2'}, 'markDefs']},
          },
        },
        {
          type: 'operation',
          operation: {
            type: 'set',
            path: [{_key: 'k2'}, 'style'],
            value: 'normal',
            inverse: {type: 'unset', path: [{_key: 'k2'}, 'style']},
          },
        },
        {
          type: 'invalid value',
          resolution: {
            action: 'Remove the block',
            description: "Block with _key 'k4' has invalid _type 'image'",
            i18n: {
              action:
                'inputs.portable-text.invalid-value.disallowed-type.action',
              description:
                'inputs.portable-text.invalid-value.disallowed-type.description',
              values: {key: 'k4', typeName: 'image'},
            },
            item: {_key: 'k4', _type: 'image'},
            patches: [{type: 'unset', path: [{_key: 'k4'}]}],
          },
          value: [
            {
              _type: 'block',
              _key: 'k2',
              children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
            },
            {_key: 'k4', _type: 'image'},
            {
              _type: 'block',
              _key: 'k5',
              children: [{_type: 'span', _key: 'k6', text: 'bar', marks: []}],
            },
          ],
        },
      ])
    })
  })

  test('Scenario: Updating span with reordered marks', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}, {name: 'em'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'foo',
              marks: ['strong', 'em'],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'foo',
              marks: ['em', 'strong'],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'foo',
              marks: ['em', 'strong'],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Changing block type from text to block object (same key)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'image',
          _key: blockKey,
          src: 'https://example.com/image.jpg',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'image',
          _key: blockKey,
          src: 'https://example.com/image.jpg',
        },
      ])
    })
  })

  test('Scenario: Changing child type from span to inline object (same key)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const childKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [
          {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: childKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: childKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'stock-ticker', _key: childKey, symbol: 'AAPL'}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    // The engine normalizes inline objects by adding empty spans around them
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: 'k4', text: '', marks: []},
            {_type: 'stock-ticker', _key: childKey, symbol: 'AAPL'},
            {_type: 'span', _key: 'k5', text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Syncing the same block object is a noop', async () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    const emittedEvents: Array<EditorEmittedEvent> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
      initialValue: [
        {_type: 'image', _key: imageKey, src: 'https://example.com/image.jpg'},
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            emittedEvents.push(event)
          }}
        />
      ),
    })

    const syncEvents = [
      {
        type: 'operation',
        operation: {type: 'unset', path: [{_key: 'k1'}]},
      },
      {
        type: 'operation',
        operation: {
          type: 'insert',
          path: [0],
          position: 'before',
          node: {
            _type: 'image',
            _key: imageKey,
            src: 'https://example.com/image.jpg',
          },
        },
      },
      {
        type: 'value changed',
        value: [
          {
            _type: 'image',
            _key: imageKey,
            src: 'https://example.com/image.jpg',
          },
        ],
      },
      {type: 'ready'},
    ]

    await vi.waitFor(() => {
      expect(emittedEvents).toEqual(syncEvents)
    })

    editor.send({
      type: 'update value',
      value: [
        {_type: 'image', _key: imageKey, src: 'https://example.com/image.jpg'},
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {_type: 'image', _key: imageKey, src: 'https://example.com/image.jpg'},
      ])
    })

    // Syncing the identical value emits nothing new: no operations, no
    // `value changed`.
    await vi.waitFor(() => {
      expect(emittedEvents).toEqual(syncEvents)
    })
  })

  test('Scenario: Changing and adding text block children', async () => {
    const keyGenerator = createTestKeyGenerator()

    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const emptySpanKey = keyGenerator()
    const stockTickerKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [{name: 'stock-ticker'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'Hello (NYSE:AAPL)',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'Hello ', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey, symbol: 'NYSE:AAPL'},
            {_type: 'span', _key: emptySpanKey, text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'Hello ', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey, symbol: 'NYSE:AAPL'},
            {_type: 'span', _key: emptySpanKey, text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Removing children from a block that is not the first block', async () => {
    const keyGenerator = createTestKeyGenerator()

    const block1Key = keyGenerator()
    const span1Key = keyGenerator()
    const block2Key = keyGenerator()
    const span2Key = keyGenerator()
    const stockTickerKey = keyGenerator()
    const span3Key = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [{name: 'stock-ticker'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: block1Key,
          children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: block2Key,
          children: [
            {_type: 'span', _key: span2Key, text: 'bar', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey},
            {_type: 'span', _key: span3Key, text: 'baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: block1Key,
          children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: block2Key,
          children: [
            {_type: 'span', _key: span2Key, text: 'bar', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey},
            {_type: 'span', _key: span3Key, text: 'baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'block',
          _key: block1Key,
          children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: block2Key,
          children: [
            {_type: 'span', _key: span2Key, text: 'foobar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: block1Key,
          children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: block2Key,
          children: [
            {_type: 'span', _key: span2Key, text: 'foobar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Reordering children within a block (same keys, different positions)', async () => {
    const keyGenerator = createTestKeyGenerator()

    const blockKey = keyGenerator()
    const spanAKey = keyGenerator()
    const spanBKey = keyGenerator()
    const spanCKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}, {name: 'em'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanAKey, text: 'A', marks: ['strong']},
            {_type: 'span', _key: spanBKey, text: 'B', marks: ['em']},
            {_type: 'span', _key: spanCKey, text: 'C', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanAKey, text: 'A', marks: ['strong']},
            {_type: 'span', _key: spanBKey, text: 'B', marks: ['em']},
            {_type: 'span', _key: spanCKey, text: 'C', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    // Reorder children: [A(strong), B(em), C] -> [C, A(strong), B(em)]
    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanCKey, text: 'C', marks: []},
            {_type: 'span', _key: spanAKey, text: 'A', marks: ['strong']},
            {_type: 'span', _key: spanBKey, text: 'B', marks: ['em']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanCKey, text: 'C', marks: []},
            {_type: 'span', _key: spanAKey, text: 'A', marks: ['strong']},
            {_type: 'span', _key: spanBKey, text: 'B', marks: ['em']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Updating inline object value (same key)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const span1Key = keyGenerator()
    const stockTickerKey = keyGenerator()
    const span2Key = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [
          {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: span1Key, text: 'Price: ', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey, symbol: 'AAPL'},
            {_type: 'span', _key: span2Key, text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: span1Key, text: 'Price: ', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey, symbol: 'AAPL'},
            {_type: 'span', _key: span2Key, text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    // Update the inline object's value (same key and type)
    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: span1Key, text: 'Price: ', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey, symbol: 'GOOG'},
            {_type: 'span', _key: span2Key, text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: span1Key, text: 'Price: ', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey, symbol: 'GOOG'},
            {_type: 'span', _key: span2Key, text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Selection restoration when block type changes', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanAKey = keyGenerator()
    const spanBKey = keyGenerator()
    const spanCKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
        decorators: [{name: 'strong'}, {name: 'em'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanAKey, text: 'A', marks: ['strong']},
            {_type: 'span', _key: spanBKey, text: 'B', marks: ['em']},
            {_type: 'span', _key: spanCKey, text: 'C', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanAKey, text: 'A', marks: ['strong']},
            {_type: 'span', _key: spanBKey, text: 'B', marks: ['em']},
            {_type: 'span', _key: spanCKey, text: 'C', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanCKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanCKey}],
          offset: 1,
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanCKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanCKey}],
          offset: 1,
        },
        backward: false,
      })
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'image',
          _key: blockKey,
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'image',
          _key: blockKey,
        },
      ])

      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: blockKey}], offset: 0},
        focus: {path: [{_key: blockKey}], offset: 0},
        backward: false,
      })
    })
  })

  test('Scenario: Removing a custom block property', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
          _map: {key: 'value'},
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
          _map: {key: 'value'},
        },
      ])
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Adding new children to a text block (pure addition)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanAKey = keyGenerator()
    const spanBKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanAKey, text: 'Hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    const newValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: spanAKey, text: 'Hello', marks: []},
          {
            _type: 'span',
            _key: spanBKey,
            text: ' World',
            marks: ['strong'],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ]

    editor.send({
      type: 'update value',
      value: newValue,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(newValue)
    })
  })

  test('Scenario: Replacing all children with different keys', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanAKey = keyGenerator()
    const spanBKey = keyGenerator()
    const spanCKey = keyGenerator()
    const spanDKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}, {name: 'em'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanAKey, text: 'old1', marks: ['strong']},
            {_type: 'span', _key: spanBKey, text: 'old2', marks: ['em']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    const newValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: spanCKey, text: 'new1', marks: ['em']},
          {_type: 'span', _key: spanDKey, text: 'new2', marks: ['strong']},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]

    editor.send({
      type: 'update value',
      value: newValue,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(newValue)
    })
  })

  test('Scenario: Reordering children and modifying text simultaneously', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanAKey = keyGenerator()
    const spanBKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}, {name: 'em'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanAKey, text: 'foo', marks: ['strong']},
            {_type: 'span', _key: spanBKey, text: 'bar', marks: ['em']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    const newValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: spanBKey, text: 'BAR', marks: ['em']},
          {_type: 'span', _key: spanAKey, text: 'FOO', marks: ['strong']},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]

    editor.send({
      type: 'update value',
      value: newValue,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(newValue)
    })
  })

  test('Scenario: Reordering top-level blocks', async () => {
    const keyGenerator = createTestKeyGenerator()
    const block1Key = keyGenerator()
    const span1Key = keyGenerator()
    const block2Key = keyGenerator()
    const span2Key = keyGenerator()
    const block3Key = keyGenerator()
    const span3Key = keyGenerator()

    const block1 = {
      _type: 'block',
      _key: block1Key,
      children: [{_type: 'span', _key: span1Key, text: 'First', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const block2 = {
      _type: 'block',
      _key: block2Key,
      children: [{_type: 'span', _key: span2Key, text: 'Second', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const block3 = {
      _type: 'block',
      _key: block3Key,
      children: [{_type: 'span', _key: span3Key, text: 'Third', marks: []}],
      markDefs: [],
      style: 'normal',
    }

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [block1, block2, block3],
    })

    const updatedBlock1 = {
      ...block1,
      children: [
        {_type: 'span', _key: span1Key, text: 'First updated', marks: []},
      ],
    }
    const updatedBlock3 = {
      ...block3,
      children: [
        {_type: 'span', _key: span3Key, text: 'Third updated', marks: []},
      ],
    }

    editor.send({
      type: 'update value',
      value: [updatedBlock1, block2, updatedBlock3],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        updatedBlock1,
        block2,
        updatedBlock3,
      ])
    })
  })

  test('Scenario: Multiple blocks with children changes in same update', async () => {
    const keyGenerator = createTestKeyGenerator()
    const block1Key = keyGenerator()
    const spanAKey = keyGenerator()
    const block2Key = keyGenerator()
    const spanBKey = keyGenerator()
    const spanCKey = keyGenerator()
    const spanDKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: block1Key,
          children: [{_type: 'span', _key: spanAKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: block2Key,
          children: [
            {_type: 'span', _key: spanBKey, text: 'world', marks: []},
            {_type: 'span', _key: spanCKey, text: '!', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    const newValue = [
      {
        _type: 'block',
        _key: block1Key,
        children: [
          {_type: 'span', _key: spanAKey, text: 'hello', marks: []},
          {_type: 'span', _key: spanDKey, text: ' there', marks: ['strong']},
        ],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: block2Key,
        children: [{_type: 'span', _key: spanBKey, text: 'world', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    editor.send({
      type: 'update value',
      value: newValue,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(newValue)
    })
  })

  test('Scenario: Removing blocks from the end (remote value has fewer blocks)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const block1Key = keyGenerator()
    const span1Key = keyGenerator()
    const block2Key = keyGenerator()
    const span2Key = keyGenerator()
    const block3Key = keyGenerator()
    const span3Key = keyGenerator()

    const block1 = {
      _type: 'block',
      _key: block1Key,
      children: [{_type: 'span', _key: span1Key, text: 'First', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const block2 = {
      _type: 'block',
      _key: block2Key,
      children: [{_type: 'span', _key: span2Key, text: 'Second', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const block3 = {
      _type: 'block',
      _key: block3Key,
      children: [{_type: 'span', _key: span3Key, text: 'Third', marks: []}],
      markDefs: [],
      style: 'normal',
    }

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [block1, block2, block3],
    })

    editor.send({
      type: 'update value',
      value: [block1, block2],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([block1, block2])
    })
  })

  test('Scenario: Removing blocks from the middle (remote value drops a middle block)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const block1Key = keyGenerator()
    const span1Key = keyGenerator()
    const block2Key = keyGenerator()
    const span2Key = keyGenerator()
    const block3Key = keyGenerator()
    const span3Key = keyGenerator()

    const block1 = {
      _type: 'block',
      _key: block1Key,
      children: [{_type: 'span', _key: span1Key, text: 'First', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const block2 = {
      _type: 'block',
      _key: block2Key,
      children: [{_type: 'span', _key: span2Key, text: 'Second', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const block3 = {
      _type: 'block',
      _key: block3Key,
      children: [{_type: 'span', _key: span3Key, text: 'Third', marks: []}],
      markDefs: [],
      style: 'normal',
    }

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [block1, block2, block3],
    })

    editor.send({
      type: 'update value',
      value: [block1, block3],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([block1, block3])
    })
  })

  test("Scenario: Updating an inline object's `text` field", async () => {
    const schemaDefinition = defineSchema({
      inlineObjects: [
        {name: 'inlineNote', fields: [{name: 'text', type: 'string'}]},
      ],
    })
    const {editor} = await createTestEditor({
      schemaDefinition,
      initialValue: [
        {
          _key: 'b1',
          _type: 'block',
          children: [
            {_key: 's1', _type: 'span', text: '', marks: []},
            {_key: 'n1', _type: 'inlineNote', text: ''},
            {_key: 's2', _type: 'span', text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _key: 'b1',
          _type: 'block',
          children: [
            {_key: 's1', _type: 'span', text: '', marks: []},
            {_key: 'n1', _type: 'inlineNote', text: 'hello'},
            {_key: 's2', _type: 'span', text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b1',
          _type: 'block',
          children: [
            {_key: 's1', _type: 'span', text: '', marks: []},
            {_key: 'n1', _type: 'inlineNote', text: 'hello'},
            {_key: 's2', _type: 'span', text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })
})

describe('event.update value: adjacent same-mark spans', () => {
  // Regression: the engine merges adjacent same-mark spans on load, so its
  // state diverges from the stored value. A subsequent `update value` with
  // the stored (split) shape walked the children against a pre-loop engine
  // snapshot: each replaced child was unset, and the next iteration then
  // anchored its insert on that just-unset sibling, throwing
  // `Cannot apply an "insert" operation ... because the sibling was not
  // found.` and killing the sync actor.
  const splitValue = [
    {
      _key: 'b0',
      _type: 'block',
      children: [
        {_key: 's1', _type: 'span', text: 'C1', marks: ['strong']},
        {_key: 's2', _type: 'span', text: 'C2', marks: ['strong']},
        {_key: 's3', _type: 'span', text: 'C3', marks: ['strong']},
        {_key: 's4', _type: 'span', text: 'D', marks: []},
        {_key: 's5', _type: 'span', text: 'E', marks: ['em']},
      ],
      markDefs: [],
      style: 'normal',
    },
  ]

  test('Scenario: updating with the stored split shape after a local edit merged the engine', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}, {name: 'em'}],
      }),
      initialValue: splitValue,
    })

    // Adopted structure is kept as-is; the split shape survives the load.
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(splitValue)
    })

    // A local edit dirties the block: the three adjacent `strong` spans
    // merge as fallout, and the engine's shape now diverges from the
    // stored one.
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'b0'}, 'children', {_key: 's4'}], offset: 1},
        focus: {path: [{_key: 'b0'}, 'children', {_key: 's4'}], offset: 1},
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {_key: 's1', _type: 'span', text: 'C1C2C3', marks: ['strong']},
            {_key: 's4', _type: 'span', text: 'D!', marks: []},
            {_key: 's5', _type: 'span', text: 'E', marks: ['em']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    // The consumer sends an update: a new block appended, while the
    // adjacent-span block is still in its stored (split) shape. The
    // changed value forces a sync, and the block diffs against the
    // engine's merged shape.
    const appendedBlock = {
      _key: 'b1',
      _type: 'block',
      children: [{_key: 's6', _type: 'span', text: 'new', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    editor.send({
      type: 'update value',
      value: [...splitValue, appendedBlock],
    })

    // The engine adopts the document's split shape as-is (the update is
    // document truth, so the local `!` goes too) and the sync actor
    // survives the shape mismatch.
    await vi.waitFor(
      () => {
        expect(editor.getSnapshot().context.value).toEqual([
          ...splitValue,
          appendedBlock,
        ])
      },
      // The sync machine parks in `busy` while the local edit's emitted
      // mutation flushes and re-checks on a 1s timer.
      {timeout: 5000},
    )

    // The sync actor is still alive: a later update still lands.
    editor.send({
      type: 'update value',
      value: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's1', _type: 'span', text: 'changed', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's1', _type: 'span', text: 'changed', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })
})

describe('event.update value: auto-resolved invalid blocks', () => {
  // Regression: `validateValue` auto-resolutions (e.g. minting a missing
  // child `_key`) were emitted as outbound patches while the *raw* block
  // proceeded into the engine. The engine ended up holding the un-repaired
  // shape (a keyless child), diverging from the document that received the
  // minted key, and the next sync against that invalid engine state killed
  // the sync silently.
  const keylessChildBlock = {
    _key: 'b0',
    _type: 'block',
    children: [{_type: 'span', text: 'hello changed', marks: []}],
    markDefs: [],
    style: 'normal',
  }

  test('Scenario: a mid-session update with a keyless child is repaired once and the sync survives', async () => {
    const patches: Array<Patch> = []
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
    })

    // A changed block arrives whose span lost its `_key`.
    editor.send({type: 'update value', value: [keylessChildBlock]})

    // The auto-resolution is emitted as a patch AND applied to the block
    // the engine receives: one key, minted once, on both sides.
    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: 'b0'}, 'children', 0],
          value: {
            _type: 'span',
            _key: 'k2',
            text: 'hello changed',
            marks: [],
          },
        },
      ])
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {_key: 'k2', _type: 'span', text: 'hello changed', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    // The sync is still alive: a later update still lands.
    editor.send({
      type: 'update value',
      value: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's9', _type: 'span', text: 'recovered', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(
      () => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: 'b0',
            _type: 'block',
            children: [
              {_key: 's9', _type: 'span', text: 'recovered', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      },
      // The sync machine parks in `busy` while its own emitted mutation
      // flushes and re-checks on a 1s timer, so the recovery value can
      // take a beat over a second to land.
      {timeout: 5000},
    )
  })

  test('Scenario: a mid-session update with an unused markDef keeps the definition until a local edit', async () => {
    const patches: Array<Patch> = []
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
    })

    // A changed block arrives carrying a markDef no span references.
    editor.send({
      type: 'update value',
      value: [
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {_key: 's0', _type: 'span', text: 'hello changed', marks: []},
          ],
          markDefs: [{_key: 'm1', _type: 'link', href: 'https://example.com'}],
          style: 'normal',
        },
      ],
    })

    // The definition is adopted as the document has it: a def that looks
    // unused in this snapshot may be referenced by a collaborator's
    // in-flight edits, so adoption neither prunes it nor emits patches.
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {_key: 's0', _type: 'span', text: 'hello changed', marks: []},
          ],
          markDefs: [{_key: 'm1', _type: 'link', href: 'https://example.com'}],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([])
    })

    // The next local edit canonicalizes the block: the unused definition
    // is pruned as normalization fallout and rides out with the edit.
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 13},
        focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 13},
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {_key: 's0', _type: 'span', text: 'hello changed!', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'diffMatchPatch',
          path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
          value: stringifyPatches(
            makePatches(makeDiff('hello changed', 'hello changed!')),
          ),
          origin: 'local',
        },
        {
          type: 'set',
          path: [{_key: 'b0'}, 'markDefs'],
          value: [],
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: a startup value with a keyless child is repaired in the engine without emitting patches', async () => {
    const patches: Array<Patch> = []
    const mutations: Array<MutationEvent> = []
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_type: 'span', text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 'k2', _type: 'span', text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    // No mutation leaves a pristine editor on open. "Nothing was emitted"
    // can't be awaited directly, so prove it with a causal sentinel: make
    // one local edit and assert its patches are the only ones ever
    // collected. Event ordering guarantees a would-be repair emission had
    // flushed before the sentinel's.
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'b0'}, 'children', {_key: 'k2'}], offset: 5},
        focus: {path: [{_key: 'b0'}, 'children', {_key: 'k2'}], offset: 5},
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    const sentinelPatch = {
      type: 'diffMatchPatch',
      path: [{_key: 'b0'}, 'children', {_key: 'k2'}, 'text'],
      value: stringifyPatches(makePatches(makeDiff('hello', 'hello!'))),
      origin: 'local',
    }

    await vi.waitFor(() => {
      expect(patches).toEqual([sentinelPatch])
      expect(mutations.map((mutation) => mutation.patches)).toEqual([
        [sentinelPatch],
      ])
    })
  })
})
