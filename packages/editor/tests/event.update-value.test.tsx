import {applyAll} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {makeDiff, makePatches, stringifyPatches} from '@sanity/diff-match-patch'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {
  defineSchema,
  type EditorEmittedEvent,
  type MutationEvent,
  type Patch,
} from '../src'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

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

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k2',
          _type: 'block',
          children: [
            {
              _key: 'k3',
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
      // The sync machine parks in `busy` while the insert's emitted
      // mutation flushes and re-checks on a 1s timer, so the value cannot
      // land sooner than that.
      {timeout: 5000},
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

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k4',
          children: [
            {
              _type: 'span',
              _key: 'k5',
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
          origin: 'remote',
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
          origin: 'remote',
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

    const eventsBeforeEdit = events.length
    // Provoke the deferred healing: a local edit touching the block fills
    // in and emits its missing defaults as part of that edit.
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 3},
        focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 3},
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    // The full stream of the healing edit: the user's insert, then the
    // block's deferred defaults, then the patches and the mutation that
    // carries them all.
    await vi.waitFor(() => {
      expect(events.slice(eventsBeforeEdit)).toEqual([
        {
          type: 'selection',
          selection: {
            anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 3},
            focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 3},
            backward: false,
          },
        },
        {
          type: 'operation',
          operation: {
            type: 'insert.text',
            path: [{_key: 'k2'}, 'children', {_key: 'k3'}],
            offset: 3,
            text: '!',
          },
          origin: 'local',
        },
        {
          type: 'operation',
          operation: {
            type: 'set',
            path: [{_key: 'k2'}, 'markDefs'],
            value: [],
            inverse: {type: 'unset', path: [{_key: 'k2'}, 'markDefs']},
          },
          origin: 'local',
        },
        {
          type: 'operation',
          operation: {
            type: 'set',
            path: [{_key: 'k2'}, 'style'],
            value: 'normal',
            inverse: {type: 'unset', path: [{_key: 'k2'}, 'style']},
          },
          origin: 'local',
        },
        {
          type: 'patch',
          patch: {
            type: 'diffMatchPatch',
            origin: 'local',
            path: [{_key: 'k2'}, 'children', {_key: 'k3'}, 'text'],
            value: stringifyPatches(makePatches(makeDiff('foo', 'foo!'))),
          },
        },
        {
          type: 'patch',
          patch: {
            type: 'set',
            origin: 'local',
            path: [{_key: 'k2'}, 'markDefs'],
            value: [],
          },
        },
        {
          type: 'patch',
          patch: {
            type: 'set',
            origin: 'local',
            path: [{_key: 'k2'}, 'style'],
            value: 'normal',
          },
        },
        {
          type: 'selection',
          selection: {
            anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 4},
            focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 4},
            backward: false,
          },
        },
        {
          type: 'mutation',
          patches: [
            {
              type: 'diffMatchPatch',
              origin: 'local',
              path: [{_key: 'k2'}, 'children', {_key: 'k3'}, 'text'],
              value: stringifyPatches(makePatches(makeDiff('foo', 'foo!'))),
            },
            {
              type: 'set',
              origin: 'local',
              path: [{_key: 'k2'}, 'markDefs'],
              value: [],
            },
            {
              type: 'set',
              origin: 'local',
              path: [{_key: 'k2'}, 'style'],
              value: 'normal',
            },
          ],
          value: [
            {
              _key: 'k2',
              _type: 'block',
              children: [{_key: 'k3', _type: 'span', text: 'foo!', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    // The engine's own document agrees with the emitted patches: the
    // healed defaults are present in the value, not just on the wire.
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k2',
        _type: 'block',
        children: [{_key: 'k3', _type: 'span', text: 'foo!', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
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
        origin: 'remote',
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
        origin: 'remote',
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

describe('event.update value: mechanically repaired invalid blocks', () => {
  // Engine normalization mints a missing child `_key` on intake and
  // applies it to the engine's own document, not just to the outbound
  // patch: the emitted repair and the block the engine holds carry the
  // same minted key, so a later sync against this block finds a valid
  // shape instead of diverging from it.
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

    // Engine normalization mints the key once, on both the outbound
    // patch and the block it applies internally.
    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: 'b0'}, 'children', 0, '_key'],
          value: 'k2',
          origin: 'local',
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

  test('Scenario: a mid-session update with an orphaned markDef alongside a referenced one is repaired on both sides', async () => {
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

    // A changed block arrives carrying one markDef its span still
    // references and one markDef no span references.
    editor.send({
      type: 'update value',
      value: [
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {
              _key: 's0',
              _type: 'span',
              text: 'hello changed',
              marks: ['m0'],
            },
          ],
          markDefs: [
            {_key: 'm0', _type: 'link', href: 'https://example.com/kept'},
            {_key: 'm1', _type: 'link', href: 'https://example.com/orphan'},
          ],
          style: 'normal',
        },
      ],
    })

    // Intake passes the raw block through untouched: the orphan survives
    // until something else marks the block dirty.
    await vi.waitFor(() => {
      expect(patches).toEqual([])
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {
              _key: 's0',
              _type: 'span',
              text: 'hello changed',
              marks: ['m0'],
            },
          ],
          markDefs: [
            {_key: 'm0', _type: 'link', href: 'https://example.com/kept'},
            {_key: 'm1', _type: 'link', href: 'https://example.com/orphan'},
          ],
          style: 'normal',
        },
      ])
    })

    // The first local edit marks the block dirty: normalization removes
    // the orphan in the same pass, keeping the referenced def, and emits
    // the filtered `markDefs` array's wholesale `set` alongside the edit's
    // own patch.
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 5},
        focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 5},
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'diffMatchPatch',
          path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
          value: stringifyPatches(
            makePatches(makeDiff('hello changed', 'hello! changed')),
          ),
          origin: 'local',
        },
        {
          type: 'set',
          path: [{_key: 'b0'}, 'markDefs'],
          value: [
            {_key: 'm0', _type: 'link', href: 'https://example.com/kept'},
          ],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {
              _key: 's0',
              _type: 'span',
              text: 'hello! changed',
              marks: ['m0'],
            },
          ],
          markDefs: [
            {_key: 'm0', _type: 'link', href: 'https://example.com/kept'},
          ],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: a startup value with a keyless child emits the repair patch immediately, before any local edit', async () => {
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

    const repairPatch = {
      type: 'set',
      path: [{_key: 'b0'}, 'children', 0, '_key'],
      value: 'k2',
      origin: 'local',
    }

    await vi.waitFor(() => {
      expect(patches).toEqual([repairPatch])
      expect(mutations.map((mutation) => mutation.patches)).toEqual([
        [repairPatch],
      ])
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

    // The repair already published on open: the local edit's flush carries
    // only its own patch.
    await vi.waitFor(() => {
      expect(patches).toEqual([repairPatch, sentinelPatch])
      expect(mutations.map((mutation) => mutation.patches)).toEqual([
        [repairPatch],
        [sentinelPatch],
      ])
    })
  })

  test('Scenario: a read-only startup value with a keyless child emits the repair patch immediately but holds the repair mutation until editable', async () => {
    const patches: Array<Patch> = []
    const mutations: Array<MutationEvent> = []
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      readOnly: true,
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

    const repairPatch = {
      type: 'set',
      path: [{_key: 'b0'}, 'children', 0, '_key'],
      value: 'k2',
      origin: 'local',
    }

    await vi.waitFor(() => {
      expect(patches).toEqual([repairPatch])
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 'k2', _type: 'span', text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(editor.getSnapshot().context.readOnly).toBe(true)
    })

    // The batcher's flush interval (500ms in test mode) fires well within
    // this window: waiting past it, still read-only, proves the repair
    // mutation is held, not just not-yet-flushed.
    await new Promise((resolve) => setTimeout(resolve, 600))

    expect(mutations).toEqual([])

    editor.send({type: 'update readOnly', readOnly: false})

    await vi.waitFor(() => {
      expect(mutations.map((mutation) => mutation.patches)).toEqual([
        [repairPatch],
      ])
    })
  })

  test('Scenario: a read-only editor holding an intake repair still applies later value updates', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      readOnly: true,
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_type: 'span', text: 'hello', marks: []}],
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
          children: [{_key: 'k2', _type: 'span', text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    // A genuinely different remote value, still read-only: the intake
    // repair holds a mutation the editor can never flush, but that
    // mutation carries no unflushed user work, so it must not block this
    // update from landing.
    editor.send({
      type: 'update value',
      value: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 'k2', _type: 'span', text: 'goodbye', marks: []}],
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
          children: [{_key: 'k2', _type: 'span', text: 'goodbye', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: a held repair superseded by a corrected snapshot does not flush', async () => {
    const patches: Array<Patch> = []
    const mutations: Array<MutationEvent> = []
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      readOnly: true,
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

    const repairPatch = {
      type: 'set',
      path: [{_key: 'b0'}, 'children', 0, '_key'],
      value: 'k2',
      origin: 'local',
    }

    await vi.waitFor(() => {
      expect(patches).toEqual([repairPatch])
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

    // A corrected echo carrying the repair the engine already applied: the
    // host learned the key before this snapshot was produced, so the held
    // repair bulk addresses a key the document has already learned and
    // must not replay.
    editor.send({
      type: 'update value',
      value: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 'k2', _type: 'span', text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({type: 'update readOnly', readOnly: false})

    // The batcher's flush interval (500ms in test mode) fires well within
    // this window: waiting past it proves the stale repair mutation is
    // dropped, not just not-yet-flushed.
    await new Promise((resolve) => setTimeout(resolve, 600))

    expect(mutations).toEqual([])
  })

  test('Scenario: a held repair superseded by a still-broken snapshot flushes only the fresh re-mint', async () => {
    const patches: Array<Patch> = []
    const mutations: Array<MutationEvent> = []
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      readOnly: true,
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

    const firstRepairPatch = {
      type: 'set',
      path: [{_key: 'b0'}, 'children', 0, '_key'],
      value: 'k2',
      origin: 'local',
    }

    await vi.waitFor(() => {
      expect(patches).toEqual([firstRepairPatch])
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

    // The host echoes back a snapshot that never picked up the repair: `b0`
    // still carries its pre-repair keyless span. A fresh array (not the one
    // the editor last sent) with an unrelated second block makes this a new
    // value, so the machine reconciles it instead of no-opping.
    editor.send({
      type: 'update value',
      value: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_type: 'span', text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: 'b1',
          _type: 'block',
          children: [{_key: 's1', _type: 'span', text: 'world', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    const secondRepairPatch = {
      type: 'set',
      path: [{_key: 'b0'}, 'children', 0, '_key'],
      value: 'k3',
      origin: 'local',
    }

    await vi.waitFor(
      () => {
        expect(patches).toEqual([firstRepairPatch, secondRepairPatch])
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: 'b0',
            _type: 'block',
            children: [{_key: 'k3', _type: 'span', text: 'hello', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: 'b1',
            _type: 'block',
            children: [{_key: 's1', _type: 'span', text: 'world', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])
      },
      // The sync machine parks in `busy` while its own emitted mutation
      // flushes and re-checks on a 1s timer, so the re-mint can take a beat
      // over a second to land.
      {timeout: 5000},
    )

    editor.send({type: 'update readOnly', readOnly: false})

    await vi.waitFor(() => {
      expect(mutations.map((mutation) => mutation.patches)).toEqual([
        [secondRepairPatch],
      ])
    })
  })

  test('Scenario: a value queued during the streamed initial sync re-mints once the reentrant pass settles', async () => {
    const patches: Array<Patch> = []
    const mutations: Array<MutationEvent> = []
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      readOnly: true,
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

    // The initial sync streams its blocks, awaiting a tick before touching
    // the first one: sending a second still-broken value here, in the same
    // synchronous stretch as editor creation, reliably lands before that
    // tick fires and queues as the pending value the initial pass reenters
    // with once it settles.
    editor.send({
      type: 'update value',
      value: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_type: 'span', text: 'hello2', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    const firstRepairPatch = {
      type: 'set',
      path: [{_key: 'b0'}, 'children', 0, '_key'],
      value: 'k2',
      origin: 'local',
    }
    const secondRepairPatch = {
      type: 'set',
      path: [{_key: 'b0'}, 'children', 0, '_key'],
      value: 'k3',
      origin: 'local',
    }

    await vi.waitFor(() => {
      expect(patches).toEqual([firstRepairPatch, secondRepairPatch])
    })

    editor.send({type: 'update readOnly', readOnly: false})

    // The reentrant pass's own cull sees the first pass's repair as already
    // superseded (the block it targeted no longer matches this pass's
    // value) and drops it, same as a non-reentrant supersession; only the
    // fresh re-mint for the value that's actually current flushes.
    await vi.waitFor(() => {
      expect(mutations).toEqual([
        {
          type: 'mutation',
          patches: [secondRepairPatch],
          value: [
            {
              _key: 'b0',
              _type: 'block',
              children: [
                {_key: 'k3', _type: 'span', text: 'hello2', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('Scenario: a still-keyless echo of an already-repaired block re-mints on the next update value', async () => {
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

    const firstRepairPatch = {
      type: 'set',
      path: [{_key: 'b0'}, 'children', 0, '_key'],
      value: 'k2',
      origin: 'local',
    }

    await vi.waitFor(() => {
      expect(patches).toEqual([firstRepairPatch])
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

    // The host echoes back a snapshot that never picked up the repair: `b0`
    // still carries its pre-repair keyless span. A fresh array (not the
    // one the editor last sent) with an unrelated second block makes this
    // a new value, so the machine reconciles it instead of no-opping.
    editor.send({
      type: 'update value',
      value: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_type: 'span', text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: 'b1',
          _type: 'block',
          children: [{_key: 's1', _type: 'span', text: 'world', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    const secondRepairPatch = {
      type: 'set',
      path: [{_key: 'b0'}, 'children', 0, '_key'],
      value: 'k3',
      origin: 'local',
    }

    await vi.waitFor(
      () => {
        expect(patches).toEqual([firstRepairPatch, secondRepairPatch])
        expect(mutations.map((mutation) => mutation.patches)).toEqual([
          [firstRepairPatch],
          [secondRepairPatch],
        ])
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: 'b0',
            _type: 'block',
            children: [{_key: 'k3', _type: 'span', text: 'hello', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: 'b1',
            _type: 'block',
            children: [{_key: 's1', _type: 'span', text: 'world', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])
      },
      // The sync machine parks in `busy` while its own emitted mutation
      // flushes and re-checks on a 1s timer, so the re-mint can take a
      // beat over a second to land.
      {timeout: 5000},
    )
  })

  test('Scenario: a startup value with a duplicate sibling _key emits the re-mint patch immediately, before any local edit', async () => {
    const patches: Array<Patch> = []
    const mutations: Array<MutationEvent> = []
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {_key: 's0', _type: 'span', text: 'hello', marks: []},
            {_key: 's0', _type: 'span', text: ' world', marks: []},
          ],
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

    const repairPatch = {
      type: 'set',
      path: [{_key: 'b0'}, 'children', 1, '_key'],
      value: 'k2',
      origin: 'local',
    }

    await vi.waitFor(() => {
      expect(patches).toEqual([repairPatch])
      expect(mutations.map((mutation) => mutation.patches)).toEqual([
        [repairPatch],
      ])
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {_key: 's0', _type: 'span', text: 'hello', marks: []},
            {_key: 'k2', _type: 'span', text: ' world', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: a startup value with a keyless child in the second block emits the repair patch addressed to that block', async () => {
    const patches: Array<Patch> = []
    const mutations: Array<MutationEvent> = []
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
        {
          _key: 'b1',
          _type: 'block',
          children: [{_type: 'span', text: 'world', marks: []}],
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

    const repairPatch = {
      type: 'set',
      path: [{_key: 'b1'}, 'children', 0, '_key'],
      value: 'k2',
      origin: 'local',
    }

    await vi.waitFor(() => {
      expect(patches).toEqual([repairPatch])
      expect(mutations.map((mutation) => mutation.patches)).toEqual([
        [repairPatch],
      ])
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: 'b1',
          _type: 'block',
          children: [{_key: 'k2', _type: 'span', text: 'world', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    const initialValue = [
      {
        _key: 'b0',
        _type: 'block',
        children: [{_key: 's0', _type: 'span', text: 'hello', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _key: 'b1',
        _type: 'block',
        children: [{_type: 'span', text: 'world', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    expect(applyAll(initialValue, patches)).toEqual([
      initialValue[0],
      {
        _key: 'b1',
        _type: 'block',
        children: [{_key: 'k2', _type: 'span', text: 'world', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test("Scenario: a startup value with a keyless second block emits the repair patch addressed by that block's index, not the first block's", async () => {
    const patches: Array<Patch> = []
    const mutations: Array<MutationEvent> = []
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
        {
          _type: 'block',
          children: [{_key: 's1', _type: 'span', text: 'world', marks: []}],
          markDefs: [],
          style: 'normal',
        } as unknown as PortableTextBlock,
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

    const repairedBlock1 = {
      _key: 'k2',
      _type: 'block',
      children: [{_key: 's1', _type: 'span', text: 'world', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const repairPatch = {
      type: 'set',
      path: [1, '_key'],
      value: 'k2',
      origin: 'local',
    }

    await vi.waitFor(() => {
      expect(patches).toEqual([repairPatch])
      expect(mutations.map((mutation) => mutation.patches)).toEqual([
        [repairPatch],
      ])
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        repairedBlock1,
      ])
    })

    const initialValue: Array<PortableTextBlock> = [
      {
        _key: 'b0',
        _type: 'block',
        children: [{_key: 's0', _type: 'span', text: 'hello', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        children: [{_key: 's1', _type: 'span', text: 'world', marks: []}],
        markDefs: [],
        style: 'normal',
      } as unknown as PortableTextBlock,
    ]

    expect(applyAll(initialValue, patches)).toEqual([
      initialValue[0],
      repairedBlock1,
    ])
  })

  test('Scenario: replacing a whole value with the same block/span keys emits no patches', async () => {
    const patches: Array<Patch> = []
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
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

    editor.send({
      type: 'update value',
      value: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: 'foo!', marks: []}],
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
          children: [{_key: 's0', _type: 'span', text: 'foo!', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    const patchesAtSettle = [...patches]
    expect(patchesAtSettle).toEqual([])

    // "No patches were emitted" can't be trusted on a silent listener, so
    // prove the channel is live: a probe edit right after must still emit
    // its own patch.
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 4},
        focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 4},
      },
    })
    editor.send({type: 'insert.text', text: ' foo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: 'foo! foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'diffMatchPatch',
          path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('foo!', 'foo! foo'))),
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: Clearing synced value with an empty array', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
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
          children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    // The existing clearing scenarios all spell "empty" as `undefined`;
    // this pins that the `[]` shape clears a non-empty synced value too.
    editor.send({type: 'update value', value: []})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k2',
          _type: 'block',
          children: [{_key: 'k3', _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Clearing locally typed text with an empty array after the value echoed back', async () => {
    const mutations: Array<MutationEvent> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      ),
    })

    await userEvent.click(locator)
    await userEvent.type(locator, 'foo')

    // On slow CI the typed burst can run slower than the flush interval
    // and split across two mutations; wait for the latest one to carry
    // the whole typed text before echoing it back.
    await vi.waitFor(() => {
      expect(mutations.at(-1)?.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    // The controlled-host flow: the host receives the mutation and echoes
    // the value back down. After the echo the machine holds a non-empty
    // synced value, so a later `[]` is a genuine remote clear.
    editor.send({type: 'update value', value: mutations.at(-1)!.value})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({type: 'update value', value: []})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k2',
          _type: 'block',
          children: [{_key: 'k3', _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Stale `undefined` update does not clear locally typed text', async () => {
    const mutations: Array<MutationEvent> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      ),
    })

    await userEvent.click(locator)
    await userEvent.type(locator, 'foo')

    await vi.waitFor(() => {
      expect(mutations.length).toBeGreaterThan(0)
    })

    // The other spelling of the stale empty snapshot. Must behave exactly
    // like the `[]` shape: local text survives.
    editor.send({type: 'update value', value: undefined})

    await userEvent.type(locator, 'bar')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'foobar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Empty array update on a pristine editor keeps the placeholder', async () => {
    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
    })

    editor.send({type: 'update value', value: []})

    // The sentinel edit pins placeholder identity: if the `[]` had counted
    // as a remote change, the clear would have minted a fresh placeholder
    // block (`k2`/`k3`) and the typed text would land there.
    await userEvent.click(locator)
    await userEvent.type(locator, 'foo')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Stale empty array update does not clear locally typed text', async () => {
    const mutations: Array<MutationEvent> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      ),
    })

    await userEvent.click(locator)
    await userEvent.type(locator, 'foo')

    // Wait for the mutation flush so the sync machine is not busy and acts
    // on the incoming value right away.
    await vi.waitFor(() => {
      expect(mutations.length).toBeGreaterThan(0)
    })

    // A stale snapshot can present an empty field as `[]` even though the
    // editor mounted with `undefined` (observed in Studio after a dropped
    // listener connection). Both shapes mean "empty", so the update must
    // not count as a remote change that clears the locally typed text.
    editor.send({type: 'update value', value: []})

    await userEvent.type(locator, 'bar')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'foobar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })
})
