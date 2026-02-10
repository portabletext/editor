import {insert, set, setIfMissing, unset} from '@portabletext/patches'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema, type Patch} from '../src'
import {EventListenerPlugin} from '../src/plugins'
import {createTestEditor} from '../src/test/vitest'

describe('event.block.unset', () => {
  test('Scenario: `unset`ing block object property removes it', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'url', fields: [{name: 'href', type: 'string'}]}],
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

    const urlBlockKey = keyGenerator()

    editor.send({
      type: 'insert.block',
      block: {
        _key: urlBlockKey,
        _type: 'url',
        href: 'https://www.sanity.io',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: urlBlockKey,
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
    })

    editor.send({
      type: 'block.unset',
      at: [{_key: urlBlockKey}],
      props: ['href'],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: urlBlockKey,
          _type: 'url',
        },
      ])

      expect(patches).toEqual([
        setIfMissing([], []),
        set(
          [
            {
              _key: 'k0',
              _type: 'block',
              children: [{_key: 'k1', _type: 'span', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          [],
        ),
        insert(
          [
            {
              _key: urlBlockKey,
              _type: 'url',
              href: 'https://www.sanity.io',
            },
          ],
          'before',
          [{_key: 'k0'}],
        ),
        unset([{_key: 'k0'}]),
        unset([{_key: urlBlockKey}, 'href']),
      ])
    })
  })

  test('Scenario: `unset`ing block object `_key` `set`s a new `_key`', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'url', fields: [{name: 'href', type: 'string'}]}],
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

    const urlBlockKey = keyGenerator()

    editor.send({
      type: 'insert.block',
      block: {
        _key: urlBlockKey,
        _type: 'url',
        href: 'https://www.sanity.io',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: urlBlockKey,
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
      expect(patches).toEqual([
        setIfMissing([], []),
        set(
          [
            {
              _key: 'k0',
              _type: 'block',
              children: [{_key: 'k1', _type: 'span', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          [],
        ),
        insert(
          [
            {
              _key: urlBlockKey,
              _type: 'url',
              href: 'https://www.sanity.io',
            },
          ],
          'before',
          [{_key: 'k0'}],
        ),
        unset([{_key: 'k0'}]),
      ])
    })

    editor.send({
      type: 'block.unset',
      at: [{_key: urlBlockKey}],
      props: ['_key'],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toMatchObject([
        {
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
      expect(editor.getSnapshot().context.value[0]!._key).not.toEqual(
        urlBlockKey,
      )
      expect(patches.slice(4)).toEqual([set('k3', [0, '_key'])])
    })
  })

  test('Scenario: `unset`ing block object `_type` is a noop', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'url', fields: [{name: 'href', type: 'string'}]}],
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

    const urlBlockKey = keyGenerator()

    editor.send({
      type: 'insert.block',
      block: {
        _key: urlBlockKey,
        _type: 'url',
        href: 'https://www.sanity.io',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: urlBlockKey,
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
    })

    editor.send({
      type: 'block.unset',
      at: [{_key: urlBlockKey}],
      props: ['_type', 'href'],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: urlBlockKey,
          _type: 'url',
        },
      ])

      expect(patches).toEqual([
        setIfMissing([], []),
        set(
          [
            {
              _key: 'k0',
              _type: 'block',
              children: [{_key: 'k1', _type: 'span', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          [],
        ),
        insert(
          [
            {
              _key: urlBlockKey,
              _type: 'url',
              href: 'https://www.sanity.io',
            },
          ],
          'before',
          [{_key: 'k0'}],
        ),
        unset([{_key: 'k0'}]),
        unset([{_key: urlBlockKey}, 'href']),
      ])
    })
  })

  test('Scenario: `unset`ing text block `markDefs` removes the annotation', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const textBlockKey = keyGenerator()
    const spanKey = keyGenerator()
    const annotationKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        lists: [{name: 'bullet'}],
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
      initialValue: [
        {
          _key: textBlockKey,
          _type: 'block',
          children: [
            {
              _key: spanKey,
              _type: 'span',
              text: 'foo ',
              marks: [annotationKey],
            },
          ],
          style: 'normal',
          markDefs: [
            {_key: annotationKey, _type: 'link', href: 'https://example.com'},
          ],
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
      type: 'block.unset',
      at: [{_key: textBlockKey}],
      props: ['markDefs'],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: textBlockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo ', marks: []}],
          style: 'normal',
          markDefs: [],
        },
      ])

      expect(patches).toEqual([
        unset([{_key: textBlockKey}, 'markDefs']),
        set([], [{_key: textBlockKey}, 'markDefs']),
        set([], [{_key: textBlockKey}, 'children', {_key: spanKey}, 'marks']),
      ])
    })
  })

  test('Scenario: `unset`ing text block `style` `set`s the default style', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        styles: [{name: 'normal'}, {name: 'h1'}],
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

    const textBlockKey = keyGenerator()

    editor.send({
      type: 'insert.block',
      block: {
        _key: textBlockKey,
        _type: 'block',
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'Hello, world!'},
        ],
        style: 'h1',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: textBlockKey,
          _type: 'block',
          children: [
            {_key: 'k3', _type: 'span', text: 'Hello, world!', marks: []},
          ],
          markDefs: [],
          style: 'h1',
        },
      ])
      expect(patches).toEqual([
        setIfMissing([], []),
        set(
          [
            {
              _key: 'k0',
              _type: 'block',
              children: [{_key: 'k1', _type: 'span', text: '', marks: []}],
              style: 'normal',
              markDefs: [],
            },
          ],
          [],
        ),
        insert(
          [
            {
              _key: textBlockKey,
              _type: 'block',
              children: [
                {_key: 'k3', _type: 'span', text: 'Hello, world!', marks: []},
              ],
              style: 'h1',
            },
          ],
          'before',
          [{_key: 'k0'}],
        ),
        unset([{_key: 'k0'}]),
        set([], [{_key: textBlockKey}, 'markDefs']),
      ])
    })

    editor.send({
      type: 'block.unset',
      at: [{_key: textBlockKey}],
      props: ['style'],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: textBlockKey,
          _type: 'block',
          children: [
            {_key: 'k3', _type: 'span', text: 'Hello, world!', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches.slice(5)).toEqual([
        unset([{_key: textBlockKey}, 'style']),
        set('normal', [{_key: textBlockKey}, 'style']),
      ])
    })
  })

  test('Scenario: `unset`ing text block `listItem` and `level` removes them', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const block = {
      _key: blockKey,
      _type: 'block',
      children: [
        {_key: keyGenerator(), _type: 'span', text: 'Hello, world!', marks: []},
      ],

      style: 'normal',
      markDefs: [],
    }
    const listProps = {
      listItem: 'bullet',
      level: 1,
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [{...block, ...listProps}],
      schemaDefinition: defineSchema({
        lists: [{name: 'bullet'}],
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

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {...block, ...listProps},
      ])
    })

    editor.send({
      type: 'block.unset',
      at: [{_key: blockKey}],
      props: ['listItem', 'level'],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([block])
    })

    await vi.waitFor(() => {
      return expect(patches).toEqual([
        unset([{_key: blockKey}, 'listItem']),
        unset([{_key: blockKey}, 'level']),
      ])
    })
  })

  test('Scenario: `unset`ing text block `_key` `set`s a new `_key`', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
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
      type: 'block.unset',
      props: ['_key'],
      at: [{_key: 'k0'}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k2',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(patches).toEqual([setIfMissing([], []), set('k2', [0, '_key'])])
    })
  })

  test('Scenario: `unset`ing text block `_type` is a noop', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        styles: [{name: 'normal'}, {name: 'h1'}],
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

    const textBlockKey = keyGenerator()

    editor.send({
      type: 'insert.block',
      block: {
        _key: textBlockKey,
        _type: 'block',
        children: [
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'Hello, world!',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'h1',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: textBlockKey,
          _type: 'block',
          children: [
            {_key: 'k3', _type: 'span', text: 'Hello, world!', marks: []},
          ],
          markDefs: [],
          style: 'h1',
        },
      ])
      expect(patches.slice(4)).toEqual([])
    })

    editor.send({
      type: 'block.unset',
      at: [{_key: textBlockKey}],
      props: ['_type', 'style'],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: textBlockKey,
          _type: 'block',
          children: [
            {_key: 'k3', _type: 'span', text: 'Hello, world!', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches.slice(4)).toEqual([
        unset([{_key: textBlockKey}, 'style']),
        set('normal', [{_key: textBlockKey}, 'style']),
      ])
    })
  })

  test('Scenario: `unset`ing text block children is a noop', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        styles: [{name: 'normal'}, {name: 'h1'}],
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

    const textBlockKey = keyGenerator()

    editor.send({
      type: 'insert.block',
      block: {
        _key: textBlockKey,
        _type: 'block',
        children: [
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'Hello, world!',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'h1',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: textBlockKey,
          _type: 'block',
          children: [
            {_key: 'k3', _type: 'span', text: 'Hello, world!', marks: []},
          ],
          markDefs: [],
          style: 'h1',
        },
      ])
      expect(patches.slice(4)).toEqual([])
    })

    editor.send({
      type: 'block.unset',
      at: [{_key: textBlockKey}],
      props: ['children', 'style'],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: textBlockKey,
          _type: 'block',
          children: [
            {_key: 'k3', _type: 'span', text: 'Hello, world!', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches.slice(4)).toEqual([
        unset([{_key: textBlockKey}, 'style']),
        set('normal', [{_key: textBlockKey}, 'style']),
      ])
    })
  })
})
