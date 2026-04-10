import type {Patch} from '@portabletext/patches'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema} from '../src'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

describe('normalization', () => {
  test('Scenario: spans with the same marks are merged', async () => {
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

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          ...block,
          children: [
            {
              ...block.children[0],
              text: 'foobar',
            },
            block.children[2],
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

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          ...block,
          children: [
            {
              ...block.children[0],
              text: 'foobar',
            },
            block.children[2],
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

  test('Scenario: selection is preserved when spans merge during normalization', async () => {
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

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: spanFooKey,
              text: 'foobar',
              marks: ['strong'],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanFooKey}],
          offset: 4,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanFooKey}],
          offset: 4,
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
})
