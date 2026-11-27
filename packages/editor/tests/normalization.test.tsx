import {applyAll, type Patch, set} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import type {PortableTextEditor} from '../src/editor/PortableTextEditor'
import type {EditorEmittedEvent} from '../src/editor/relay'
import type {Path} from '../src/engine/interfaces/path'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {InternalPortableTextEditorRefPlugin} from '../src/plugins/plugin.internal.portable-text-editor-ref'
import {NodePlugin} from '../src/plugins/plugin.node'
import {
  defineBlockObject,
  defineContainer,
} from '../src/renderers/renderer.types'
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'apply',
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
          children: [
            {
              _key: 'k3',
              _type: 'span',
              marks: [],
              text: '',
            },
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: 'def',
          _type: 'block',
          children: [
            {
              _key: 'k2',
              _type: 'span',
              marks: [],
              text: '',
            },
          ],
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'apply',
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

  test('Scenario: an orphaned markDef with no referencing span is kept on entry', async () => {
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
          _key: 'k0',
          _type: 'block',
          children: [
            {
              _key: 'k2',
              _type: 'span',
              marks: [],
              text: 'Hello',
            },
          ],
          markDefs: [
            {
              _key: 'k1',
              _type: 'link',
              href: 'https://sanity.io',
            },
          ],
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
      expect(onEvent).toHaveBeenCalledWith({type: 'ready'})
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          position: 'after',
          items: [{_type: 'span', text: 'bar', marks: ['strong']}],
        },
      ],
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'apply',
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
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
      type: 'apply',
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'apply',
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'apply',
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [{_key: blockKey}],
          position: 'after',
          items: [{_type: 'image', src: '/photo.jpg'}],
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
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
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [],
          value: newValue,
        },
      ],
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'apply',
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
            }
          }}
        />
      ),
    })

    // Insert a block with the same _key as the existing one
    editor.send({
      type: 'apply',
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'apply',
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'apply',
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'apply',
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'apply',
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'apply',
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          path: [{_key: blockKey}, '_type'],
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, '_type'],
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'apply',
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'apply',
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [{_key: blockBarKey}, 'children', {_key: spanBarKey}, 'text'],
          value: 42,
        },
      ],
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
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
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: spanFooKey}, 'text'],
          value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
        },
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: spanBarKey}],
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
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
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: spanEmptyKey}],
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
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
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: spanEmptyKey}],
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
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
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: spanEmptyKey}],
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
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

  test('Scenario: undoing a local edit restores the empty `_key` it replaced', async () => {
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
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
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: 'k6'}, '_key'],
          value: '',
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
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

  test('Scenario: undoing a local edit restores the non-string span `text` it replaced', async () => {
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
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
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: spanBarKey}, 'text'],
          value: 1,
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
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
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                const {origin: _, ...patch} = changePatch
                patches.push(patch)
              }
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
  test('Scenario: a local edit removes every empty span in a long run', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const emptySpans = Array.from({length: 150}, (_, index) => ({
      _type: 'span',
      _key: keyGenerator(),
      text: '',
      marks: [index % 2 === 0 ? 'strong' : 'em'],
    }))
    const barKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: fooKey, text: 'foo', marks: []},
            ...emptySpans,
            {_type: 'span', _key: barKey, text: 'bar', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}, {name: 'em'}],
      }),
    })

    const point = {
      path: [{_key: blockKey}, 'children', {_key: fooKey}],
      offset: 3,
    }
    editor.send({type: 'select', at: {anchor: point, focus: point}})
    editor.send({type: 'insert.text', text: '!'})

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: fooKey, text: 'foo!', marks: []},
            {_type: 'span', _key: barKey, text: 'bar', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
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
    type: 'apply',
    patches: [
      set(
        ['strong'],
        [{_key: blockKey}, 'children', {_key: spanBarKey}, 'marks'],
      ),
    ],
  })

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

