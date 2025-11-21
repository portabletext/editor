import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema, type Patch} from '../src'
import {EventListenerPlugin} from '../src/plugins'
import {createTestEditor} from '../src/test/vitest'

describe('event.block.unset', () => {
  test('Scenario: removing block object property', async () => {
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
              patches.push(event.patch)
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
      expect(patches.slice(4)).toEqual([
        {
          origin: 'local',
          type: 'unset',
          path: [{_key: urlBlockKey}, 'href'],
        },
      ])
    })
  })

  test('Scenario: removing block object _key sets a new _key', async () => {
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
              patches.push(event.patch)
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
      expect(patches.slice(2)).toEqual([
        {
          origin: 'local',
          type: 'insert',
          path: [{_key: 'k0'}],
          position: 'before',
          items: [
            {
              _key: urlBlockKey,
              _type: 'url',
              href: 'https://www.sanity.io',
            },
          ],
        },
        {
          origin: 'local',
          type: 'unset',
          path: [{_key: 'k0'}],
        },
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
      expect(editor.getSnapshot().context.value[0]._key).not.toEqual(
        urlBlockKey,
      )
      expect(patches.slice(4)).toEqual([
        {
          origin: 'local',
          type: 'set',
          path: [0, '_key'],
          value: 'k3',
        },
        {
          origin: 'local',
          type: 'set',
          path: [{_key: 'k3'}, 'href'],
          value: 'https://www.sanity.io',
        },
      ])
    })
  })

  test('Scenario: removing block object _type is a noop', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'url', fields: [{name: 'href', type: 'string'}]}],
      }),
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
      props: ['_type'],
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
  })

  test('Scenario: removing text block listItem', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const textBlockKey = keyGenerator()
    const block = {
      _key: textBlockKey,
      _type: 'block',
      children: [
        {_key: keyGenerator(), _type: 'span', text: 'Hello, world!', marks: []},
      ],
      style: 'normal',
      markDefs: [],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        lists: [{name: 'bullet'}],
      }),
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
      type: 'insert.block',
      block: {
        ...block,
        listItem: 'bullet',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {...block, listItem: 'bullet'},
      ])
    })

    editor.send({
      type: 'block.unset',
      at: [{_key: textBlockKey}],
      props: ['listItem'],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([block])

      expect(patches.slice(4)).toEqual([
        {
          origin: 'local',
          type: 'unset',
          path: [{_key: textBlockKey}, 'listItem'],
        },
      ])
    })
  })

  test('Scenario: removing text block style', async () => {
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
              patches.push(event.patch)
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
      expect(patches.slice(2)).toEqual([
        {
          origin: 'local',
          type: 'insert',
          path: [{_key: 'k0'}],
          position: 'before',
          items: [
            {
              _key: textBlockKey,
              _type: 'block',
              children: [
                {_key: 'k3', _type: 'span', text: 'Hello, world!', marks: []},
              ],
              markDefs: [],
              style: 'h1',
            },
          ],
        },
        {
          origin: 'local',
          type: 'unset',
          path: [{_key: 'k0'}],
        },
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
      expect(patches.slice(4)).toEqual([
        {
          origin: 'local',
          type: 'unset',
          path: [{_key: textBlockKey}, 'style'],
        },
        {
          origin: 'local',
          type: 'set',
          path: [{_key: textBlockKey}, 'style'],
          value: 'normal',
        },
      ])
    })
  })

  test('Scenario: removing text block listItem', async () => {
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
              patches.push(event.patch)
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
        {
          origin: 'local',
          type: 'unset',
          path: [{_key: blockKey}, 'listItem'],
        },
        {
          origin: 'local',
          type: 'unset',
          path: [{_key: blockKey}, 'level'],
        },
      ])
    })
  })

  test('Scenario: Removing text block children is a noop', async () => {
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
              patches.push(event.patch)
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
        {
          origin: 'local',
          type: 'unset',
          path: [{_key: textBlockKey}, 'style'],
        },
        {
          origin: 'local',
          type: 'set',
          path: [{_key: textBlockKey}, 'style'],
          value: 'normal',
        },
      ])
    })
  })
})
