import type {Patch} from '@portabletext/patches'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema} from '../src'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

describe('normalization', () => {
  test('Scenario: adjacent same-mark spans merge as fallout of a local edit', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanFooKey = keyGenerator()
    const spanBarKey = keyGenerator()
    const spanBazKey = keyGenerator()
    const block = {
      _type: 'block',
      _key: blockKey,
      children: [
        {_type: 'span', _key: spanFooKey, text: 'foo', marks: ['strong']},
        {_type: 'span', _key: spanBarKey, text: 'bar', marks: ['strong']},
        {_type: 'span', _key: spanBazKey, text: 'baz', marks: []},
      ],
      markDefs: [],
      style: 'normal',
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block],
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
    })

    // Adopted structure is kept as-is; cosmetic canonicalization only runs
    // as fallout of locally authored edits.
    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([block])
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanBazKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanBazKey}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          ...block,
          children: [
            {
              ...block.children[0],
              text: 'foobar',
            },
            {...block.children[2], text: 'baz!'},
          ],
        },
      ])
    })
  })

  test('Scenario: marks equality is order independent', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanFooKey = keyGenerator()
    const spanBarKey = keyGenerator()
    const spanBazKey = keyGenerator()
    const block = {
      _type: 'block',
      _key: blockKey,
      children: [
        {_type: 'span', _key: spanFooKey, text: 'foo', marks: ['strong', 'em']},
        {_type: 'span', _key: spanBarKey, text: 'bar', marks: ['em', 'strong']},
        {_type: 'span', _key: spanBazKey, text: 'baz', marks: []},
      ],
      markDefs: [],
      style: 'normal',
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block],
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}, {name: 'em'}],
      }),
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanBazKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanBazKey}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          ...block,
          children: [
            {
              ...block.children[0],
              text: 'foobar',
            },
            {...block.children[2], text: 'baz!'},
          ],
        },
      ])
    })
  })

  test('Scenario: text blocks with no `children` get placeholder children', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          path: [{_key: 'k0'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'new-block',
              style: 'normal',
              markDefs: [],
            },
          ],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'new-block',
          children: [
            {
              _type: 'span',
              _key: 'k2',
              text: '',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: 'new-block'}, 'children'],
          value: [],
        },
        {
          type: 'setIfMissing',
          path: [{_key: 'new-block'}, 'children'],
          value: [],
        },
        {
          type: 'insert',
          path: [{_key: 'new-block'}, 'children', 0],
          position: 'before',
          items: [{_type: 'span', _key: 'k2', text: '', marks: []}],
        },
      ])
    })
  })

  test('Scenario: a block with missing `.children` in `initialValue` gets a placeholder span at adoption', async () => {
    const keyGenerator = createTestKeyGenerator()
    const initialValue = [
      {
        _key: 'abc',
        _type: 'block',
        style: 'normal',
        markDefs: [],
      },
      {
        _key: 'def',
        _type: 'block',
        style: 'normal',
        children: [],
        markDefs: [],
      },
    ]

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'abc',
          _type: 'block',
          children: [{_key: 'k2', _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: 'def',
          _type: 'block',
          children: [{_key: 'k3', _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: text blocks with empty `children` get placeholder children', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          path: [{_key: 'k0'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'new-block',
              children: [],
              style: 'normal',
              markDefs: [],
            },
          ],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'new-block',
          children: [
            {
              _type: 'span',
              _key: 'k2',
              text: '',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'setIfMissing',
          path: [{_key: 'new-block'}, 'children'],
          value: [],
        },
        {
          type: 'insert',
          path: [{_key: 'new-block'}, 'children', 0],
          position: 'before',
          items: [{_type: 'span', _key: 'k2', text: '', marks: []}],
        },
      ])
    })
  })

  test('Scenario: a mark with no resolvable decorator or annotation is preserved', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const initialValue = [
      {
        _key: blockKey,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: spanKey,
            _type: 'span',
            marks: ['ghi'],
            text: 'Hello',
          },
        ],
      },
    ]

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue,
    })

    editor.send({type: 'focus'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {
              _key: spanKey,
              _type: 'span',
              text: 'Hello',
              marks: ['ghi'],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: an orphaned markDef with no referencing span is removed', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const markDefKey = keyGenerator()
    const spanKey = keyGenerator()
    const initialValue = [
      {
        _key: blockKey,
        _type: 'block',
        style: 'normal',
        markDefs: [
          {
            _key: markDefKey,
            _type: 'link',
            href: 'https://sanity.io',
          },
        ],
        children: [
          {
            _key: spanKey,
            _type: 'span',
            marks: [],
            text: 'Hello',
          },
        ],
      },
    ]

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue,
    })

    editor.send({type: 'focus'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {
              _key: spanKey,
              _type: 'span',
              text: 'Hello',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: an undefined value adopts a placeholder block', async () => {
    const keyGenerator = createTestKeyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
    })

    editor.send({type: 'focus'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', marks: [], text: ''}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: an empty array of blocks adopts a placeholder block', async () => {
    const keyGenerator = createTestKeyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [],
    })

    editor.send({type: 'focus'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', marks: [], text: ''}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: a keyless child in a keyed block gets a minted key at adoption', async () => {
    const keyGenerator = createTestKeyGenerator()
    const initialValue = [
      {
        _key: 'abc',
        _type: 'block',
        children: [
          {
            _type: 'span',
            marks: [],
            text: 'Hello with a new key',
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ]

    const onEvent = vi.fn()

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue,
      children: <EventListenerPlugin on={onEvent} />,
    })

    await vi.waitFor(() => {
      expect(onEvent).toHaveBeenCalledWith({
        type: 'value changed',
        value: initialValue,
      })
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'abc',
          _type: 'block',
          children: [
            {
              _key: 'k2',
              _type: 'span',
              text: 'Hello with a new key',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: span with no `_key` gets a key', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: fooKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          position: 'after',
          items: [{_type: 'span', text: 'bar', marks: ['strong']}],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: fooKey, text: 'foo', marks: []},
            {_type: 'span', _key: 'k4', text: 'bar', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: 'k0'}, 'children', 1, '_key'],
          value: 'k4',
        },
      ])
    })
  })

  test('Scenario: keyless siblings from a wholesale children set each get a distinct minted key', async () => {
    const patches: Array<Patch> = []
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
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [
            {_type: 'span', text: 'bar', marks: []},
            {_type: 'span', text: 'baz', marks: []},
          ],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: 'k5', text: 'bar', marks: []},
            {_type: 'span', _key: 'k4', text: 'baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 1, '_key'],
          value: 'k4',
        },
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 0, '_key'],
          value: 'k5',
        },
      ])
    })
  })

  test('Scenario: keyless blocks with keyless children each get distinct minted keys', async () => {
    const patches: Array<Patch> = []
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
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    // A root-level set delivers two keyless blocks, each holding a keyless
    // span. The block segment of each span's dirty path is itself keyless,
    // so resolving it by "first sibling without a key" would send both
    // spans' mints into the first block.
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [],
          value: [
            {
              _type: 'block',
              children: [{_type: 'span', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              children: [{_type: 'span', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k7',
          children: [{_type: 'span', _key: 'k6', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k5',
          children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'set',
          path: [1, 'children', 0, '_key'],
          value: 'k4',
        },
        {
          type: 'set',
          path: [1, '_key'],
          value: 'k5',
        },
        {
          type: 'set',
          path: [0, 'children', 0, '_key'],
          value: 'k6',
        },
        {
          type: 'set',
          path: [0, '_key'],
          value: 'k7',
        },
      ])
    })
  })

  test('Scenario: siblings with an empty-string or non-string `_key` each get a distinct minted key', async () => {
    const patches: Array<Patch> = []
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
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [
            {_type: 'span', _key: '', text: 'bar', marks: []},
            {
              _type: 'span',
              _key: 42 as unknown as string,
              text: 'baz',
              marks: [],
            },
          ],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: 'k5', text: 'bar', marks: []},
            {_type: 'span', _key: 'k4', text: 'baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 1, '_key'],
          value: 'k4',
        },
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 0, '_key'],
          value: 'k5',
        },
      ])
    })
  })

  test('Scenario: block with no `_key` gets a key via numeric index', async () => {
    const patches: Array<Patch> = []
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
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          path: [{_key: blockKey}],
          position: 'after',
          items: [
            {
              _type: 'block',
              children: [{_type: 'span', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      snapshot: undefined,
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
        {
          _type: 'block',
          _key: 'k5',
          children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'set',
          path: [1, 'children', 0, '_key'],
          value: 'k4',
        },
        {
          type: 'set',
          path: [1, '_key'],
          value: 'k5',
        },
      ])
    })
  })

  test('Scenario: block object with no `_key` gets a key via numeric index', async () => {
    const patches: Array<Patch> = []
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
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          path: [{_key: blockKey}],
          position: 'after',
          items: [{_type: 'image', src: '/photo.jpg'}],
        },
      ],
      snapshot: undefined,
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
        {
          _type: 'image',
          _key: 'k4',
          src: '/photo.jpg',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'set',
          path: [1, '_key'],
          value: 'k4',
        },
      ])
    })
  })

  test('Scenario: spans with missing text get empty text', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    const blockAKey = keyGenerator()
    const spanAKey = keyGenerator()
    const blockBKey = keyGenerator()
    const spanBKey = keyGenerator()
    const newValue = [
      {
        _type: 'block',
        _key: blockAKey,
        children: [{_type: 'span', _key: spanAKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: blockBKey,
        children: [{_type: 'span', _key: spanBKey, marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [],
          value: newValue,
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        newValue.at(0),
        {
          ...newValue.at(1),
          children: [
            {
              ...newValue.at(1)?.children.at(0),
              text: '',
            },
          ],
        },
      ])

      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockBKey}, 'children', {_key: spanBKey}, 'text'],
          value: '',
        },
      ])
    })
  })

  test('Scenario: lonely span with no `text` gets an empty string', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          path: [{_key: 'k0'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: keyGenerator(),
              children: [{_type: 'span', _key: keyGenerator(), marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k2',
          children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      // expect(patches).toEqual([
      //   {
      //     type: 'set',
      //     path: [{_key: 'k0'}, 'children', 1, '_key'],
      //     value: 'k4',
      //   },
      // ])
    })
  })

  test('Scenario: selection is preserved when a remote marks change creates same-mark adjacency', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanFooKey = keyGenerator()
    const spanBarKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanFooKey, text: 'foo', marks: ['strong']},
            {_type: 'span', _key: spanBarKey, text: 'bar', marks: ['em']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}, {name: 'em'}],
      }),
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanBarKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanBarKey}],
          offset: 1,
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanBarKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanBarKey}],
          offset: 1,
        },
        backward: false,
      })
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanFooKey, text: 'foo', marks: ['strong']},
            {_type: 'span', _key: spanBarKey, text: 'bar', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    // Adopted structure is kept as-is (no merge on adoption), so the
    // caret's span survives untouched: no selection remapping needed.
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanFooKey, text: 'foo', marks: ['strong']},
            {_type: 'span', _key: spanBarKey, text: 'bar', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanBarKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanBarKey}],
          offset: 1,
        },
        backward: false,
      })
    })
  })

  test('Scenario: duplicate block `_key` is fixed via numeric index', async () => {
    const patches: Array<Patch> = []
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
          children: [{_type: 'span', _key: spanKey, text: 'first', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    // Insert a block with the same _key as the existing one
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          path: [{_key: blockKey}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: 'dup-span', text: 'second', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'first', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k4',
          children: [
            {_type: 'span', _key: 'dup-span', text: 'second', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'set',
          path: [1, '_key'],
          value: 'k4',
        },
      ])
    })
  })

  test('Scenario: three root blocks sharing a `_key` each end with a distinct key', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [],
          value: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k6',
          children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k7',
          children: [{_type: 'span', _key: bazSpanKey, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'set',
          path: [1, '_key'],
          value: 'k6',
        },
        {
          type: 'set',
          path: [2, '_key'],
          value: 'k7',
        },
      ])
    })
  })

  test('Scenario: three spans sharing a `_key` in one block each end with a distinct key', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
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
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [
            {_type: 'span', _key: spanKey, text: 'foo', marks: []},
            {_type: 'span', _key: spanKey, text: 'bar', marks: ['strong']},
            {_type: 'span', _key: spanKey, text: 'baz', marks: []},
          ],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'foo', marks: []},
            {_type: 'span', _key: 'k4', text: 'bar', marks: ['strong']},
            {_type: 'span', _key: 'k5', text: 'baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 1, '_key'],
          value: 'k4',
        },
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 2, '_key'],
          value: 'k5',
        },
      ])
    })
  })

  test('Scenario: a span and inline objects sharing a `_key` in one block each end with a distinct key', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [{name: 'stock-ticker'}],
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
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [
            {_type: 'span', _key: spanKey, text: 'foo', marks: []},
            {_type: 'stock-ticker', _key: spanKey},
            {_type: 'span', _key: spanKey, text: 'bar', marks: []},
            {_type: 'stock-ticker', _key: spanKey},
            {_type: 'span', _key: spanKey, text: 'baz', marks: []},
          ],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'foo', marks: []},
            {_type: 'stock-ticker', _key: 'k4'},
            {_type: 'span', _key: 'k5', text: 'bar', marks: []},
            {_type: 'stock-ticker', _key: 'k6'},
            {_type: 'span', _key: 'k7', text: 'baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 1, '_key'],
          value: 'k4',
        },
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 2, '_key'],
          value: 'k5',
        },
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 3, '_key'],
          value: 'k6',
        },
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 4, '_key'],
          value: 'k7',
        },
      ])
    })
  })

  test('Scenario: a span after duplicate-keyed spans still gets its missing `text`', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
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
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [
            {_type: 'span', _key: spanKey, text: 'foo', marks: []},
            {_type: 'span', _key: spanKey, text: 'bar', marks: ['strong']},
            {_type: 'span', _key: 's2', marks: []},
          ],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'foo', marks: []},
            {_type: 'span', _key: 'k4', text: 'bar', marks: ['strong']},
            {_type: 'span', _key: 's2', text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: 's2'}, 'text'],
          value: '',
        },
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 1, '_key'],
          value: 'k4',
        },
      ])
    })
  })

  test('Scenario: a block after duplicate-keyed blocks still gets its missing `children`', async () => {
    const patches: Array<Patch> = []
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
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [],
          value: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {_type: 'block', _key: 'b2', markDefs: [], style: 'normal'},
          ],
        },
      ],
      snapshot: undefined,
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
        {
          _type: 'block',
          _key: 'k5',
          children: [{_type: 'span', _key: spanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {type: 'set', path: [{_key: 'b2'}, 'children'], value: []},
        {type: 'setIfMissing', path: [{_key: 'b2'}, 'children'], value: []},
        {
          type: 'insert',
          path: [{_key: 'b2'}, 'children', 0],
          position: 'before',
          items: [{_type: 'span', _key: 'k4', text: '', marks: []}],
        },
        {type: 'set', path: [1, '_key'], value: 'k5'},
      ])
    })
  })

  test('Scenario: block with no `_type` gets the default block type', async () => {
    const patches: Array<Patch> = []
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
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'unset',
          path: [{_key: blockKey}, '_type'],
        },
      ],
      snapshot: undefined,
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
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, '_type'],
          value: 'block',
        },
      ])
    })
  })

  test('Scenario: span with `_type` unset gets the span type', async () => {
    const patches: Array<Patch> = []
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
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, '_type'],
        },
      ],
      snapshot: undefined,
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
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, '_type'],
          value: 'span',
        },
      ])
    })
  })

  test('Scenario: duplicate span `_key` in a text block is fixed via numeric index', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          position: 'after',
          items: [
            {_type: 'span', _key: spanKey, text: 'bar', marks: ['strong']},
          ],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'foo', marks: []},
            {_type: 'span', _key: 'k4', text: 'bar', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 1, '_key'],
          value: 'k4',
        },
      ])
    })
  })

  test('Scenario: adjacent inline objects get spans before, between and after them', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [{name: 'stock-ticker'}],
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
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [
            {_type: 'stock-ticker', _key: fooKey},
            {_type: 'stock-ticker', _key: barKey},
          ],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: 'k6', text: '', marks: []},
            {_type: 'stock-ticker', _key: fooKey},
            {_type: 'span', _key: 'k7', text: '', marks: []},
            {_type: 'stock-ticker', _key: barKey},
            {_type: 'span', _key: 'k8', text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'setIfMissing',
          path: [{_key: blockKey}, 'children'],
          value: [],
        },
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          position: 'before',
          items: [{_type: 'span', _key: 'k6', text: '', marks: []}],
        },
        {
          type: 'setIfMissing',
          path: [{_key: blockKey}, 'children'],
          value: [],
        },
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', {_key: barKey}],
          position: 'before',
          items: [{_type: 'span', _key: 'k7', text: '', marks: []}],
        },
        {
          type: 'setIfMissing',
          path: [{_key: blockKey}, 'children'],
          value: [],
        },
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', {_key: barKey}],
          position: 'after',
          items: [{_type: 'span', _key: 'k8', text: '', marks: []}],
        },
      ])
    })
  })

  test('Scenario: a span with non-string `text` gets an empty string', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockFooKey = keyGenerator()
    const spanFooKey = keyGenerator()
    const blockBarKey = keyGenerator()
    const spanBarKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: blockFooKey,
          children: [{_type: 'span', _key: spanFooKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBarKey,
          children: [{_type: 'span', _key: spanBarKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: blockBarKey}, 'children', {_key: spanBarKey}, 'text'],
          value: 42,
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockFooKey,
          children: [{_type: 'span', _key: spanFooKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBarKey,
          children: [{_type: 'span', _key: spanBarKey, text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockBarKey}, 'children', {_key: spanBarKey}, 'text'],
          value: '',
        },
      ])
    })
  })

  test('Scenario: one local edit merges spans and brackets the inline object they precede', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanFooKey = keyGenerator()
    const spanBarKey = keyGenerator()
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
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'set',
      at: [{_key: blockKey}, 'children'],
      value: [
        {_type: 'span', _key: spanFooKey, text: 'foo', marks: []},
        {_type: 'span', _key: spanBarKey, text: 'bar', marks: []},
        {_type: 'stock-ticker', _key: stockTickerKey},
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanFooKey, text: 'foobar', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey},
            {_type: 'span', _key: 'k7', text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [
            {_type: 'span', _key: spanFooKey, text: 'foo', marks: []},
            {_type: 'span', _key: spanBarKey, text: 'bar', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey},
          ],
        },
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: spanFooKey}, 'text'],
          value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
        },
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: spanBarKey}],
        },
        {
          type: 'setIfMissing',
          path: [{_key: blockKey}, 'children'],
          value: [],
        },
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
          position: 'after',
          items: [{_type: 'span', _key: 'k7', text: '', marks: []}],
        },
      ])
    })
  })

  test('Scenario: one local edit drops an empty span and brackets the inline object next to it', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanFooKey = keyGenerator()
    const spanEmptyKey = keyGenerator()
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
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'set',
      at: [{_key: blockKey}, 'children'],
      value: [
        {_type: 'span', _key: spanFooKey, text: 'foo', marks: []},
        {_type: 'span', _key: spanEmptyKey, text: '', marks: []},
        {_type: 'stock-ticker', _key: stockTickerKey},
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanFooKey, text: 'foo', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey},
            {_type: 'span', _key: 'k7', text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [
            {_type: 'span', _key: spanFooKey, text: 'foo', marks: []},
            {_type: 'span', _key: spanEmptyKey, text: '', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey},
          ],
        },
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: spanEmptyKey}],
        },
        {
          type: 'setIfMissing',
          path: [{_key: blockKey}, 'children'],
          value: [],
        },
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
          position: 'after',
          items: [{_type: 'span', _key: 'k7', text: '', marks: []}],
        },
      ])
    })
  })

  test('Scenario: one local edit brackets inline objects at both ends and merges the spans between them', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const stockTickerFooKey = keyGenerator()
    const spanFooKey = keyGenerator()
    const spanBarKey = keyGenerator()
    const spanBazKey = keyGenerator()
    const stockTickerBarKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [{name: 'stock-ticker'}],
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
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'set',
      at: [{_key: blockKey}, 'children'],
      value: [
        {_type: 'stock-ticker', _key: stockTickerFooKey},
        {_type: 'span', _key: spanFooKey, text: 'foo', marks: []},
        {_type: 'span', _key: spanBarKey, text: 'bar', marks: []},
        {_type: 'span', _key: spanBazKey, text: 'baz', marks: []},
        {_type: 'stock-ticker', _key: stockTickerBarKey},
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: 'k9', text: '', marks: []},
            {_type: 'stock-ticker', _key: stockTickerFooKey},
            {_type: 'span', _key: spanFooKey, text: 'foobarbaz', marks: []},
            {_type: 'stock-ticker', _key: stockTickerBarKey},
            {_type: 'span', _key: 'k10', text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [
            {_type: 'stock-ticker', _key: stockTickerFooKey},
            {_type: 'span', _key: spanFooKey, text: 'foo', marks: []},
            {_type: 'span', _key: spanBarKey, text: 'bar', marks: []},
            {_type: 'span', _key: spanBazKey, text: 'baz', marks: []},
            {_type: 'stock-ticker', _key: stockTickerBarKey},
          ],
        },
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: spanFooKey}, 'text'],
          value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
        },
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: spanBarKey}],
        },
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: spanFooKey}, 'text'],
          value: '@@ -1,6 +1,9 @@\n foobar\n+baz\n',
        },
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: spanBazKey}],
        },
        {
          type: 'setIfMissing',
          path: [{_key: blockKey}, 'children'],
          value: [],
        },
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', {_key: stockTickerFooKey}],
          position: 'before',
          items: [{_type: 'span', _key: 'k9', text: '', marks: []}],
        },
        {
          type: 'setIfMissing',
          path: [{_key: blockKey}, 'children'],
          value: [],
        },
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', {_key: stockTickerBarKey}],
          position: 'after',
          items: [{_type: 'span', _key: 'k10', text: '', marks: []}],
        },
      ])
    })
  })
  test('Scenario: one local edit drops an empty span with other marks and brackets the inline object after it', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanFooKey = keyGenerator()
    const spanEmptyKey = keyGenerator()
    const stockTickerKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        inlineObjects: [{name: 'stock-ticker'}],
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
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'set',
      at: [{_key: blockKey}, 'children'],
      value: [
        {_type: 'span', _key: spanFooKey, text: 'foo', marks: []},
        {_type: 'span', _key: spanEmptyKey, text: '', marks: ['strong']},
        {_type: 'stock-ticker', _key: stockTickerKey},
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanFooKey, text: 'foo', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey},
            {_type: 'span', _key: 'k7', text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [
            {_type: 'span', _key: spanFooKey, text: 'foo', marks: []},
            {_type: 'span', _key: spanEmptyKey, text: '', marks: ['strong']},
            {_type: 'stock-ticker', _key: stockTickerKey},
          ],
        },
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: spanEmptyKey}],
        },
        {
          type: 'setIfMissing',
          path: [{_key: blockKey}, 'children'],
          value: [],
        },
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
          position: 'after',
          items: [{_type: 'span', _key: 'k7', text: '', marks: []}],
        },
      ])
    })
  })

  test('Scenario: one local edit brackets inline objects at both ends and drops an empty span with other marks between them', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const stockTickerFooKey = keyGenerator()
    const spanEmptyKey = keyGenerator()
    const spanFooKey = keyGenerator()
    const stockTickerBarKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        inlineObjects: [{name: 'stock-ticker'}],
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
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'set',
      at: [{_key: blockKey}, 'children'],
      value: [
        {_type: 'stock-ticker', _key: stockTickerFooKey},
        {_type: 'span', _key: spanEmptyKey, text: '', marks: ['strong']},
        {_type: 'span', _key: spanFooKey, text: 'foo', marks: []},
        {_type: 'stock-ticker', _key: stockTickerBarKey},
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: 'k8', text: '', marks: []},
            {_type: 'stock-ticker', _key: stockTickerFooKey},
            {_type: 'span', _key: spanFooKey, text: 'foo', marks: []},
            {_type: 'stock-ticker', _key: stockTickerBarKey},
            {_type: 'span', _key: 'k9', text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [
            {_type: 'stock-ticker', _key: stockTickerFooKey},
            {_type: 'span', _key: spanEmptyKey, text: '', marks: ['strong']},
            {_type: 'span', _key: spanFooKey, text: 'foo', marks: []},
            {_type: 'stock-ticker', _key: stockTickerBarKey},
          ],
        },
        {
          type: 'setIfMissing',
          path: [{_key: blockKey}, 'children'],
          value: [],
        },
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', {_key: stockTickerFooKey}],
          position: 'before',
          items: [{_type: 'span', _key: 'k8', text: '', marks: []}],
        },
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: spanEmptyKey}],
        },
        {
          type: 'setIfMissing',
          path: [{_key: blockKey}, 'children'],
          value: [],
        },
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', {_key: stockTickerBarKey}],
          position: 'after',
          items: [{_type: 'span', _key: 'k9', text: '', marks: []}],
        },
      ])
    })
  })

  test('Scenario: undoing a local edit unsets the `_key` minted for a keyless span', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const blockBarKey = keyGenerator()
    const spanBarKeyInitial = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: blockBarKey,
        children: [
          {_type: 'span', _key: spanBarKeyInitial, text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue,
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'set',
      at: [{_key: blockKey}, 'children'],
      value: [{_type: 'span', text: 'bar', marks: []}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: 'k6', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBarKey,
          children: [
            {_type: 'span', _key: spanBarKeyInitial, text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [{_type: 'span', text: 'bar', marks: []}],
        },
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 0, '_key'],
          value: 'k6',
        },
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: 'k6'}, '_key'],
        },
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        },
      ])
    })
  })

  test('Scenario: undoing a local edit unsets the `_key` minted for a span with an empty `_key`', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const blockBarKey = keyGenerator()
    const spanBarKeyInitial = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: blockBarKey,
        children: [
          {_type: 'span', _key: spanBarKeyInitial, text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue,
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'set',
      at: [{_key: blockKey}, 'children'],
      value: [{_type: 'span', _key: '', text: 'bar', marks: []}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: 'k6', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBarKey,
          children: [
            {_type: 'span', _key: spanBarKeyInitial, text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [{_type: 'span', _key: '', text: 'bar', marks: []}],
        },
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 0, '_key'],
          value: 'k6',
        },
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: 'k6'}, '_key'],
        },
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        },
      ])
    })
  })

  test('Scenario: undoing a local edit unsets the `text` given to a span without `text`', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const blockBarKey = keyGenerator()
    const spanBarKeyInitial = keyGenerator()
    const spanBarKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: blockBarKey,
        children: [
          {_type: 'span', _key: spanBarKeyInitial, text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue,
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'set',
      at: [{_key: blockKey}, 'children'],
      value: [{_type: 'span', _key: spanBarKey, marks: []}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanBarKey, text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBarKey,
          children: [
            {_type: 'span', _key: spanBarKeyInitial, text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [{_type: 'span', _key: spanBarKey, marks: []}],
        },
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: spanBarKey}, 'text'],
          value: '',
        },
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: spanBarKey}, 'text'],
        },
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        },
      ])
    })
  })

  test('Scenario: undoing a local edit unsets the `text` that replaced non-string span `text`', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const blockBarKey = keyGenerator()
    const spanBarKeyInitial = keyGenerator()
    const spanBarKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: blockBarKey,
        children: [
          {_type: 'span', _key: spanBarKeyInitial, text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue,
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'set',
      at: [{_key: blockKey}, 'children'],
      value: [{_type: 'span', _key: spanBarKey, text: 1, marks: []}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanBarKey, text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBarKey,
          children: [
            {_type: 'span', _key: spanBarKeyInitial, text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [{_type: 'span', _key: spanBarKey, text: 1, marks: []}],
        },
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: spanBarKey}, 'text'],
          value: '',
        },
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: spanBarKey}, 'text'],
        },
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        },
      ])
    })
  })

  test('Scenario: undoing a local edit sets a renamed duplicate `_key` back to the original key', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const blockBarKey = keyGenerator()
    const spanBarKeyInitial = keyGenerator()
    const spanBarKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: blockBarKey,
        children: [
          {_type: 'span', _key: spanBarKeyInitial, text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue,
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'set',
      at: [{_key: blockKey}, 'children'],
      value: [
        {_type: 'span', _key: spanBarKey, text: 'foo', marks: []},
        {_type: 'span', _key: spanBarKey, text: 'bar', marks: ['strong']},
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanBarKey, text: 'foo', marks: []},
            {_type: 'span', _key: 'k7', text: 'bar', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBarKey,
          children: [
            {_type: 'span', _key: spanBarKeyInitial, text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [
            {_type: 'span', _key: spanBarKey, text: 'foo', marks: []},
            {_type: 'span', _key: spanBarKey, text: 'bar', marks: ['strong']},
          ],
        },
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 1, '_key'],
          value: 'k7',
        },
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: 'k7'}, '_key'],
          value: spanBarKey,
        },
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        },
      ])
    })
  })

  test('Scenario: undoing a local edit removes the span inserted into emptied `children`', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const blockBarKey = keyGenerator()
    const spanBarKeyInitial = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: blockBarKey,
        children: [
          {_type: 'span', _key: spanBarKeyInitial, text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue,
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({type: 'set', at: [{_key: blockKey}, 'children'], value: []})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: 'k6', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBarKey,
          children: [
            {_type: 'span', _key: spanBarKeyInitial, text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
      expect(patches).toEqual([
        {type: 'set', path: [{_key: blockKey}, 'children'], value: []},
        {type: 'setIfMissing', path: [{_key: blockKey}, 'children'], value: []},
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', 0],
          position: 'before',
          items: [{_type: 'span', _key: 'k6', text: '', marks: []}],
        },
        {type: 'unset', path: [{_key: blockKey}, 'children', {_key: 'k6'}]},
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        },
      ])
    })
  })

  test('Scenario: undoing a local edit unsets the `children` set on a block without `children`', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const blockBarKey = keyGenerator()
    const spanBarKeyInitial = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: blockBarKey,
        children: [
          {_type: 'span', _key: spanBarKeyInitial, text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue,
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({type: 'unset', at: [{_key: blockKey}, 'children']})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: 'k6', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBarKey,
          children: [
            {_type: 'span', _key: spanBarKeyInitial, text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
      expect(patches).toEqual([
        {type: 'unset', path: [{_key: blockKey}, 'children']},
        {type: 'set', path: [{_key: blockKey}, 'children'], value: []},
        {type: 'setIfMissing', path: [{_key: blockKey}, 'children'], value: []},
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', 0],
          position: 'before',
          items: [{_type: 'span', _key: 'k6', text: '', marks: []}],
        },
        {type: 'unset', path: [{_key: blockKey}, 'children', {_key: 'k6'}]},
        {type: 'unset', path: [{_key: blockKey}, 'children']},
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        },
      ])
    })
  })

  test('Scenario: undoing a local edit removes the spans inserted around an inline object', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const blockBarKey = keyGenerator()
    const spanBarKeyInitial = keyGenerator()
    const stockTickerKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: blockBarKey,
        children: [
          {_type: 'span', _key: spanBarKeyInitial, text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({inlineObjects: [{name: 'stock-ticker'}]}),
      initialValue,
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'set',
      at: [{_key: blockKey}, 'children'],
      value: [{_type: 'stock-ticker', _key: stockTickerKey}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: 'k7', text: '', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey},
            {_type: 'span', _key: 'k8', text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBarKey,
          children: [
            {_type: 'span', _key: spanBarKeyInitial, text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [{_type: 'stock-ticker', _key: stockTickerKey}],
        },
        {type: 'setIfMissing', path: [{_key: blockKey}, 'children'], value: []},
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
          position: 'before',
          items: [{_type: 'span', _key: 'k7', text: '', marks: []}],
        },
        {type: 'setIfMissing', path: [{_key: blockKey}, 'children'], value: []},
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
          position: 'after',
          items: [{_type: 'span', _key: 'k8', text: '', marks: []}],
        },
        {type: 'unset', path: [{_key: blockKey}, 'children', {_key: 'k8'}]},
        {type: 'unset', path: [{_key: blockKey}, 'children', {_key: 'k7'}]},
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        },
      ])
    })
  })

  test('Scenario: undoing a local edit unsets the `_type` given to a typeless text block child', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const blockBarKey = keyGenerator()
    const spanBarKeyInitial = keyGenerator()
    const spanBarKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: blockBarKey,
        children: [
          {_type: 'span', _key: spanBarKeyInitial, text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue,
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'set',
      at: [{_key: blockKey}, 'children'],
      value: [{_key: spanBarKey, text: 'bar', marks: []}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanBarKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBarKey,
          children: [
            {_type: 'span', _key: spanBarKeyInitial, text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [{_key: spanBarKey, text: 'bar', marks: []}],
        },
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: spanBarKey}, '_type'],
          value: 'span',
        },
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: spanBarKey}, '_type'],
        },
        {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        },
      ])
    })
  })
})