describe('normalization', () => {
  test('Scenario: a misplaced text block at root stays an object through Backspace and undo', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 6}, () => keyGenerator())
    const patches: Array<Patch> = []
    const initialValue = [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: keys[1]!,
            text: 'foo',
            marks: [],
          },
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: null,
          },
          {
            _type: 'span',
            _key: keys[4]!,
            text: 'baz',
            marks: [],
          },
        ],
      },
    ]
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
      children: (
        <>
          <NodePlugin
            nodes={[
              defineContainer({
                type: 'callout',
                arrayField: 'content',
                render: ({children}) => <>{children}</>,
              }),
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                for (const changePatch of event.patches) {
                  patches.push(changePatch)
                }
              }
            }}
          />
        </>
      ),
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: keys[0]!,
          style: 'normal',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: keys[1]!,
              text: 'foo',
              marks: [],
            },
            {
              _type: 'block',
              _key: keys[2]!,
              style: 'normal',
              markDefs: [],
              children: null,
            },
            {
              _type: 'span',
              _key: keys[4]!,
              text: 'baz',
              marks: [],
            },
          ],
        },
      ])
      expect(
        document.querySelector('[data-pt-inline="object"]')?.textContent,
      ).toEqual('\uFEFF[block: k2]')
      expect(patches).toEqual([])
    })
    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {
              _key: keys[0]!,
            },
            'children',
            {
              _key: keys[4]!,
            },
          ],
          offset: 0,
        },
        focus: {
          path: [
            {
              _key: keys[0]!,
            },
            'children',
            {
              _key: keys[4]!,
            },
          ],
          offset: 0,
        },
      },
    })
    await vi.waitFor(() =>
      expect(window.getSelection()?.focusNode?.textContent).toEqual('baz'),
    )
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: keys[0]!,
          style: 'normal',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: keys[1]!,
              text: 'foobaz',
              marks: [],
            },
          ],
        },
      ])
      expect(patches).toEqual([
        {
          type: 'unset',
          path: [
            {
              _key: keys[0]!,
            },
            'children',
            {
              _key: keys[2]!,
            },
          ],
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [
            {
              _key: keys[0]!,
            },
            'children',
            {
              _key: keys[1]!,
            },
            'text',
          ],
          value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
          origin: 'local',
        },
        {
          type: 'unset',
          path: [
            {
              _key: keys[0]!,
            },
            'children',
            {
              _key: keys[4]!,
            },
          ],
          origin: 'local',
        },
      ])
    })
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: keys[0]!,
          style: 'normal',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: keys[1]!,
              text: 'foo',
              marks: [],
            },
            {
              _type: 'block',
              _key: keys[2]!,
              style: 'normal',
              markDefs: [],
              children: null,
            },
            {
              _type: 'span',
              _key: keys[4]!,
              text: 'baz',
              marks: [],
            },
          ],
        },
      ])
      expect(patches).toEqual([
        {
          type: 'unset',
          path: [
            {
              _key: keys[0]!,
            },
            'children',
            {
              _key: keys[2]!,
            },
          ],
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [
            {
              _key: keys[0]!,
            },
            'children',
            {
              _key: keys[1]!,
            },
            'text',
          ],
          value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
          origin: 'local',
        },
        {
          type: 'unset',
          path: [
            {
              _key: keys[0]!,
            },
            'children',
            {
              _key: keys[4]!,
            },
          ],
          origin: 'local',
        },
        {
          type: 'setIfMissing',
          path: [
            {
              _key: keys[0]!,
            },
            'children',
          ],
          value: [],
          origin: 'local',
        },
        {
          type: 'insert',
          path: [
            {
              _key: keys[0]!,
            },
            'children',
            {
              _key: keys[1]!,
            },
          ],
          position: 'after',
          items: [
            {
              _type: 'span',
              _key: keys[4]!,
              text: 'baz',
              marks: [],
            },
          ],
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [
            {
              _key: keys[0]!,
            },
            'children',
            {
              _key: keys[1]!,
            },
            'text',
          ],
          value: '@@ -1,6 +1,3 @@\n foo\n-baz\n',
          origin: 'local',
        },
        {
          type: 'setIfMissing',
          path: [
            {
              _key: keys[0]!,
            },
            'children',
          ],
          value: [],
          origin: 'local',
        },
        {
          type: 'insert',
          path: [
            {
              _key: keys[0]!,
            },
            'children',
            {
              _key: keys[1]!,
            },
          ],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: keys[2]!,
              style: 'normal',
              markDefs: [],
              children: null,
            },
          ],
          origin: 'local',
        },
      ])
    })
    const line = document.querySelector('[data-pt-block="text"]')!
    const bounds = line.getBoundingClientRect()
    await userEvent.click(locator, {
      position: {x: bounds.width - 2, y: bounds.height / 2},
    })
    await expect.element(locator).toBeVisible()
  })

  test('Scenario: a collaborator span with number text at root keeps the next block editable', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 6}, () => keyGenerator())
    const patches: Array<Patch> = []
    const initialValue = [
      {
        _type: 'block',
        _key: keys[1]!,
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: keys[2]!,
            text: 'bar',
            marks: [],
          },
        ],
      },
    ]
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
      children: (
        <>
          <NodePlugin
            nodes={[
              defineContainer({
                type: 'callout',
                arrayField: 'content',
                render: ({children}) => <>{children}</>,
              }),
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                for (const changePatch of event.patches) {
                  patches.push(changePatch)
                }
              }
            }}
          />
        </>
      ),
    })
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [
            {
              _key: keys[1]!,
            },
          ],
          position: 'before',
          items: [
            {
              _type: 'span',
              _key: keys[0]!,
              marks: [],
              text: 123,
            },
          ],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'span',
          _key: keys[0]!,
          marks: [],
          text: 123,
        },
        {
          _type: 'block',
          _key: keys[1]!,
          style: 'normal',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: keys[2]!,
              text: 'bar',
              marks: [],
            },
          ],
        },
      ])
      expect(
        document.querySelector('[data-pt-block="object"]')?.textContent,
      ).toEqual('\uFEFF[span: k0]')
      expect(patches).toEqual([])
    })
    await expect.element(locator).toBeVisible()
    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {
              _key: keys[1]!,
            },
            'children',
            {
              _key: keys[2]!,
            },
          ],
          offset: 3,
        },
        focus: {
          path: [
            {
              _key: keys[1]!,
            },
            'children',
            {
              _key: keys[2]!,
            },
          ],
          offset: 3,
        },
      },
    })
    await vi.waitFor(() =>
      expect(window.getSelection()?.focusOffset).toEqual(3),
    )
    await userEvent.keyboard('x')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'span',
          _key: keys[0]!,
          marks: [],
          text: 123,
        },
        {
          _type: 'block',
          _key: keys[1]!,
          style: 'normal',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: keys[2]!,
              text: 'barx',
              marks: [],
            },
          ],
        },
      ])
      expect(patches).toEqual([
        {
          type: 'diffMatchPatch',
          origin: 'local',
          path: [
            {
              _key: keys[1]!,
            },
            'children',
            {
              _key: keys[2]!,
            },
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n bar\n+x\n',
        },
      ])
    })
    await expect.element(locator).toBeVisible()
  })

  test('Scenario: a collaborator span with string text at root keeps the next block editable', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 6}, () => keyGenerator())
    const patches: Array<Patch> = []
    const initialValue = [
      {
        _type: 'block',
        _key: keys[1]!,
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: keys[2]!,
            text: 'bar',
            marks: [],
          },
        ],
      },
    ]
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
      children: (
        <>
          <NodePlugin
            nodes={[
              defineContainer({
                type: 'callout',
                arrayField: 'content',
                render: ({children}) => <>{children}</>,
              }),
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                for (const changePatch of event.patches) {
                  patches.push(changePatch)
                }
              }
            }}
          />
        </>
      ),
    })
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [
            {
              _key: keys[1]!,
            },
          ],
          position: 'before',
          items: [
            {
              _type: 'span',
              _key: keys[0]!,
              marks: [],
              text: 'foo',
            },
          ],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'span',
          _key: keys[0]!,
          marks: [],
          text: 'foo',
        },
        {
          _type: 'block',
          _key: keys[1]!,
          style: 'normal',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: keys[2]!,
              text: 'bar',
              marks: [],
            },
          ],
        },
      ])
      expect(
        document.querySelector('[data-pt-block="object"]')?.textContent,
      ).toEqual('\uFEFF[span: k0]')
      expect(patches).toEqual([])
    })
    await expect.element(locator).toBeVisible()
    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {
              _key: keys[1]!,
            },
            'children',
            {
              _key: keys[2]!,
            },
          ],
          offset: 3,
        },
        focus: {
          path: [
            {
              _key: keys[1]!,
            },
            'children',
            {
              _key: keys[2]!,
            },
          ],
          offset: 3,
        },
      },
    })
    await vi.waitFor(() =>
      expect(window.getSelection()?.focusOffset).toEqual(3),
    )
    await userEvent.keyboard('x')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'span',
          _key: keys[0]!,
          marks: [],
          text: 'foo',
        },
        {
          _type: 'block',
          _key: keys[1]!,
          style: 'normal',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: keys[2]!,
              text: 'barx',
              marks: [],
            },
          ],
        },
      ])
      expect(patches).toEqual([
        {
          type: 'diffMatchPatch',
          origin: 'local',
          path: [
            {
              _key: keys[1]!,
            },
            'children',
            {
              _key: keys[2]!,
            },
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n bar\n+x\n',
        },
      ])
    })
    await expect.element(locator).toBeVisible()
  })

  test('Scenario: a misplaced text block at callout1 stays an object through Backspace and undo', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 6}, () => keyGenerator())
    const patches: Array<Patch> = []
    const initialValue = [
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'block',
            _key: keys[0]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[1]!,
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: keys[2]!,
                style: 'normal',
                markDefs: [],
                children: null,
              },
              {
                _type: 'span',
                _key: keys[4]!,
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ]
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
      children: (
        <>
          <NodePlugin
            nodes={[
              defineContainer({
                type: 'callout',
                arrayField: 'content',
                render: ({children}) => <>{children}</>,
              }),
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                for (const changePatch of event.patches) {
                  patches.push(changePatch)
                }
              }
            }}
          />
        </>
      ),
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'block',
              _key: keys[0]!,
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: keys[1]!,
                  text: 'foo',
                  marks: [],
                },
                {
                  _type: 'block',
                  _key: keys[2]!,
                  style: 'normal',
                  markDefs: [],
                  children: null,
                },
                {
                  _type: 'span',
                  _key: keys[4]!,
                  text: 'baz',
                  marks: [],
                },
              ],
            },
          ],
        },
      ])
      expect(
        document.querySelector('[data-pt-inline="object"]')?.textContent,
      ).toEqual('\uFEFF[block: k2]')
      expect(patches).toEqual([])
    })
    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {
              _key: keys[5]!,
            },
            'content',
            {
              _key: keys[0]!,
            },
            'children',
            {
              _key: keys[4]!,
            },
          ],
          offset: 0,
        },
        focus: {
          path: [
            {
              _key: keys[5]!,
            },
            'content',
            {
              _key: keys[0]!,
            },
            'children',
            {
              _key: keys[4]!,
            },
          ],
          offset: 0,
        },
      },
    })
    await vi.waitFor(() =>
      expect(window.getSelection()?.focusNode?.textContent).toEqual('baz'),
    )
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'block',
              _key: keys[0]!,
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: keys[1]!,
                  text: 'foobaz',
                  marks: [],
                },
              ],
            },
          ],
        },
      ])
      expect(patches).toEqual([
        {
          type: 'unset',
          path: [
            {
              _key: keys[5]!,
            },
            'content',
            {
              _key: keys[0]!,
            },
            'children',
            {
              _key: keys[2]!,
            },
          ],
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [
            {
              _key: keys[5]!,
            },
            'content',
            {
              _key: keys[0]!,
            },
            'children',
            {
              _key: keys[1]!,
            },
            'text',
          ],
          value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
          origin: 'local',
        },
        {
          type: 'unset',
          path: [
            {
              _key: keys[5]!,
            },
            'content',
            {
              _key: keys[0]!,
            },
            'children',
            {
              _key: keys[4]!,
            },
          ],
          origin: 'local',
        },
      ])
    })
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'block',
              _key: keys[0]!,
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: keys[1]!,
                  text: 'foo',
                  marks: [],
                },
                {
                  _type: 'block',
                  _key: keys[2]!,
                  style: 'normal',
                  markDefs: [],
                  children: null,
                },
                {
                  _type: 'span',
                  _key: keys[4]!,
                  text: 'baz',
                  marks: [],
                },
              ],
            },
          ],
        },
      ])
      expect(patches).toEqual([
        {
          type: 'unset',
          path: [
            {
              _key: keys[5]!,
            },
            'content',
            {
              _key: keys[0]!,
            },
            'children',
            {
              _key: keys[2]!,
            },
          ],
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [
            {
              _key: keys[5]!,
            },
            'content',
            {
              _key: keys[0]!,
            },
            'children',
            {
              _key: keys[1]!,
            },
            'text',
          ],
          value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
          origin: 'local',
        },
        {
          type: 'unset',
          path: [
            {
              _key: keys[5]!,
            },
            'content',
            {
              _key: keys[0]!,
            },
            'children',
            {
              _key: keys[4]!,
            },
          ],
          origin: 'local',
        },
        {
          type: 'setIfMissing',
          path: [
            {
              _key: keys[5]!,
            },
            'content',
            {
              _key: keys[0]!,
            },
            'children',
          ],
          value: [],
          origin: 'local',
        },
        {
          type: 'insert',
          path: [
            {
              _key: keys[5]!,
            },
            'content',
            {
              _key: keys[0]!,
            },
            'children',
            {
              _key: keys[1]!,
            },
          ],
          position: 'after',
          items: [
            {
              _type: 'span',
              _key: keys[4]!,
              text: 'baz',
              marks: [],
            },
          ],
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [
            {
              _key: keys[5]!,
            },
            'content',
            {
              _key: keys[0]!,
            },
            'children',
            {
              _key: keys[1]!,
            },
            'text',
          ],
          value: '@@ -1,6 +1,3 @@\n foo\n-baz\n',
          origin: 'local',
        },
        {
          type: 'setIfMissing',
          path: [
            {
              _key: keys[5]!,
            },
            'content',
            {
              _key: keys[0]!,
            },
            'children',
          ],
          value: [],
          origin: 'local',
        },
        {
          type: 'insert',
          path: [
            {
              _key: keys[5]!,
            },
            'content',
            {
              _key: keys[0]!,
            },
            'children',
            {
              _key: keys[1]!,
            },
          ],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: keys[2]!,
              style: 'normal',
              markDefs: [],
              children: null,
            },
          ],
          origin: 'local',
        },
      ])
    })
    const line = document.querySelector('[data-pt-block="text"]')!
    const bounds = line.getBoundingClientRect()
    await userEvent.click(locator, {
      position: {x: bounds.width - 2, y: bounds.height / 2},
    })
    await expect.element(locator).toBeVisible()
  })

  test('Scenario: a collaborator span with number text at callout1 keeps the next block editable', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 6}, () => keyGenerator())
    const patches: Array<Patch> = []
    const initialValue = [
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'block',
            _key: keys[1]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[2]!,
                text: 'bar',
                marks: [],
              },
            ],
          },
        ],
      },
    ]
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
      children: (
        <>
          <NodePlugin
            nodes={[
              defineContainer({
                type: 'callout',
                arrayField: 'content',
                render: ({children}) => <>{children}</>,
              }),
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                for (const changePatch of event.patches) {
                  patches.push(changePatch)
                }
              }
            }}
          />
        </>
      ),
    })
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [
            {
              _key: keys[5]!,
            },
            'content',
            {
              _key: keys[1]!,
            },
          ],
          position: 'before',
          items: [
            {
              _type: 'span',
              _key: keys[0]!,
              marks: [],
              text: 123,
            },
          ],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'span',
              _key: keys[0]!,
              marks: [],
              text: 123,
            },
            {
              _type: 'block',
              _key: keys[1]!,
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: keys[2]!,
                  text: 'bar',
                  marks: [],
                },
              ],
            },
          ],
        },
      ])
      expect(
        document.querySelector('[data-pt-block="object"]')?.textContent,
      ).toEqual('\uFEFF[span: k0]')
      expect(patches).toEqual([])
    })
    await expect.element(locator).toBeVisible()
    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {
              _key: keys[5]!,
            },
            'content',
            {
              _key: keys[1]!,
            },
            'children',
            {
              _key: keys[2]!,
            },
          ],
          offset: 3,
        },
        focus: {
          path: [
            {
              _key: keys[5]!,
            },
            'content',
            {
              _key: keys[1]!,
            },
            'children',
            {
              _key: keys[2]!,
            },
          ],
          offset: 3,
        },
      },
    })
    await vi.waitFor(() =>
      expect(window.getSelection()?.focusOffset).toEqual(3),
    )
    await userEvent.keyboard('x')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'span',
              _key: keys[0]!,
              marks: [],
              text: 123,
            },
            {
              _type: 'block',
              _key: keys[1]!,
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: keys[2]!,
                  text: 'barx',
                  marks: [],
                },
              ],
            },
          ],
        },
      ])
      expect(patches).toEqual([
        {
          type: 'diffMatchPatch',
          origin: 'local',
          path: [
            {
              _key: keys[5]!,
            },
            'content',
            {
              _key: keys[1]!,
            },
            'children',
            {
              _key: keys[2]!,
            },
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n bar\n+x\n',
        },
      ])
    })
    await expect.element(locator).toBeVisible()
  })

  test('Scenario: a collaborator span with string text at callout1 keeps the next block editable', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 6}, () => keyGenerator())
    const patches: Array<Patch> = []
    const initialValue = [
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'block',
            _key: keys[1]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[2]!,
                text: 'bar',
                marks: [],
              },
            ],
          },
        ],
      },
    ]
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
      children: (
        <>
          <NodePlugin
            nodes={[
              defineContainer({
                type: 'callout',
                arrayField: 'content',
                render: ({children}) => <>{children}</>,
              }),
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                for (const changePatch of event.patches) {
                  patches.push(changePatch)
                }
              }
            }}
          />
        </>
      ),
    })
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [
            {
              _key: keys[5]!,
            },
            'content',
            {
              _key: keys[1]!,
            },
          ],
          position: 'before',
          items: [
            {
              _type: 'span',
              _key: keys[0]!,
              marks: [],
              text: 'foo',
            },
          ],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'span',
              _key: keys[0]!,
              marks: [],
              text: 'foo',
            },
            {
              _type: 'block',
              _key: keys[1]!,
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: keys[2]!,
                  text: 'bar',
                  marks: [],
                },
              ],
            },
          ],
        },
      ])
      expect(
        document.querySelector('[data-pt-block="object"]')?.textContent,
      ).toEqual('\uFEFF[span: k0]')
      expect(patches).toEqual([])
    })
    await expect.element(locator).toBeVisible()
    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {
              _key: keys[5]!,
            },
            'content',
            {
              _key: keys[1]!,
            },
            'children',
            {
              _key: keys[2]!,
            },
          ],
          offset: 3,
        },
        focus: {
          path: [
            {
              _key: keys[5]!,
            },
            'content',
            {
              _key: keys[1]!,
            },
            'children',
            {
              _key: keys[2]!,
            },
          ],
          offset: 3,
        },
      },
    })
    await vi.waitFor(() =>
      expect(window.getSelection()?.focusOffset).toEqual(3),
    )
    await userEvent.keyboard('x')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'span',
              _key: keys[0]!,
              marks: [],
              text: 'foo',
            },
            {
              _type: 'block',
              _key: keys[1]!,
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: keys[2]!,
                  text: 'barx',
                  marks: [],
                },
              ],
            },
          ],
        },
      ])
      expect(patches).toEqual([
        {
          type: 'diffMatchPatch',
          origin: 'local',
          path: [
            {
              _key: keys[5]!,
            },
            'content',
            {
              _key: keys[1]!,
            },
            'children',
            {
              _key: keys[2]!,
            },
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n bar\n+x\n',
        },
      ])
    })
    await expect.element(locator).toBeVisible()
  })

  const straySpanSchema = defineSchema({
    blockObjects: [
      {name: 'row'},
      {
        name: 'callout',
        fields: [
          {
            name: 'content',
            type: 'array',
            of: [{type: 'block'}, {type: 'callout'}],
          },
        ],
      },
      {
        name: 'table',
        fields: [
          {
            name: 'rows',
            type: 'array',
            of: [
              {
                type: 'object',
                name: 'row',
                fields: [
                  {
                    name: 'cells',
                    type: 'array',
                    of: [
                      {
                        type: 'object',
                        name: 'cell',
                        fields: [
                          {
                            name: 'content',
                            type: 'array',
                            of: [{type: 'block'}],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  })

  const straySpanTableContainers = [
    defineContainer({
      type: 'table',
      arrayField: 'rows',
      render: ({children}) => <>{children}</>,
    }),
    defineContainer({
      type: 'row',
      arrayField: 'cells',
      render: ({children}) => <>{children}</>,
    }),
    defineContainer({
      type: 'cell',
      arrayField: 'content',
      render: ({children}) => <>{children}</>,
    }),
  ]

  const straySpanCalloutContainers = [
    defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({children}) => <>{children}</>,
    }),
  ]

  const straySpanSelectableObject = defineBlockObject({
    type: '*',
    render: (props) =>
      props.renderDefault({
        ...props,
        attributes: {...props.attributes, 'data-selected': props.selected},
      }),
  })

  test('Scenario: callout span through start value stays an object while typing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 8}, () => keyGenerator())
    const events: Array<EditorEmittedEvent> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: straySpanSchema,
      initialValue: [
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'block',
              _key: keys[0]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
              ],
            },
            {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
            {
              _type: 'block',
              _key: keys[3]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
              ],
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin
            nodes={[...straySpanTableContainers, ...straySpanCalloutContainers]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })
    expect(keys).toEqual([
      keys[0]!,
      keys[1]!,
      keys[2]!,
      keys[3]!,
      keys[4]!,
      keys[5]!,
      keys[6]!,
      keys[7]!,
    ])

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'block',
              _key: keys[0]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
              ],
            },
            {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
            {
              _type: 'block',
              _key: keys[3]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
              ],
            },
          ],
        },
      ])
      expect(locator.element().getAttribute('contenteditable')).toEqual('true')
      expect(locator.element().textContent).toEqual('foo\uFEFF[span: k2]baz')
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-pt-block="object"]'),
          (element) => element.textContent,
        ),
      ).toEqual(['\uFEFF[span: k2]'])
    })
    locator.element().focus()
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
          ],
          offset: 3,
        },
      },
    })
    await vi.waitFor(() => {
      expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
      expect(window.getSelection()?.focusOffset).toEqual(3)
    })
    await userEvent.type(locator, 'x', {skipClick: true})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'block',
              _key: keys[0]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foox', marks: []},
              ],
            },
            {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
            {
              _type: 'block',
              _key: keys[3]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
              ],
            },
          ],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'diffMatchPatch',
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: a span a collaborator inserts into a callout stays an object while typing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 8}, () => keyGenerator())
    const events: Array<EditorEmittedEvent> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: straySpanSchema,
      initialValue: [
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'block',
              _key: keys[0]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
              ],
            },
            {
              _type: 'block',
              _key: keys[3]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
              ],
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin
            nodes={[...straySpanTableContainers, ...straySpanCalloutContainers]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })
    expect(keys).toEqual([
      keys[0]!,
      keys[1]!,
      keys[2]!,
      keys[3]!,
      keys[4]!,
      keys[5]!,
      keys[6]!,
      keys[7]!,
    ])
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [{_key: keys[5]!}, 'content', {_key: keys[0]!}],
          position: 'after',
          items: [{_type: 'span', _key: keys[2]!, text: 'bar', marks: []}],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'block',
              _key: keys[0]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
              ],
            },
            {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
            {
              _type: 'block',
              _key: keys[3]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
              ],
            },
          ],
        },
      ])
      expect(locator.element().getAttribute('contenteditable')).toEqual('true')
      expect(locator.element().textContent).toEqual('foo\uFEFF[span: k2]baz')
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-pt-block="object"]'),
          (element) => element.textContent,
        ),
      ).toEqual(['\uFEFF[span: k2]'])
    })
    locator.element().focus()
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
          ],
          offset: 3,
        },
      },
    })
    await vi.waitFor(() => {
      expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
      expect(window.getSelection()?.focusOffset).toEqual(3)
    })
    await userEvent.type(locator, 'x', {skipClick: true})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'block',
              _key: keys[0]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foox', marks: []},
              ],
            },
            {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
            {
              _type: 'block',
              _key: keys[3]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
              ],
            },
          ],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'diffMatchPatch',
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: callout span through remote container stays an object while typing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 8}, () => keyGenerator())
    const events: Array<EditorEmittedEvent> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: straySpanSchema,
      initialValue: [
        {
          _type: 'block',
          _key: keys[0]!,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
        },
      ],
      children: (
        <>
          <NodePlugin
            nodes={[...straySpanTableContainers, ...straySpanCalloutContainers]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })
    expect(keys).toEqual([
      keys[0]!,
      keys[1]!,
      keys[2]!,
      keys[3]!,
      keys[4]!,
      keys[5]!,
      keys[6]!,
      keys[7]!,
    ])
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [{_key: keys[0]!}],
          position: 'after',
          items: [
            {
              _type: 'callout',
              _key: keys[5]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[0]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                  ],
                },
                {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
                {
                  _type: 'block',
                  _key: keys[3]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                  ],
                },
              ],
            },
          ],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: keys[0]!,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
        },
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'block',
              _key: keys[0]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
              ],
            },
            {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
            {
              _type: 'block',
              _key: keys[3]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
              ],
            },
          ],
        },
      ])
      expect(locator.element().getAttribute('contenteditable')).toEqual('true')
      expect(locator.element().textContent).toEqual('foofoo\uFEFF[span: k2]baz')
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-pt-block="object"]'),
          (element) => element.textContent,
        ),
      ).toEqual(['\uFEFF[span: k2]'])
    })
    locator.element().focus()
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
          ],
          offset: 3,
        },
      },
    })
    await vi.waitFor(() => {
      expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
      expect(window.getSelection()?.focusOffset).toEqual(3)
    })
    await userEvent.type(locator, 'x', {skipClick: true})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: keys[0]!,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
        },
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'block',
              _key: keys[0]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foox', marks: []},
              ],
            },
            {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
            {
              _type: 'block',
              _key: keys[3]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
              ],
            },
          ],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'diffMatchPatch',
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: nested callout span through start value stays an object while typing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 8}, () => keyGenerator())
    const events: Array<EditorEmittedEvent> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: straySpanSchema,
      initialValue: [
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'callout',
              _key: keys[6]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[0]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                  ],
                },
                {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
                {
                  _type: 'block',
                  _key: keys[3]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin
            nodes={[...straySpanTableContainers, ...straySpanCalloutContainers]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })
    expect(keys).toEqual([
      keys[0]!,
      keys[1]!,
      keys[2]!,
      keys[3]!,
      keys[4]!,
      keys[5]!,
      keys[6]!,
      keys[7]!,
    ])

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'callout',
              _key: keys[6]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[0]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                  ],
                },
                {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
                {
                  _type: 'block',
                  _key: keys[3]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ])
      expect(locator.element().getAttribute('contenteditable')).toEqual('true')
      expect(locator.element().textContent).toEqual('foo\uFEFF[span: k2]baz')
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-pt-block="object"]'),
          (element) => element.textContent,
        ),
      ).toEqual(['\uFEFF[span: k2]'])
    })
    locator.element().focus()
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[6]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[6]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
          ],
          offset: 3,
        },
      },
    })
    await vi.waitFor(() => {
      expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
      expect(window.getSelection()?.focusOffset).toEqual(3)
    })
    await userEvent.type(locator, 'x', {skipClick: true})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'callout',
              _key: keys[6]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[0]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[1]!, text: 'foox', marks: []},
                  ],
                },
                {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
                {
                  _type: 'block',
                  _key: keys[3]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'diffMatchPatch',
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[6]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: nested callout span through remote span stays an object while typing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 8}, () => keyGenerator())
    const events: Array<EditorEmittedEvent> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: straySpanSchema,
      initialValue: [
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'callout',
              _key: keys[6]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[0]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                  ],
                },
                {
                  _type: 'block',
                  _key: keys[3]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin
            nodes={[...straySpanTableContainers, ...straySpanCalloutContainers]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })
    expect(keys).toEqual([
      keys[0]!,
      keys[1]!,
      keys[2]!,
      keys[3]!,
      keys[4]!,
      keys[5]!,
      keys[6]!,
      keys[7]!,
    ])
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[6]!},
            'content',
            {_key: keys[0]!},
          ],
          position: 'after',
          items: [{_type: 'span', _key: keys[2]!, text: 'bar', marks: []}],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'callout',
              _key: keys[6]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[0]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                  ],
                },
                {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
                {
                  _type: 'block',
                  _key: keys[3]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ])
      expect(locator.element().getAttribute('contenteditable')).toEqual('true')
      expect(locator.element().textContent).toEqual('foo\uFEFF[span: k2]baz')
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-pt-block="object"]'),
          (element) => element.textContent,
        ),
      ).toEqual(['\uFEFF[span: k2]'])
    })
    locator.element().focus()
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[6]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[6]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
          ],
          offset: 3,
        },
      },
    })
    await vi.waitFor(() => {
      expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
      expect(window.getSelection()?.focusOffset).toEqual(3)
    })
    await userEvent.type(locator, 'x', {skipClick: true})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'callout',
              _key: keys[6]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[0]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[1]!, text: 'foox', marks: []},
                  ],
                },
                {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
                {
                  _type: 'block',
                  _key: keys[3]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'diffMatchPatch',
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[6]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: nested callout span through remote container stays an object while typing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 8}, () => keyGenerator())
    const events: Array<EditorEmittedEvent> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: straySpanSchema,
      initialValue: [
        {
          _type: 'block',
          _key: keys[0]!,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
        },
      ],
      children: (
        <>
          <NodePlugin
            nodes={[...straySpanTableContainers, ...straySpanCalloutContainers]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })
    expect(keys).toEqual([
      keys[0]!,
      keys[1]!,
      keys[2]!,
      keys[3]!,
      keys[4]!,
      keys[5]!,
      keys[6]!,
      keys[7]!,
    ])
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [{_key: keys[0]!}],
          position: 'after',
          items: [
            {
              _type: 'callout',
              _key: keys[5]!,
              content: [
                {
                  _type: 'callout',
                  _key: keys[6]!,
                  content: [
                    {
                      _type: 'block',
                      _key: keys[0]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                      ],
                    },
                    {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
                    {
                      _type: 'block',
                      _key: keys[3]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: keys[0]!,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
        },
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'callout',
              _key: keys[6]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[0]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                  ],
                },
                {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
                {
                  _type: 'block',
                  _key: keys[3]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ])
      expect(locator.element().getAttribute('contenteditable')).toEqual('true')
      expect(locator.element().textContent).toEqual('foofoo\uFEFF[span: k2]baz')
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-pt-block="object"]'),
          (element) => element.textContent,
        ),
      ).toEqual(['\uFEFF[span: k2]'])
    })
    locator.element().focus()
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[6]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[6]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
          ],
          offset: 3,
        },
      },
    })
    await vi.waitFor(() => {
      expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
      expect(window.getSelection()?.focusOffset).toEqual(3)
    })
    await userEvent.type(locator, 'x', {skipClick: true})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: keys[0]!,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
        },
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'callout',
              _key: keys[6]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[0]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[1]!, text: 'foox', marks: []},
                  ],
                },
                {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
                {
                  _type: 'block',
                  _key: keys[3]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'diffMatchPatch',
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[6]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: table cell span through start value stays an object while typing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 8}, () => keyGenerator())
    const events: Array<EditorEmittedEvent> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: straySpanSchema,
      initialValue: [
        {
          _type: 'table',
          _key: keys[5]!,
          rows: [
            {
              _type: 'row',
              _key: keys[6]!,
              cells: [
                {
                  _type: 'cell',
                  _key: keys[7]!,
                  content: [
                    {
                      _type: 'block',
                      _key: keys[0]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                      ],
                    },
                    {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
                    {
                      _type: 'block',
                      _key: keys[3]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin
            nodes={[...straySpanTableContainers, ...straySpanCalloutContainers]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })
    expect(keys).toEqual([
      keys[0]!,
      keys[1]!,
      keys[2]!,
      keys[3]!,
      keys[4]!,
      keys[5]!,
      keys[6]!,
      keys[7]!,
    ])

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: keys[5]!,
          rows: [
            {
              _type: 'row',
              _key: keys[6]!,
              cells: [
                {
                  _type: 'cell',
                  _key: keys[7]!,
                  content: [
                    {
                      _type: 'block',
                      _key: keys[0]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                      ],
                    },
                    {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
                    {
                      _type: 'block',
                      _key: keys[3]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
      expect(locator.element().getAttribute('contenteditable')).toEqual('true')
      expect(locator.element().textContent).toEqual('foo\uFEFF[span: k2]baz')
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-pt-block="object"]'),
          (element) => element.textContent,
        ),
      ).toEqual(['\uFEFF[span: k2]'])
    })
    locator.element().focus()
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: keys[5]!},
            'rows',
            {_key: keys[6]!},
            'cells',
            {_key: keys[7]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: keys[5]!},
            'rows',
            {_key: keys[6]!},
            'cells',
            {_key: keys[7]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
          ],
          offset: 3,
        },
      },
    })
    await vi.waitFor(() => {
      expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
      expect(window.getSelection()?.focusOffset).toEqual(3)
    })
    await userEvent.type(locator, 'x', {skipClick: true})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: keys[5]!,
          rows: [
            {
              _type: 'row',
              _key: keys[6]!,
              cells: [
                {
                  _type: 'cell',
                  _key: keys[7]!,
                  content: [
                    {
                      _type: 'block',
                      _key: keys[0]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keys[1]!,
                          text: 'foox',
                          marks: [],
                        },
                      ],
                    },
                    {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
                    {
                      _type: 'block',
                      _key: keys[3]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'diffMatchPatch',
          path: [
            {_key: keys[5]!},
            'rows',
            {_key: keys[6]!},
            'cells',
            {_key: keys[7]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: table cell span through remote span stays an object while typing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 8}, () => keyGenerator())
    const events: Array<EditorEmittedEvent> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: straySpanSchema,
      initialValue: [
        {
          _type: 'table',
          _key: keys[5]!,
          rows: [
            {
              _type: 'row',
              _key: keys[6]!,
              cells: [
                {
                  _type: 'cell',
                  _key: keys[7]!,
                  content: [
                    {
                      _type: 'block',
                      _key: keys[0]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                      ],
                    },
                    {
                      _type: 'block',
                      _key: keys[3]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin
            nodes={[...straySpanTableContainers, ...straySpanCalloutContainers]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })
    expect(keys).toEqual([
      keys[0]!,
      keys[1]!,
      keys[2]!,
      keys[3]!,
      keys[4]!,
      keys[5]!,
      keys[6]!,
      keys[7]!,
    ])
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [
            {_key: keys[5]!},
            'rows',
            {_key: keys[6]!},
            'cells',
            {_key: keys[7]!},
            'content',
            {_key: keys[0]!},
          ],
          position: 'after',
          items: [{_type: 'span', _key: keys[2]!, text: 'bar', marks: []}],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: keys[5]!,
          rows: [
            {
              _type: 'row',
              _key: keys[6]!,
              cells: [
                {
                  _type: 'cell',
                  _key: keys[7]!,
                  content: [
                    {
                      _type: 'block',
                      _key: keys[0]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                      ],
                    },
                    {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
                    {
                      _type: 'block',
                      _key: keys[3]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
      expect(locator.element().getAttribute('contenteditable')).toEqual('true')
      expect(locator.element().textContent).toEqual('foo\uFEFF[span: k2]baz')
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-pt-block="object"]'),
          (element) => element.textContent,
        ),
      ).toEqual(['\uFEFF[span: k2]'])
    })
    locator.element().focus()
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: keys[5]!},
            'rows',
            {_key: keys[6]!},
            'cells',
            {_key: keys[7]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: keys[5]!},
            'rows',
            {_key: keys[6]!},
            'cells',
            {_key: keys[7]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
          ],
          offset: 3,
        },
      },
    })
    await vi.waitFor(() => {
      expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
      expect(window.getSelection()?.focusOffset).toEqual(3)
    })
    await userEvent.type(locator, 'x', {skipClick: true})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: keys[5]!,
          rows: [
            {
              _type: 'row',
              _key: keys[6]!,
              cells: [
                {
                  _type: 'cell',
                  _key: keys[7]!,
                  content: [
                    {
                      _type: 'block',
                      _key: keys[0]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keys[1]!,
                          text: 'foox',
                          marks: [],
                        },
                      ],
                    },
                    {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
                    {
                      _type: 'block',
                      _key: keys[3]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'diffMatchPatch',
          path: [
            {_key: keys[5]!},
            'rows',
            {_key: keys[6]!},
            'cells',
            {_key: keys[7]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: table cell span through remote container stays an object while typing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 8}, () => keyGenerator())
    const events: Array<EditorEmittedEvent> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: straySpanSchema,
      initialValue: [
        {
          _type: 'block',
          _key: keys[0]!,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
        },
      ],
      children: (
        <>
          <NodePlugin
            nodes={[...straySpanTableContainers, ...straySpanCalloutContainers]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })
    expect(keys).toEqual([
      keys[0]!,
      keys[1]!,
      keys[2]!,
      keys[3]!,
      keys[4]!,
      keys[5]!,
      keys[6]!,
      keys[7]!,
    ])
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [{_key: keys[0]!}],
          position: 'after',
          items: [
            {
              _type: 'table',
              _key: keys[5]!,
              rows: [
                {
                  _type: 'row',
                  _key: keys[6]!,
                  cells: [
                    {
                      _type: 'cell',
                      _key: keys[7]!,
                      content: [
                        {
                          _type: 'block',
                          _key: keys[0]!,
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {
                              _type: 'span',
                              _key: keys[1]!,
                              text: 'foo',
                              marks: [],
                            },
                          ],
                        },
                        {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
                        {
                          _type: 'block',
                          _key: keys[3]!,
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {
                              _type: 'span',
                              _key: keys[4]!,
                              text: 'baz',
                              marks: [],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: keys[0]!,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
        },
        {
          _type: 'table',
          _key: keys[5]!,
          rows: [
            {
              _type: 'row',
              _key: keys[6]!,
              cells: [
                {
                  _type: 'cell',
                  _key: keys[7]!,
                  content: [
                    {
                      _type: 'block',
                      _key: keys[0]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                      ],
                    },
                    {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
                    {
                      _type: 'block',
                      _key: keys[3]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
      expect(locator.element().getAttribute('contenteditable')).toEqual('true')
      expect(locator.element().textContent).toEqual('foofoo\uFEFF[span: k2]baz')
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-pt-block="object"]'),
          (element) => element.textContent,
        ),
      ).toEqual(['\uFEFF[span: k2]'])
    })
    locator.element().focus()
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: keys[5]!},
            'rows',
            {_key: keys[6]!},
            'cells',
            {_key: keys[7]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: keys[5]!},
            'rows',
            {_key: keys[6]!},
            'cells',
            {_key: keys[7]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
          ],
          offset: 3,
        },
      },
    })
    await vi.waitFor(() => {
      expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
      expect(window.getSelection()?.focusOffset).toEqual(3)
    })
    await userEvent.type(locator, 'x', {skipClick: true})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: keys[0]!,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
        },
        {
          _type: 'table',
          _key: keys[5]!,
          rows: [
            {
              _type: 'row',
              _key: keys[6]!,
              cells: [
                {
                  _type: 'cell',
                  _key: keys[7]!,
                  content: [
                    {
                      _type: 'block',
                      _key: keys[0]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keys[1]!,
                          text: 'foox',
                          marks: [],
                        },
                      ],
                    },
                    {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
                    {
                      _type: 'block',
                      _key: keys[3]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'diffMatchPatch',
          path: [
            {_key: keys[5]!},
            'rows',
            {_key: keys[6]!},
            'cells',
            {_key: keys[7]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: root span through remote span stays an object while typing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 8}, () => keyGenerator())
    const events: Array<EditorEmittedEvent> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: straySpanSchema,
      initialValue: [
        {
          _type: 'block',
          _key: keys[0]!,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
        },
        {
          _type: 'block',
          _key: keys[3]!,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: keys[4]!, text: 'baz', marks: []}],
        },
      ],
      children: (
        <>
          <NodePlugin
            nodes={[...straySpanTableContainers, ...straySpanCalloutContainers]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })
    expect(keys).toEqual([
      keys[0]!,
      keys[1]!,
      keys[2]!,
      keys[3]!,
      keys[4]!,
      keys[5]!,
      keys[6]!,
      keys[7]!,
    ])
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [{_key: keys[0]!}],
          position: 'after',
          items: [{_type: 'span', _key: keys[2]!, text: 'bar', marks: []}],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: keys[0]!,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
        },
        {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
        {
          _type: 'block',
          _key: keys[3]!,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: keys[4]!, text: 'baz', marks: []}],
        },
      ])
      expect(locator.element().getAttribute('contenteditable')).toEqual('true')
      expect(locator.element().textContent).toEqual('foo\uFEFF[span: k2]baz')
      expect(
        Array.from(
          locator.element().querySelectorAll('[data-pt-block="object"]'),
          (element) => element.textContent,
        ),
      ).toEqual(['\uFEFF[span: k2]'])
    })
    locator.element().focus()
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: keys[0]!}, 'children', {_key: keys[1]!}],
          offset: 3,
        },
        focus: {
          path: [{_key: keys[0]!}, 'children', {_key: keys[1]!}],
          offset: 3,
        },
      },
    })
    await vi.waitFor(() => {
      expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
      expect(window.getSelection()?.focusOffset).toEqual(3)
    })
    await userEvent.type(locator, 'x', {skipClick: true})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: keys[0]!,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: keys[1]!, text: 'foox', marks: []}],
        },
        {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
        {
          _type: 'block',
          _key: keys[3]!,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: keys[4]!, text: 'baz', marks: []}],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'diffMatchPatch',
          path: [{_key: keys[0]!}, 'children', {_key: keys[1]!}, 'text'],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: Backspace deletes a keyed callout span object with one unset', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 8}, () => keyGenerator())
    const events: Array<EditorEmittedEvent> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: straySpanSchema,
      initialValue: [
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'block',
              _key: keys[0]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
              ],
            },
            {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
            {
              _type: 'block',
              _key: keys[3]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
              ],
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin
            nodes={[
              ...straySpanTableContainers,
              ...straySpanCalloutContainers,
              straySpanSelectableObject,
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })
    expect(keys).toEqual([
      keys[0]!,
      keys[1]!,
      keys[2]!,
      keys[3]!,
      keys[4]!,
      keys[5]!,
      keys[6]!,
      keys[7]!,
    ])
    await userEvent.click(page.getByText('[span: k2]'))
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: keys[5]!}, 'content', {_key: keys[2]!}],
          offset: 0,
        },
        focus: {
          path: [{_key: keys[5]!}, 'content', {_key: keys[2]!}],
          offset: 0,
        },
        backward: false,
      })
    })
    await vi.waitFor(() => {
      expect(
        locator
          .element()
          .querySelector('[data-pt-block="object"]')
          ?.getAttribute('data-selected'),
      ).toEqual('true')
    })
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'block',
              _key: keys[0]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
              ],
            },
            {
              _type: 'block',
              _key: keys[3]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
              ],
            },
          ],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'unset',
          path: [{_key: keys[5]!}, 'content', {_key: keys[2]!}],
          origin: 'local',
        },
      ])
      expect(locator.element().getAttribute('contenteditable')).toEqual('true')
    })

    events.length = 0
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'block',
              _key: keys[0]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
              ],
            },
            {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
            {
              _type: 'block',
              _key: keys[3]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
              ],
            },
          ],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'setIfMissing',
          path: [{_key: keys[5]!}, 'content'],
          value: [],
          origin: 'local',
        },
        {
          type: 'insert',
          path: [{_key: keys[5]!}, 'content', {_key: keys[0]!}],
          position: 'after',
          items: [{_type: 'span', _key: keys[2]!, text: 'bar', marks: []}],
          origin: 'local',
        },
      ])
    })
    events.length = 0
    editor.send({type: 'history.redo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'block',
              _key: keys[0]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
              ],
            },
            {
              _type: 'block',
              _key: keys[3]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
              ],
            },
          ],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'unset',
          path: [{_key: keys[5]!}, 'content', {_key: keys[2]!}],
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: Backspace deletes a keyless callout span object with one unset', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 8}, () => keyGenerator())
    const expectedKeyGenerator = createTestKeyGenerator()
    const expectedKeys = Array.from({length: 11}, () => expectedKeyGenerator())
    const events: Array<EditorEmittedEvent> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: straySpanSchema,
      initialValue: [
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'block',
              _key: keys[0]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
              ],
            },
            {_type: 'span', text: 'bar', marks: ['em'], extra: 1},
            {
              _type: 'block',
              _key: keys[3]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
              ],
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin
            nodes={[
              ...straySpanTableContainers,
              ...straySpanCalloutContainers,
              straySpanSelectableObject,
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })
    expect(keys).toEqual([
      keys[0]!,
      keys[1]!,
      keys[2]!,
      keys[3]!,
      keys[4]!,
      keys[5]!,
      keys[6]!,
      keys[7]!,
    ])
    await userEvent.click(page.getByText('[span: k10]'))
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: keys[5]!}, 'content', {_key: expectedKeys[10]!}],
          offset: 0,
        },
        focus: {
          path: [{_key: keys[5]!}, 'content', {_key: expectedKeys[10]!}],
          offset: 0,
        },
        backward: false,
      })
    })
    await vi.waitFor(() => {
      expect(
        locator
          .element()
          .querySelector('[data-pt-block="object"]')
          ?.getAttribute('data-selected'),
      ).toEqual('true')
    })
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'block',
              _key: keys[0]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
              ],
            },
            {
              _type: 'block',
              _key: keys[3]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
              ],
            },
          ],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'set',
          path: [{_key: keys[5]!}, 'content', 1, '_key'],
          value: expectedKeys[10]!,
          origin: 'local',
        },
        {
          type: 'unset',
          path: [{_key: keys[5]!}, 'content', {_key: expectedKeys[10]!}],
          origin: 'local',
        },
      ])
      expect(locator.element().getAttribute('contenteditable')).toEqual('true')
    })

    events.length = 0
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'block',
              _key: keys[0]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
              ],
            },
            {
              _type: 'span',
              _key: expectedKeys[10]!,
              text: 'bar',
              marks: ['em'],
              extra: 1,
            },
            {
              _type: 'block',
              _key: keys[3]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
              ],
            },
          ],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'setIfMissing',
          path: [{_key: keys[5]!}, 'content'],
          value: [],
          origin: 'local',
        },
        {
          type: 'insert',
          path: [{_key: keys[5]!}, 'content', {_key: keys[0]!}],
          position: 'after',
          items: [
            {
              _type: 'span',
              _key: expectedKeys[10]!,
              text: 'bar',
              marks: ['em'],
              extra: 1,
            },
          ],
          origin: 'local',
        },
      ])
    })
    events.length = 0
    editor.send({type: 'history.redo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'block',
              _key: keys[0]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
              ],
            },
            {
              _type: 'block',
              _key: keys[3]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
              ],
            },
          ],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'unset',
          path: [{_key: keys[5]!}, 'content', {_key: expectedKeys[10]!}],
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: a keyless span without text or marks in a callout receives a key and keeps its missing text and marks while typing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 8}, () => keyGenerator())
    const expectedKeyGenerator = createTestKeyGenerator()
    const expectedKeys = Array.from({length: 11}, () => expectedKeyGenerator())
    const events: Array<EditorEmittedEvent> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: straySpanSchema,
      initialValue: [
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'block',
              _key: keys[0]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
              ],
            },
            {_type: 'span'},
            {
              _type: 'block',
              _key: keys[3]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
              ],
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin
            nodes={[
              ...straySpanTableContainers,
              ...straySpanCalloutContainers,
              straySpanSelectableObject,
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })
    await expect.element(locator).toBeVisible()
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'block',
              _key: keys[0]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
              ],
            },
            {_type: 'span', _key: expectedKeys[10]!},
            {
              _type: 'block',
              _key: keys[3]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
              ],
            },
          ],
        },
      ])
      expect(events).toEqual([
        {
          value: [
            {
              _type: 'callout',
              _key: 'k5',
              content: [
                {
                  _type: 'block',
                  _key: 'k0',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                  ],
                },
                {_type: 'span', _key: 'k10'},
                {
                  _type: 'block',
                  _key: 'k3',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k4', text: 'baz', marks: []},
                  ],
                },
              ],
            },
          ],
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'set',
              path: [
                {
                  _key: keys[5]!,
                },
                'content',
                1,
                '_key',
              ],
              value: expectedKeys[10]!,
              inverse: {
                type: 'unset',
                path: [
                  {
                    _key: keys[5]!,
                  },
                  'content',
                  1,
                  '_key',
                ],
              },
            },
          ],
          patches: [
            {
              type: 'set',
              path: [
                {
                  _key: keys[5]!,
                },
                'content',
                1,
                '_key',
              ],
              value: expectedKeys[10]!,
              origin: 'local',
            },
          ],
        },
      ])
    })
    locator.element().focus()
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
          ],
          offset: 3,
        },
      },
    })
    await vi.waitFor(() => {
      expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
      expect(window.getSelection()?.focusOffset).toEqual(3)
    })
    await userEvent.type(locator, 'x', {skipClick: true})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'block',
              _key: keys[0]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foox', marks: []},
              ],
            },
            {_type: 'span', _key: expectedKeys[10]!},
            {
              _type: 'block',
              _key: keys[3]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
              ],
            },
          ],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'set',
          path: [{_key: keys[5]!}, 'content', 1, '_key'],
          value: expectedKeys[10]!,
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: a keyless span without text or marks in a nested callout receives a key and keeps its missing text and marks while typing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 8}, () => keyGenerator())
    const expectedKeyGenerator = createTestKeyGenerator()
    const expectedKeys = Array.from({length: 11}, () => expectedKeyGenerator())
    const events: Array<EditorEmittedEvent> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: straySpanSchema,
      initialValue: [
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'callout',
              _key: keys[6]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[0]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                  ],
                },
                {_type: 'span'},
                {
                  _type: 'block',
                  _key: keys[3]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin
            nodes={[
              ...straySpanTableContainers,
              ...straySpanCalloutContainers,
              straySpanSelectableObject,
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })
    await expect.element(locator).toBeVisible()
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'callout',
              _key: keys[6]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[0]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                  ],
                },
                {_type: 'span', _key: expectedKeys[10]!},
                {
                  _type: 'block',
                  _key: keys[3]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ])
      expect(events).toEqual([
        {
          value: [
            {
              _type: 'callout',
              _key: 'k5',
              content: [
                {
                  _type: 'callout',
                  _key: 'k6',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k0',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                      ],
                    },
                    {_type: 'span', _key: 'k10'},
                    {
                      _type: 'block',
                      _key: 'k3',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k4', text: 'baz', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'set',
              path: [
                {
                  _key: keys[5]!,
                },
                'content',
                {
                  _key: keys[6]!,
                },
                'content',
                1,
                '_key',
              ],
              value: expectedKeys[10]!,
              inverse: {
                type: 'unset',
                path: [
                  {
                    _key: keys[5]!,
                  },
                  'content',
                  {
                    _key: keys[6]!,
                  },
                  'content',
                  1,
                  '_key',
                ],
              },
            },
          ],
          patches: [
            {
              type: 'set',
              path: [
                {
                  _key: keys[5]!,
                },
                'content',
                {
                  _key: keys[6]!,
                },
                'content',
                1,
                '_key',
              ],
              value: expectedKeys[10]!,
              origin: 'local',
            },
          ],
        },
      ])
    })
    locator.element().focus()
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[6]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[6]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
          ],
          offset: 3,
        },
      },
    })
    await vi.waitFor(() => {
      expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
      expect(window.getSelection()?.focusOffset).toEqual(3)
    })
    await userEvent.type(locator, 'x', {skipClick: true})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'callout',
              _key: keys[6]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[0]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[1]!, text: 'foox', marks: []},
                  ],
                },
                {_type: 'span', _key: expectedKeys[10]!},
                {
                  _type: 'block',
                  _key: keys[3]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'set',
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[6]!},
            'content',
            1,
            '_key',
          ],
          value: expectedKeys[10]!,
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[6]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: a keyless span without text or marks in a table cell receives a key and keeps its missing text and marks while typing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 8}, () => keyGenerator())
    const expectedKeyGenerator = createTestKeyGenerator()
    const expectedKeys = Array.from({length: 11}, () => expectedKeyGenerator())
    const events: Array<EditorEmittedEvent> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: straySpanSchema,
      initialValue: [
        {
          _type: 'table',
          _key: keys[5]!,
          rows: [
            {
              _type: 'row',
              _key: keys[6]!,
              cells: [
                {
                  _type: 'cell',
                  _key: keys[7]!,
                  content: [
                    {
                      _type: 'block',
                      _key: keys[0]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                      ],
                    },
                    {_type: 'span'},
                    {
                      _type: 'block',
                      _key: keys[3]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin
            nodes={[
              ...straySpanTableContainers,
              ...straySpanCalloutContainers,
              straySpanSelectableObject,
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })
    await expect.element(locator).toBeVisible()
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: keys[5]!,
          rows: [
            {
              _type: 'row',
              _key: keys[6]!,
              cells: [
                {
                  _type: 'cell',
                  _key: keys[7]!,
                  content: [
                    {
                      _type: 'block',
                      _key: keys[0]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                      ],
                    },
                    {_type: 'span', _key: expectedKeys[10]!},
                    {
                      _type: 'block',
                      _key: keys[3]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
      expect(events).toEqual([
        {
          value: [
            {
              _type: 'table',
              _key: 'k5',
              rows: [
                {
                  _type: 'row',
                  _key: 'k6',
                  cells: [
                    {
                      _type: 'cell',
                      _key: 'k7',
                      content: [
                        {
                          _type: 'block',
                          _key: 'k0',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                          ],
                        },
                        {_type: 'span', _key: 'k10'},
                        {
                          _type: 'block',
                          _key: 'k3',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {_type: 'span', _key: 'k4', text: 'baz', marks: []},
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'set',
              path: [
                {
                  _key: keys[5]!,
                },
                'rows',
                {
                  _key: keys[6]!,
                },
                'cells',
                {
                  _key: keys[7]!,
                },
                'content',
                1,
                '_key',
              ],
              value: expectedKeys[10]!,
              inverse: {
                type: 'unset',
                path: [
                  {
                    _key: keys[5]!,
                  },
                  'rows',
                  {
                    _key: keys[6]!,
                  },
                  'cells',
                  {
                    _key: keys[7]!,
                  },
                  'content',
                  1,
                  '_key',
                ],
              },
            },
          ],
          patches: [
            {
              type: 'set',
              path: [
                {
                  _key: keys[5]!,
                },
                'rows',
                {
                  _key: keys[6]!,
                },
                'cells',
                {
                  _key: keys[7]!,
                },
                'content',
                1,
                '_key',
              ],
              value: expectedKeys[10]!,
              origin: 'local',
            },
          ],
        },
      ])
    })
    locator.element().focus()
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: keys[5]!},
            'rows',
            {_key: keys[6]!},
            'cells',
            {_key: keys[7]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: keys[5]!},
            'rows',
            {_key: keys[6]!},
            'cells',
            {_key: keys[7]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
          ],
          offset: 3,
        },
      },
    })
    await vi.waitFor(() => {
      expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
      expect(window.getSelection()?.focusOffset).toEqual(3)
    })
    await userEvent.type(locator, 'x', {skipClick: true})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: keys[5]!,
          rows: [
            {
              _type: 'row',
              _key: keys[6]!,
              cells: [
                {
                  _type: 'cell',
                  _key: keys[7]!,
                  content: [
                    {
                      _type: 'block',
                      _key: keys[0]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keys[1]!,
                          text: 'foox',
                          marks: [],
                        },
                      ],
                    },
                    {_type: 'span', _key: expectedKeys[10]!},
                    {
                      _type: 'block',
                      _key: keys[3]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'set',
          path: [
            {_key: keys[5]!},
            'rows',
            {_key: keys[6]!},
            'cells',
            {_key: keys[7]!},
            'content',
            1,
            '_key',
          ],
          value: expectedKeys[10]!,
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [
            {_key: keys[5]!},
            'rows',
            {_key: keys[6]!},
            'cells',
            {_key: keys[7]!},
            'content',
            {_key: keys[0]!},
            'children',
            {_key: keys[1]!},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: a collaborator span sharing the preceding block key at the root is renamed and Backspace removes only the span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 8}, () => keyGenerator())
    const expectedKeyGenerator = createTestKeyGenerator()
    const expectedKeys = Array.from({length: 11}, () => expectedKeyGenerator())
    const events: Array<EditorEmittedEvent> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: straySpanSchema,
      initialValue: [
        {
          _type: 'block',
          _key: keys[0]!,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
        },
        {
          _type: 'block',
          _key: keys[3]!,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: keys[4]!, text: 'baz', marks: []}],
        },
      ],
      children: (
        <>
          <NodePlugin
            nodes={[
              ...straySpanTableContainers,
              ...straySpanCalloutContainers,
              straySpanSelectableObject,
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })
    await expect.element(locator).toBeVisible()
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [{_key: keys[0]!}],
          position: 'after',
          items: [{_type: 'span', _key: keys[0]!, text: 'bar', marks: []}],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: keys[0]!,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
        },
        {_type: 'span', _key: expectedKeys[10]!, text: 'bar', marks: []},
        {
          _type: 'block',
          _key: keys[3]!,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: keys[4]!, text: 'baz', marks: []}],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'set',
          path: [1, '_key'],
          value: expectedKeys[10]!,
          origin: 'local',
        },
      ])
    })
    const valueBeforeDelete = editor.getSnapshot().context.value
    events.length = 0
    await userEvent.click(page.getByText('[span: k10]'))
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: keys[0]!,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
        },
        {
          _type: 'block',
          _key: keys[3]!,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: keys[4]!, text: 'baz', marks: []}],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'unset',
          path: [{_key: expectedKeys[10]!}],
          origin: 'local',
        },
      ])
      expect(
        applyAll(
          valueBeforeDelete,
          events.flatMap((event) =>
            event.type === 'change' && event.origin === 'local'
              ? event.patches
              : [],
          ),
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: keys[0]!,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
        },
        {
          _type: 'block',
          _key: keys[3]!,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: keys[4]!, text: 'baz', marks: []}],
        },
      ])
    })
  })

  test('Scenario: a collaborator span sharing the preceding block key in a callout is renamed and Backspace removes only the span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 8}, () => keyGenerator())
    const expectedKeyGenerator = createTestKeyGenerator()
    const expectedKeys = Array.from({length: 11}, () => expectedKeyGenerator())
    const events: Array<EditorEmittedEvent> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: straySpanSchema,
      initialValue: [
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'block',
              _key: keys[0]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
              ],
            },
            {
              _type: 'block',
              _key: keys[3]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
              ],
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin
            nodes={[
              ...straySpanTableContainers,
              ...straySpanCalloutContainers,
              straySpanSelectableObject,
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })
    await expect.element(locator).toBeVisible()
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [{_key: keys[5]!}, 'content', {_key: keys[0]!}],
          position: 'after',
          items: [{_type: 'span', _key: keys[0]!, text: 'bar', marks: []}],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'block',
              _key: keys[0]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
              ],
            },
            {_type: 'span', _key: expectedKeys[10]!, text: 'bar', marks: []},
            {
              _type: 'block',
              _key: keys[3]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
              ],
            },
          ],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'set',
          path: [{_key: keys[5]!}, 'content', 1, '_key'],
          value: expectedKeys[10]!,
          origin: 'local',
        },
      ])
    })
    const valueBeforeDelete = editor.getSnapshot().context.value
    events.length = 0
    await userEvent.click(page.getByText('[span: k10]'))
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'block',
              _key: keys[0]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
              ],
            },
            {
              _type: 'block',
              _key: keys[3]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
              ],
            },
          ],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'unset',
          path: [{_key: keys[5]!}, 'content', {_key: expectedKeys[10]!}],
          origin: 'local',
        },
      ])
      expect(
        applyAll(
          valueBeforeDelete,
          events.flatMap((event) =>
            event.type === 'change' && event.origin === 'local'
              ? event.patches
              : [],
          ),
        ),
      ).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'block',
              _key: keys[0]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
              ],
            },
            {
              _type: 'block',
              _key: keys[3]!,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
              ],
            },
          ],
        },
      ])
    })
  })

  test('Scenario: a collaborator span sharing the preceding block key in a nested callout is renamed and Backspace removes only the span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 8}, () => keyGenerator())
    const expectedKeyGenerator = createTestKeyGenerator()
    const expectedKeys = Array.from({length: 11}, () => expectedKeyGenerator())
    const events: Array<EditorEmittedEvent> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: straySpanSchema,
      initialValue: [
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'callout',
              _key: keys[6]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[0]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                  ],
                },
                {
                  _type: 'block',
                  _key: keys[3]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin
            nodes={[
              ...straySpanTableContainers,
              ...straySpanCalloutContainers,
              straySpanSelectableObject,
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })
    await expect.element(locator).toBeVisible()
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[6]!},
            'content',
            {_key: keys[0]!},
          ],
          position: 'after',
          items: [{_type: 'span', _key: keys[0]!, text: 'bar', marks: []}],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'callout',
              _key: keys[6]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[0]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                  ],
                },
                {
                  _type: 'span',
                  _key: expectedKeys[10]!,
                  text: 'bar',
                  marks: [],
                },
                {
                  _type: 'block',
                  _key: keys[3]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'set',
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[6]!},
            'content',
            1,
            '_key',
          ],
          value: expectedKeys[10]!,
          origin: 'local',
        },
      ])
    })
    const valueBeforeDelete = editor.getSnapshot().context.value
    events.length = 0
    await userEvent.click(page.getByText('[span: k10]'))
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'callout',
              _key: keys[6]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[0]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                  ],
                },
                {
                  _type: 'block',
                  _key: keys[3]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'unset',
          path: [
            {_key: keys[5]!},
            'content',
            {_key: keys[6]!},
            'content',
            {_key: expectedKeys[10]!},
          ],
          origin: 'local',
        },
      ])
      expect(
        applyAll(
          valueBeforeDelete,
          events.flatMap((event) =>
            event.type === 'change' && event.origin === 'local'
              ? event.patches
              : [],
          ),
        ),
      ).toEqual([
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'callout',
              _key: keys[6]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[0]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                  ],
                },
                {
                  _type: 'block',
                  _key: keys[3]!,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
  })

  test('Scenario: a collaborator span sharing the preceding block key in a table cell is renamed and Backspace removes only the span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 8}, () => keyGenerator())
    const expectedKeyGenerator = createTestKeyGenerator()
    const expectedKeys = Array.from({length: 11}, () => expectedKeyGenerator())
    const events: Array<EditorEmittedEvent> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: straySpanSchema,
      initialValue: [
        {
          _type: 'table',
          _key: keys[5]!,
          rows: [
            {
              _type: 'row',
              _key: keys[6]!,
              cells: [
                {
                  _type: 'cell',
                  _key: keys[7]!,
                  content: [
                    {
                      _type: 'block',
                      _key: keys[0]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                      ],
                    },
                    {
                      _type: 'block',
                      _key: keys[3]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin
            nodes={[
              ...straySpanTableContainers,
              ...straySpanCalloutContainers,
              straySpanSelectableObject,
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'change' && event.origin === 'local') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })
    await expect.element(locator).toBeVisible()
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [
            {_key: keys[5]!},
            'rows',
            {_key: keys[6]!},
            'cells',
            {_key: keys[7]!},
            'content',
            {_key: keys[0]!},
          ],
          position: 'after',
          items: [{_type: 'span', _key: keys[0]!, text: 'bar', marks: []}],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: keys[5]!,
          rows: [
            {
              _type: 'row',
              _key: keys[6]!,
              cells: [
                {
                  _type: 'cell',
                  _key: keys[7]!,
                  content: [
                    {
                      _type: 'block',
                      _key: keys[0]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                      ],
                    },
                    {
                      _type: 'span',
                      _key: expectedKeys[10]!,
                      text: 'bar',
                      marks: [],
                    },
                    {
                      _type: 'block',
                      _key: keys[3]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'set',
          path: [
            {_key: keys[5]!},
            'rows',
            {_key: keys[6]!},
            'cells',
            {_key: keys[7]!},
            'content',
            1,
            '_key',
          ],
          value: expectedKeys[10]!,
          origin: 'local',
        },
      ])
    })
    const valueBeforeDelete = editor.getSnapshot().context.value
    events.length = 0
    await userEvent.click(page.getByText('[span: k10]'))
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: keys[5]!,
          rows: [
            {
              _type: 'row',
              _key: keys[6]!,
              cells: [
                {
                  _type: 'cell',
                  _key: keys[7]!,
                  content: [
                    {
                      _type: 'block',
                      _key: keys[0]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                      ],
                    },
                    {
                      _type: 'block',
                      _key: keys[3]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
      expect(
        events.flatMap((event) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'unset',
          path: [
            {_key: keys[5]!},
            'rows',
            {_key: keys[6]!},
            'cells',
            {_key: keys[7]!},
            'content',
            {_key: expectedKeys[10]!},
          ],
          origin: 'local',
        },
      ])
      expect(
        applyAll(
          valueBeforeDelete,
          events.flatMap((event) =>
            event.type === 'change' && event.origin === 'local'
              ? event.patches
              : [],
          ),
        ),
      ).toEqual([
        {
          _type: 'table',
          _key: keys[5]!,
          rows: [
            {
              _type: 'row',
              _key: keys[6]!,
              cells: [
                {
                  _type: 'cell',
                  _key: keys[7]!,
                  content: [
                    {
                      _type: 'block',
                      _key: keys[0]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                      ],
                    },
                    {
                      _type: 'block',
                      _key: keys[3]!,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
  })
  test('Scenario: style across a misplaced text block at root preserves its payload', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 10}, () => keyGenerator())
    const prefix: Path = []
    const misplaced = {
      _type: 'block',
      _key: keys[2]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[3]!, text: 'baz', marks: []}],
    }
    const first = {
      _type: 'block',
      _key: keys[0]!,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
        misplaced,
        {_type: 'span', _key: keys[4]!, text: 'bar', marks: []},
      ],
    }
    const last = {
      _type: 'block',
      _key: keys[5]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[6]!, text: 'baz', marks: []}],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        styles: [{name: 'normal'}, {name: 'h1'}],
        lists: [{name: 'bullet'}],
        annotations: [{name: 'link'}],
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'callout'}],
              },
            ],
          },
        ],
      }),
      initialValue: [first, last],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
          ]}
        />
      ),
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [...prefix, {_key: keys[0]!}, 'children', {_key: keys[1]!}],
          offset: 0,
        },
        focus: {
          path: [...prefix, {_key: keys[5]!}, 'children', {_key: keys[6]!}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'style.toggle', style: 'h1'})
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual([
        {...first, style: 'h1'},
        {...last, style: 'h1'},
      ]),
    )
  })
  test('Scenario: list across a misplaced text block at root preserves its payload', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 10}, () => keyGenerator())
    const prefix: Path = []
    const misplaced = {
      _type: 'block',
      _key: keys[2]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[3]!, text: 'baz', marks: []}],
    }
    const first = {
      _type: 'block',
      _key: keys[0]!,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
        misplaced,
        {_type: 'span', _key: keys[4]!, text: 'bar', marks: []},
      ],
    }
    const last = {
      _type: 'block',
      _key: keys[5]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[6]!, text: 'baz', marks: []}],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        styles: [{name: 'normal'}, {name: 'h1'}],
        lists: [{name: 'bullet'}],
        annotations: [{name: 'link'}],
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'callout'}],
              },
            ],
          },
        ],
      }),
      initialValue: [first, last],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
          ]}
        />
      ),
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [...prefix, {_key: keys[0]!}, 'children', {_key: keys[1]!}],
          offset: 0,
        },
        focus: {
          path: [...prefix, {_key: keys[5]!}, 'children', {_key: keys[6]!}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'list item.toggle', listItem: 'bullet'})
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual([
        {...first, listItem: 'bullet', level: 1},
        {...last, listItem: 'bullet', level: 1},
      ]),
    )
  })
  test('Scenario: annotation across a misplaced text block at root preserves its payload', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 10}, () => keyGenerator())
    const expectedKeyGenerator = createTestKeyGenerator()
    const expectedKeys = Array.from({length: 14}, () => expectedKeyGenerator())
    const prefix: Path = []
    const misplaced = {
      _type: 'block',
      _key: keys[2]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[3]!, text: 'baz', marks: []}],
    }
    const first = {
      _type: 'block',
      _key: keys[0]!,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
        misplaced,
        {_type: 'span', _key: keys[4]!, text: 'bar', marks: []},
      ],
    }
    const last = {
      _type: 'block',
      _key: keys[5]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[6]!, text: 'baz', marks: []}],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        styles: [{name: 'normal'}, {name: 'h1'}],
        lists: [{name: 'bullet'}],
        annotations: [{name: 'link'}],
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'callout'}],
              },
            ],
          },
        ],
      }),
      initialValue: [first, last],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
          ]}
        />
      ),
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [...prefix, {_key: keys[0]!}, 'children', {_key: keys[1]!}],
          offset: 0,
        },
        focus: {
          path: [...prefix, {_key: keys[5]!}, 'children', {_key: keys[6]!}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'annotation.add', annotation: {name: 'link', value: {}}})
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual([
        {
          ...first,
          markDefs: [{_type: 'link', _key: expectedKeys[12]!}],
          children: [
            {...first.children[0], marks: [expectedKeys[12]!]},
            misplaced,
            {...first.children[2], marks: [expectedKeys[12]!]},
          ],
        },
        {
          ...last,
          markDefs: [{_type: 'link', _key: expectedKeys[13]!}],
          children: [{...last.children[0], marks: [expectedKeys[13]!]}],
        },
      ]),
    )
  })
  test('Scenario: triple-clicking a misplaced text block at root selects its enclosing line', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 10}, () => keyGenerator())
    const prefix: Path = []
    const misplaced = {
      _type: 'block',
      _key: keys[2]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[3]!, text: 'baz', marks: []}],
    }
    const first = {
      _type: 'block',
      _key: keys[0]!,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
        misplaced,
        {_type: 'span', _key: keys[4]!, text: 'bar', marks: []},
      ],
    }
    const last = {
      _type: 'block',
      _key: keys[5]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[6]!, text: 'baz', marks: []}],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        styles: [{name: 'normal'}, {name: 'h1'}],
        lists: [{name: 'bullet'}],
        annotations: [{name: 'link'}],
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'callout'}],
              },
            ],
          },
        ],
      }),
      initialValue: [first, last],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
          ]}
        />
      ),
    })

    await userEvent.tripleClick(page.getByText('[block: k2]', {exact: true}))
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [...prefix, {_key: keys[0]!}, 'children', {_key: keys[1]!}],
          offset: 0,
        },
        focus: {
          path: [...prefix, {_key: keys[0]!}, 'children', {_key: keys[4]!}],
          offset: 3,
        },
        backward: false,
      }),
    )
  })
  test('Scenario: diff respects a misplaced span at root', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 10}, () => keyGenerator())
    const prefix: Path = []
    const misplaced = {_type: 'span', _key: keys[0]!, text: 'foo'}
    const block = {
      _type: 'block',
      _key: keys[1]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[2]!, text: 'bar', marks: []}],
    }
    const legacyRef = React.createRef<PortableTextEditor>()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [misplaced, block],
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'callout'}],
              },
            ],
          },
        ],
      }),
      children: (
        <>
          <InternalPortableTextEditorRefPlugin ref={legacyRef} />
          <NodePlugin
            nodes={[
              defineContainer({
                type: 'callout',
                arrayField: 'content',
                render: ({children}) => <>{children}</>,
              }),
            ]}
          />
        </>
      ),
    })
    const operations: Array<
      Extract<EditorEmittedEvent, {type: 'operation'}>['operation']
    > = []
    editor.on('operation', (event) =>
      operations.push(structuredClone(event.operation)),
    )
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'diffMatchPatch',
          path: [...prefix, {_key: keys[0]!}, 'text'],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'remote',
        },
        {
          type: 'diffMatchPatch',
          path: [
            ...prefix,
            {_key: keys[1]!},
            'children',
            {_key: keys[2]!},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n bar\n+x\n',
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual([
        misplaced,
        {...block, children: [{...block.children[0], text: 'barx'}]},
      ]),
    )
    expect(operations).toEqual([
      {
        type: 'insert.text',
        path: [...prefix, {_key: keys[1]!}, 'children', {_key: keys[2]!}],
        offset: 3,
        text: 'x',
      },
    ])
  })
  test('Scenario: canonical respects a misplaced span at root', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 10}, () => keyGenerator())
    const prefix: Path = []
    const misplaced = {_type: 'span', _key: keys[0]!, text: 'foo'}
    const block = {
      _type: 'block',
      _key: keys[1]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[2]!, text: 'bar', marks: []}],
    }
    const legacyRef = React.createRef<PortableTextEditor>()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [misplaced, block],
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'callout'}],
              },
            ],
          },
        ],
      }),
      children: (
        <>
          <InternalPortableTextEditorRefPlugin ref={legacyRef} />
          <NodePlugin
            nodes={[
              defineContainer({
                type: 'callout',
                arrayField: 'content',
                render: ({children}) => <>{children}</>,
              }),
            ]}
          />
        </>
      ),
    })
    editor.send({
      type: 'block.set',
      at: [...prefix, {_key: keys[0]!}],
      props: {_key: keys[3]!},
    })
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual([
        {...misplaced, _key: keys[3]!},
        block,
      ]),
    )
  })
  test('Scenario: style across a misplaced text block at callout preserves its payload', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 10}, () => keyGenerator())
    const prefix = [{_key: keys[8]!}, 'content']
    const misplaced = {
      _type: 'block',
      _key: keys[2]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[3]!, text: 'baz', marks: []}],
    }
    const first = {
      _type: 'block',
      _key: keys[0]!,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
        misplaced,
        {_type: 'span', _key: keys[4]!, text: 'bar', marks: []},
      ],
    }
    const last = {
      _type: 'block',
      _key: keys[5]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[6]!, text: 'baz', marks: []}],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        styles: [{name: 'normal'}, {name: 'h1'}],
        lists: [{name: 'bullet'}],
        annotations: [{name: 'link'}],
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'callout'}],
              },
            ],
          },
        ],
      }),
      initialValue: [
        {_type: 'callout', _key: keys[8]!, content: [first, last]},
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
          ]}
        />
      ),
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [...prefix, {_key: keys[0]!}, 'children', {_key: keys[1]!}],
          offset: 0,
        },
        focus: {
          path: [...prefix, {_key: keys[5]!}, 'children', {_key: keys[6]!}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'style.toggle', style: 'h1'})
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[8]!,
          content: [
            {...first, style: 'h1'},
            {...last, style: 'h1'},
          ],
        },
      ]),
    )
  })
  test('Scenario: list across a misplaced text block at callout preserves its payload', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 10}, () => keyGenerator())
    const prefix = [{_key: keys[8]!}, 'content']
    const misplaced = {
      _type: 'block',
      _key: keys[2]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[3]!, text: 'baz', marks: []}],
    }
    const first = {
      _type: 'block',
      _key: keys[0]!,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
        misplaced,
        {_type: 'span', _key: keys[4]!, text: 'bar', marks: []},
      ],
    }
    const last = {
      _type: 'block',
      _key: keys[5]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[6]!, text: 'baz', marks: []}],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        styles: [{name: 'normal'}, {name: 'h1'}],
        lists: [{name: 'bullet'}],
        annotations: [{name: 'link'}],
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'callout'}],
              },
            ],
          },
        ],
      }),
      initialValue: [
        {_type: 'callout', _key: keys[8]!, content: [first, last]},
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
          ]}
        />
      ),
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [...prefix, {_key: keys[0]!}, 'children', {_key: keys[1]!}],
          offset: 0,
        },
        focus: {
          path: [...prefix, {_key: keys[5]!}, 'children', {_key: keys[6]!}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'list item.toggle', listItem: 'bullet'})
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[8]!,
          content: [
            {...first, listItem: 'bullet', level: 1},
            {...last, listItem: 'bullet', level: 1},
          ],
        },
      ]),
    )
  })
  test('Scenario: annotation across a misplaced text block at callout preserves its payload', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 10}, () => keyGenerator())
    const expectedKeyGenerator = createTestKeyGenerator()
    const expectedKeys = Array.from({length: 14}, () => expectedKeyGenerator())
    const prefix = [{_key: keys[8]!}, 'content']
    const misplaced = {
      _type: 'block',
      _key: keys[2]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[3]!, text: 'baz', marks: []}],
    }
    const first = {
      _type: 'block',
      _key: keys[0]!,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
        misplaced,
        {_type: 'span', _key: keys[4]!, text: 'bar', marks: []},
      ],
    }
    const last = {
      _type: 'block',
      _key: keys[5]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[6]!, text: 'baz', marks: []}],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        styles: [{name: 'normal'}, {name: 'h1'}],
        lists: [{name: 'bullet'}],
        annotations: [{name: 'link'}],
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'callout'}],
              },
            ],
          },
        ],
      }),
      initialValue: [
        {_type: 'callout', _key: keys[8]!, content: [first, last]},
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
          ]}
        />
      ),
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [...prefix, {_key: keys[0]!}, 'children', {_key: keys[1]!}],
          offset: 0,
        },
        focus: {
          path: [...prefix, {_key: keys[5]!}, 'children', {_key: keys[6]!}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'annotation.add', annotation: {name: 'link', value: {}}})
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[8]!,
          content: [
            {
              ...first,
              markDefs: [{_type: 'link', _key: expectedKeys[12]!}],
              children: [
                {...first.children[0], marks: [expectedKeys[12]!]},
                misplaced,
                {...first.children[2], marks: [expectedKeys[12]!]},
              ],
            },
            {
              ...last,
              markDefs: [{_type: 'link', _key: expectedKeys[13]!}],
              children: [{...last.children[0], marks: [expectedKeys[13]!]}],
            },
          ],
        },
      ]),
    )
  })
  test('Scenario: triple-clicking a misplaced text block at callout selects its enclosing line', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 10}, () => keyGenerator())
    const prefix = [{_key: keys[8]!}, 'content']
    const misplaced = {
      _type: 'block',
      _key: keys[2]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[3]!, text: 'baz', marks: []}],
    }
    const first = {
      _type: 'block',
      _key: keys[0]!,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
        misplaced,
        {_type: 'span', _key: keys[4]!, text: 'bar', marks: []},
      ],
    }
    const last = {
      _type: 'block',
      _key: keys[5]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[6]!, text: 'baz', marks: []}],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        styles: [{name: 'normal'}, {name: 'h1'}],
        lists: [{name: 'bullet'}],
        annotations: [{name: 'link'}],
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'callout'}],
              },
            ],
          },
        ],
      }),
      initialValue: [
        {_type: 'callout', _key: keys[8]!, content: [first, last]},
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
          ]}
        />
      ),
    })

    await userEvent.tripleClick(page.getByText('[block: k2]', {exact: true}))
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [...prefix, {_key: keys[0]!}, 'children', {_key: keys[1]!}],
          offset: 0,
        },
        focus: {
          path: [...prefix, {_key: keys[0]!}, 'children', {_key: keys[4]!}],
          offset: 3,
        },
        backward: false,
      }),
    )
  })
  test('Scenario: diff respects a misplaced span at callout', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 10}, () => keyGenerator())
    const prefix = [{_key: keys[8]!}, 'content']
    const misplaced = {_type: 'span', _key: keys[0]!, text: 'foo'}
    const block = {
      _type: 'block',
      _key: keys[1]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[2]!, text: 'bar', marks: []}],
    }
    const legacyRef = React.createRef<PortableTextEditor>()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {_type: 'callout', _key: keys[8]!, content: [misplaced, block]},
      ],
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'callout'}],
              },
            ],
          },
        ],
      }),
      children: (
        <>
          <InternalPortableTextEditorRefPlugin ref={legacyRef} />
          <NodePlugin
            nodes={[
              defineContainer({
                type: 'callout',
                arrayField: 'content',
                render: ({children}) => <>{children}</>,
              }),
            ]}
          />
        </>
      ),
    })
    const operations: Array<
      Extract<EditorEmittedEvent, {type: 'operation'}>['operation']
    > = []
    editor.on('operation', (event) =>
      operations.push(structuredClone(event.operation)),
    )
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'diffMatchPatch',
          path: [...prefix, {_key: keys[0]!}, 'text'],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'remote',
        },
        {
          type: 'diffMatchPatch',
          path: [
            ...prefix,
            {_key: keys[1]!},
            'children',
            {_key: keys[2]!},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n bar\n+x\n',
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[8]!,
          content: [
            misplaced,
            {...block, children: [{...block.children[0], text: 'barx'}]},
          ],
        },
      ]),
    )
    expect(operations).toEqual([
      {
        type: 'insert.text',
        path: [...prefix, {_key: keys[1]!}, 'children', {_key: keys[2]!}],
        offset: 3,
        text: 'x',
      },
    ])
  })
  test('Scenario: canonical respects a misplaced span at callout', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 10}, () => keyGenerator())
    const prefix = [{_key: keys[8]!}, 'content']
    const misplaced = {_type: 'span', _key: keys[0]!, text: 'foo'}
    const block = {
      _type: 'block',
      _key: keys[1]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[2]!, text: 'bar', marks: []}],
    }
    const legacyRef = React.createRef<PortableTextEditor>()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {_type: 'callout', _key: keys[8]!, content: [misplaced, block]},
      ],
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'callout'}],
              },
            ],
          },
        ],
      }),
      children: (
        <>
          <InternalPortableTextEditorRefPlugin ref={legacyRef} />
          <NodePlugin
            nodes={[
              defineContainer({
                type: 'callout',
                arrayField: 'content',
                render: ({children}) => <>{children}</>,
              }),
            ]}
          />
        </>
      ),
    })
    editor.send({
      type: 'block.set',
      at: [...prefix, {_key: keys[0]!}],
      props: {_key: keys[3]!},
    })
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[8]!,
          content: [{...misplaced, _key: keys[3]!}, block],
        },
      ]),
    )
  })
  test('Scenario: style across a misplaced text block at nested callout preserves its payload', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 10}, () => keyGenerator())
    const prefix = [{_key: keys[9]!}, 'content', {_key: keys[8]!}, 'content']
    const misplaced = {
      _type: 'block',
      _key: keys[2]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[3]!, text: 'baz', marks: []}],
    }
    const first = {
      _type: 'block',
      _key: keys[0]!,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
        misplaced,
        {_type: 'span', _key: keys[4]!, text: 'bar', marks: []},
      ],
    }
    const last = {
      _type: 'block',
      _key: keys[5]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[6]!, text: 'baz', marks: []}],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        styles: [{name: 'normal'}, {name: 'h1'}],
        lists: [{name: 'bullet'}],
        annotations: [{name: 'link'}],
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'callout'}],
              },
            ],
          },
        ],
      }),
      initialValue: [
        {
          _type: 'callout',
          _key: keys[9]!,
          content: [{_type: 'callout', _key: keys[8]!, content: [first, last]}],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
          ]}
        />
      ),
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [...prefix, {_key: keys[0]!}, 'children', {_key: keys[1]!}],
          offset: 0,
        },
        focus: {
          path: [...prefix, {_key: keys[5]!}, 'children', {_key: keys[6]!}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'style.toggle', style: 'h1'})
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[9]!,
          content: [
            {
              _type: 'callout',
              _key: keys[8]!,
              content: [
                {...first, style: 'h1'},
                {...last, style: 'h1'},
              ],
            },
          ],
        },
      ]),
    )
  })
  test('Scenario: list across a misplaced text block at nested callout preserves its payload', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 10}, () => keyGenerator())
    const prefix = [{_key: keys[9]!}, 'content', {_key: keys[8]!}, 'content']
    const misplaced = {
      _type: 'block',
      _key: keys[2]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[3]!, text: 'baz', marks: []}],
    }
    const first = {
      _type: 'block',
      _key: keys[0]!,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
        misplaced,
        {_type: 'span', _key: keys[4]!, text: 'bar', marks: []},
      ],
    }
    const last = {
      _type: 'block',
      _key: keys[5]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[6]!, text: 'baz', marks: []}],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        styles: [{name: 'normal'}, {name: 'h1'}],
        lists: [{name: 'bullet'}],
        annotations: [{name: 'link'}],
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'callout'}],
              },
            ],
          },
        ],
      }),
      initialValue: [
        {
          _type: 'callout',
          _key: keys[9]!,
          content: [{_type: 'callout', _key: keys[8]!, content: [first, last]}],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
          ]}
        />
      ),
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [...prefix, {_key: keys[0]!}, 'children', {_key: keys[1]!}],
          offset: 0,
        },
        focus: {
          path: [...prefix, {_key: keys[5]!}, 'children', {_key: keys[6]!}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'list item.toggle', listItem: 'bullet'})
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[9]!,
          content: [
            {
              _type: 'callout',
              _key: keys[8]!,
              content: [
                {...first, listItem: 'bullet', level: 1},
                {...last, listItem: 'bullet', level: 1},
              ],
            },
          ],
        },
      ]),
    )
  })
  test('Scenario: annotation across a misplaced text block at nested callout preserves its payload', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 10}, () => keyGenerator())
    const expectedKeyGenerator = createTestKeyGenerator()
    const expectedKeys = Array.from({length: 14}, () => expectedKeyGenerator())
    const prefix = [{_key: keys[9]!}, 'content', {_key: keys[8]!}, 'content']
    const misplaced = {
      _type: 'block',
      _key: keys[2]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[3]!, text: 'baz', marks: []}],
    }
    const first = {
      _type: 'block',
      _key: keys[0]!,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
        misplaced,
        {_type: 'span', _key: keys[4]!, text: 'bar', marks: []},
      ],
    }
    const last = {
      _type: 'block',
      _key: keys[5]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[6]!, text: 'baz', marks: []}],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        styles: [{name: 'normal'}, {name: 'h1'}],
        lists: [{name: 'bullet'}],
        annotations: [{name: 'link'}],
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'callout'}],
              },
            ],
          },
        ],
      }),
      initialValue: [
        {
          _type: 'callout',
          _key: keys[9]!,
          content: [{_type: 'callout', _key: keys[8]!, content: [first, last]}],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
          ]}
        />
      ),
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [...prefix, {_key: keys[0]!}, 'children', {_key: keys[1]!}],
          offset: 0,
        },
        focus: {
          path: [...prefix, {_key: keys[5]!}, 'children', {_key: keys[6]!}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'annotation.add', annotation: {name: 'link', value: {}}})
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[9]!,
          content: [
            {
              _type: 'callout',
              _key: keys[8]!,
              content: [
                {
                  ...first,
                  markDefs: [{_type: 'link', _key: expectedKeys[12]!}],
                  children: [
                    {...first.children[0], marks: [expectedKeys[12]!]},
                    misplaced,
                    {...first.children[2], marks: [expectedKeys[12]!]},
                  ],
                },
                {
                  ...last,
                  markDefs: [{_type: 'link', _key: expectedKeys[13]!}],
                  children: [{...last.children[0], marks: [expectedKeys[13]!]}],
                },
              ],
            },
          ],
        },
      ]),
    )
  })
  test('Scenario: triple-clicking a misplaced text block at nested callout selects its enclosing line', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 10}, () => keyGenerator())
    const prefix = [{_key: keys[9]!}, 'content', {_key: keys[8]!}, 'content']
    const misplaced = {
      _type: 'block',
      _key: keys[2]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[3]!, text: 'baz', marks: []}],
    }
    const first = {
      _type: 'block',
      _key: keys[0]!,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
        misplaced,
        {_type: 'span', _key: keys[4]!, text: 'bar', marks: []},
      ],
    }
    const last = {
      _type: 'block',
      _key: keys[5]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[6]!, text: 'baz', marks: []}],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        styles: [{name: 'normal'}, {name: 'h1'}],
        lists: [{name: 'bullet'}],
        annotations: [{name: 'link'}],
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'callout'}],
              },
            ],
          },
        ],
      }),
      initialValue: [
        {
          _type: 'callout',
          _key: keys[9]!,
          content: [{_type: 'callout', _key: keys[8]!, content: [first, last]}],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
          ]}
        />
      ),
    })

    await userEvent.tripleClick(page.getByText('[block: k2]', {exact: true}))
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [...prefix, {_key: keys[0]!}, 'children', {_key: keys[1]!}],
          offset: 0,
        },
        focus: {
          path: [...prefix, {_key: keys[0]!}, 'children', {_key: keys[4]!}],
          offset: 3,
        },
        backward: false,
      }),
    )
  })
  test('Scenario: diff respects a misplaced span at nested callout', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 10}, () => keyGenerator())
    const prefix = [{_key: keys[9]!}, 'content', {_key: keys[8]!}, 'content']
    const misplaced = {_type: 'span', _key: keys[0]!, text: 'foo'}
    const block = {
      _type: 'block',
      _key: keys[1]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[2]!, text: 'bar', marks: []}],
    }
    const legacyRef = React.createRef<PortableTextEditor>()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'callout',
          _key: keys[9]!,
          content: [
            {_type: 'callout', _key: keys[8]!, content: [misplaced, block]},
          ],
        },
      ],
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'callout'}],
              },
            ],
          },
        ],
      }),
      children: (
        <>
          <InternalPortableTextEditorRefPlugin ref={legacyRef} />
          <NodePlugin
            nodes={[
              defineContainer({
                type: 'callout',
                arrayField: 'content',
                render: ({children}) => <>{children}</>,
              }),
            ]}
          />
        </>
      ),
    })
    const operations: Array<
      Extract<EditorEmittedEvent, {type: 'operation'}>['operation']
    > = []
    editor.on('operation', (event) =>
      operations.push(structuredClone(event.operation)),
    )
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'diffMatchPatch',
          path: [...prefix, {_key: keys[0]!}, 'text'],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'remote',
        },
        {
          type: 'diffMatchPatch',
          path: [
            ...prefix,
            {_key: keys[1]!},
            'children',
            {_key: keys[2]!},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n bar\n+x\n',
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[9]!,
          content: [
            {
              _type: 'callout',
              _key: keys[8]!,
              content: [
                misplaced,
                {...block, children: [{...block.children[0], text: 'barx'}]},
              ],
            },
          ],
        },
      ]),
    )
    expect(operations).toEqual([
      {
        type: 'insert.text',
        path: [...prefix, {_key: keys[1]!}, 'children', {_key: keys[2]!}],
        offset: 3,
        text: 'x',
      },
    ])
  })
  test('Scenario: canonical respects a misplaced span at nested callout', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 10}, () => keyGenerator())
    const prefix = [{_key: keys[9]!}, 'content', {_key: keys[8]!}, 'content']
    const misplaced = {_type: 'span', _key: keys[0]!, text: 'foo'}
    const block = {
      _type: 'block',
      _key: keys[1]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[2]!, text: 'bar', marks: []}],
    }
    const legacyRef = React.createRef<PortableTextEditor>()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'callout',
          _key: keys[9]!,
          content: [
            {_type: 'callout', _key: keys[8]!, content: [misplaced, block]},
          ],
        },
      ],
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'callout'}],
              },
            ],
          },
        ],
      }),
      children: (
        <>
          <InternalPortableTextEditorRefPlugin ref={legacyRef} />
          <NodePlugin
            nodes={[
              defineContainer({
                type: 'callout',
                arrayField: 'content',
                render: ({children}) => <>{children}</>,
              }),
            ]}
          />
        </>
      ),
    })
    editor.send({
      type: 'block.set',
      at: [...prefix, {_key: keys[0]!}],
      props: {_key: keys[3]!},
    })
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[9]!,
          content: [
            {
              _type: 'callout',
              _key: keys[8]!,
              content: [{...misplaced, _key: keys[3]!}, block],
            },
          ],
        },
      ]),
    )
  })
  test('Scenario: a misplaced text block before an inline object at root receives a separating span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 7}, () => keyGenerator())
    const expectedKeyGenerator = createTestKeyGenerator()
    const expectedKeys = Array.from({length: 10}, () => expectedKeyGenerator())
    const misplaced = {
      _type: 'block',
      _key: keys[2]!,
      children: [],
      style: 'normal',
      markDefs: [],
    }
    const object = {_type: 'mystery', _key: keys[3]!}
    const block = {
      _type: 'block',
      _key: keys[0]!,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
        misplaced,
        object,
        {_type: 'span', _key: keys[4]!, text: 'bar', marks: []},
      ],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block],
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
          ]}
        />
      ),
    })
    const expected = {
      ...block,
      children: [
        block.children[0],
        misplaced,
        {_type: 'span', _key: expectedKeys[9]!, text: '', marks: []},
        object,
        block.children[3],
      ],
    }
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual([expected]),
    )
  })
  test('Scenario: a misplaced text block before an inline object in a callout receives a separating span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 7}, () => keyGenerator())
    const expectedKeyGenerator = createTestKeyGenerator()
    const expectedKeys = Array.from({length: 10}, () => expectedKeyGenerator())
    const misplaced = {
      _type: 'block',
      _key: keys[2]!,
      children: [],
      style: 'normal',
      markDefs: [],
    }
    const object = {_type: 'mystery', _key: keys[3]!}
    const block = {
      _type: 'block',
      _key: keys[0]!,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
        misplaced,
        object,
        {_type: 'span', _key: keys[4]!, text: 'bar', marks: []},
      ],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [{_type: 'callout', _key: keys[6]!, content: [block]}],
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
          ]}
        />
      ),
    })
    const expected = {
      ...block,
      children: [
        block.children[0],
        misplaced,
        {_type: 'span', _key: expectedKeys[9]!, text: '', marks: []},
        object,
        block.children[3],
      ],
    }
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual([
        {_type: 'callout', _key: keys[6]!, content: [expected]},
      ]),
    )
  })
  test('Scenario: decorator across a misplaced span at root preserves its payload', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 10}, () => keyGenerator())
    const prefix: Path = []
    const misplaced = {_type: 'span', _key: keys[2]!, text: 'foo', marks: []}
    const first = {
      _type: 'block',
      _key: keys[0]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
    }
    const last = {
      _type: 'block',
      _key: keys[5]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[6]!, text: 'baz', marks: []}],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        styles: [{name: 'normal'}, {name: 'h1'}],
        lists: [{name: 'bullet'}],
        annotations: [{name: 'link'}],
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'callout'}],
              },
            ],
          },
        ],
      }),
      initialValue: [first, misplaced, last],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
          ]}
        />
      ),
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [...prefix, {_key: keys[0]!}, 'children', {_key: keys[1]!}],
          offset: 0,
        },
        focus: {
          path: [...prefix, {_key: keys[5]!}, 'children', {_key: keys[6]!}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'decorator.toggle', decorator: 'strong'})
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual([
        {...first, children: [{...first.children[0], marks: ['strong']}]},
        misplaced,
        {...last, children: [{...last.children[0], marks: ['strong']}]},
      ]),
    )
  })
  test('Scenario: decorator across a misplaced span at callout preserves its payload', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 10}, () => keyGenerator())
    const prefix = [{_key: keys[8]!}, 'content']
    const misplaced = {_type: 'span', _key: keys[2]!, text: 'foo', marks: []}
    const first = {
      _type: 'block',
      _key: keys[0]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
    }
    const last = {
      _type: 'block',
      _key: keys[5]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[6]!, text: 'baz', marks: []}],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        styles: [{name: 'normal'}, {name: 'h1'}],
        lists: [{name: 'bullet'}],
        annotations: [{name: 'link'}],
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'callout'}],
              },
            ],
          },
        ],
      }),
      initialValue: [
        {_type: 'callout', _key: keys[8]!, content: [first, misplaced, last]},
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
          ]}
        />
      ),
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [...prefix, {_key: keys[0]!}, 'children', {_key: keys[1]!}],
          offset: 0,
        },
        focus: {
          path: [...prefix, {_key: keys[5]!}, 'children', {_key: keys[6]!}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'decorator.toggle', decorator: 'strong'})
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[8]!,
          content: [
            {...first, children: [{...first.children[0], marks: ['strong']}]},
            misplaced,
            {...last, children: [{...last.children[0], marks: ['strong']}]},
          ],
        },
      ]),
    )
  })
  test('Scenario: decorator across a misplaced span at nested callout preserves its payload', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = Array.from({length: 10}, () => keyGenerator())
    const prefix = [{_key: keys[9]!}, 'content', {_key: keys[8]!}, 'content']
    const misplaced = {_type: 'span', _key: keys[2]!, text: 'foo', marks: []}
    const first = {
      _type: 'block',
      _key: keys[0]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
    }
    const last = {
      _type: 'block',
      _key: keys[5]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keys[6]!, text: 'baz', marks: []}],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        styles: [{name: 'normal'}, {name: 'h1'}],
        lists: [{name: 'bullet'}],
        annotations: [{name: 'link'}],
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'callout'}],
              },
            ],
          },
        ],
      }),
      initialValue: [
        {
          _type: 'callout',
          _key: keys[9]!,
          content: [
            {
              _type: 'callout',
              _key: keys[8]!,
              content: [first, misplaced, last],
            },
          ],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
          ]}
        />
      ),
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [...prefix, {_key: keys[0]!}, 'children', {_key: keys[1]!}],
          offset: 0,
        },
        focus: {
          path: [...prefix, {_key: keys[5]!}, 'children', {_key: keys[6]!}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'decorator.toggle', decorator: 'strong'})
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: keys[9]!,
          content: [
            {
              _type: 'callout',
              _key: keys[8]!,
              content: [
                {
                  ...first,
                  children: [{...first.children[0], marks: ['strong']}],
                },
                misplaced,
                {...last, children: [{...last.children[0], marks: ['strong']}]},
              ],
            },
          ],
        },
      ]),
    )
  })
  test('Scenario: explicit insert.text preserves a misplaced span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const misplaced = {_type: 'span', _key: keyGenerator(), text: 'foo'}
    const block = {
      _type: 'block',
      _key: keyGenerator(),
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keyGenerator(), text: 'bar', marks: []}],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [misplaced, block],
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: misplaced._key}],
      offset: 3,
      text: 'baz',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: block._key}, 'children', {_key: block.children[0]!._key}],
      offset: 3,
      text: 'baz',
    })
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual([
        misplaced,
        {...block, children: [{...block.children[0], text: 'barbaz'}]},
      ]),
    )
  })

  test('Scenario: explicit remove.text preserves a misplaced span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const misplaced = {_type: 'span', _key: keyGenerator(), text: 'foo'}
    const block = {
      _type: 'block',
      _key: keyGenerator(),
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keyGenerator(), text: 'bar', marks: []}],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [misplaced, block],
    })
    editor.send({
      type: 'remove.text',
      at: [{_key: misplaced._key}],
      offset: 0,
      text: 'foo',
    })
    editor.send({
      type: 'insert.text',
      at: [{_key: block._key}, 'children', {_key: block.children[0]!._key}],
      offset: 3,
      text: 'baz',
    })
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual([
        misplaced,
        {...block, children: [{...block.children[0], text: 'barbaz'}]},
      ]),
    )
  })
})
