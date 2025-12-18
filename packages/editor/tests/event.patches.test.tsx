import {
  applyAll,
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {makeDiff, makePatches, stringifyPatches} from '@sanity/diff-match-patch'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema, type EditorEmittedEvent} from '../src'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor, createTestEditors} from '../src/test/vitest'

describe('event.patches', () => {
  test('Scenario: Consuming initial diffMatchPatch', async () => {
    const {editor, locator, onEditorEvent, editorB} = await createTestEditors()

    await userEvent.type(locator, 'f')

    await vi.waitFor(() => {
      expect(onEditorEvent).toHaveBeenCalledWith({
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          origin: 'local',
          path: [],
          value: [],
        },
      })
      expect(onEditorEvent).toHaveBeenCalledWith({
        type: 'patch',
        patch: {
          type: 'insert',
          origin: 'local',
          path: [0],
          position: 'before',
          items: [
            {
              _type: 'block',
              _key: 'ea-k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'ea-k1', text: '', marks: []}],
            },
          ],
        },
      })
      expect(onEditorEvent).toHaveBeenCalledWith({
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          origin: 'local',
          path: [{_key: 'ea-k0'}, 'children', {_key: 'ea-k1'}, 'text'],
          value: '@@ -0,0 +1 @@\n+f\n',
        },
      })
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'ea-k0',
          children: [{_type: 'span', _key: 'ea-k1', text: 'f', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(editorB.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'ea-k0',
          children: [{_type: 'span', _key: 'ea-k1', text: 'f', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Consuming initial insert patch', async () => {
    const {editor, onEditorEvent, editorB} = await createTestEditors()

    editor.send({type: 'focus'})
    await userEvent.keyboard('{Enter}')

    await vi.waitFor(() => {
      expect(onEditorEvent).toHaveBeenCalledWith({
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          origin: 'local',
          path: [],
          value: [],
        },
      })
      expect(onEditorEvent).toHaveBeenCalledWith({
        type: 'patch',
        patch: {
          type: 'insert',
          origin: 'local',
          path: [0],
          position: 'before',
          items: [
            {
              _type: 'block',
              _key: 'ea-k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'ea-k1', text: '', marks: []}],
            },
          ],
        },
      })
      expect(onEditorEvent).toHaveBeenCalledWith({
        type: 'patch',
        patch: {
          type: 'insert',
          origin: 'local',
          path: [{_key: 'ea-k0'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'ea-k2',
              children: [{_type: 'span', _key: 'ea-k3', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      })
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'ea-k0',
          children: [{_type: 'span', _key: 'ea-k1', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'ea-k2',
          children: [{_type: 'span', _key: 'ea-k3', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(editorB.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'ea-k0',
          children: [{_type: 'span', _key: 'ea-k1', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'ea-k2',
          children: [{_type: 'span', _key: 'ea-k3', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Splitting initial block', async () => {
    const {editor, onEditorEvent, editorB, locator} = await createTestEditors()

    await userEvent.click(locator)
    await userEvent.keyboard('{Enter}')

    await vi.waitFor(() => {
      expect(onEditorEvent).toHaveBeenCalledWith({
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          origin: 'local',
          path: [],
          value: [],
        },
      })
      expect(onEditorEvent).toHaveBeenCalledWith({
        type: 'patch',
        patch: {
          type: 'insert',
          origin: 'local',
          path: [0],
          position: 'before',
          items: [
            {
              _type: 'block',
              _key: 'ea-k0',
              children: [{_type: 'span', _key: 'ea-k1', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      })
      expect(onEditorEvent).toHaveBeenCalledWith({
        type: 'patch',
        patch: {
          type: 'insert',
          origin: 'local',
          path: [{_key: 'ea-k0'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'ea-k2',
              children: [{_type: 'span', _key: 'ea-k3', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      })
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'ea-k0',
          children: [{_type: 'span', _key: 'ea-k1', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'ea-k2',
          children: [{_type: 'span', _key: 'ea-k3', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(editorB.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'ea-k0',
          children: [{_type: 'span', _key: 'ea-k1', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'ea-k2',
          children: [{_type: 'span', _key: 'ea-k3', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Patching while syncing initial value', async () => {
    const keyGenerator = createTestKeyGenerator()
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
    const headingBlock = {
      _type: 'block',
      _key: keyGenerator(),
      children: [
        {
          _type: 'span',
          _key: keyGenerator(),
          text: 'foo',
          marks: [],
        },
      ],
      markDefs: [],
      style: 'h1',
    }

    const {editor} = await createTestEditor({
      initialValue: [listBlock],
      keyGenerator,
      schemaDefinition: defineSchema({
        lists: [{name: 'bullet'}],
        styles: [{name: 'normal'}, {name: 'h1'}],
      }),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'setIfMissing',
          path: [],
          value: [],
          origin: 'remote',
        },
        {
          type: 'insert',
          position: 'before',
          path: [
            {
              _key: listBlock._key,
            },
          ],
          items: [headingBlock],
          origin: 'remote',
        },
      ],
      snapshot: [headingBlock, listBlock],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        headingBlock,
        listBlock,
      ])
    })
  })

  test('Scenario: Patching while syncing incoming value', async () => {
    const keyGenerator = createTestKeyGenerator()
    const onEvent = vi.fn<() => EditorEmittedEvent>()
    const {editor} = await createTestEditor({
      children: <EventListenerPlugin on={onEvent} />,
      keyGenerator,
      schemaDefinition: defineSchema({
        lists: [{name: 'bullet'}],
        styles: [{name: 'normal'}, {name: 'h1'}],
      }),
    })

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
    const headingBlock = {
      _type: 'block',
      _key: keyGenerator(),
      children: [
        {
          _type: 'span',
          _key: keyGenerator(),
          text: 'foo',
          marks: [],
        },
      ],
      markDefs: [],
      style: 'h1',
    }

    editor.send({
      type: 'update value',
      value: [listBlock],
    })

    await vi.waitFor(() => {
      expect(onEvent).toHaveBeenCalledWith({type: 'ready'})
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'setIfMissing',
          path: [],
          value: [],
          origin: 'remote',
        },
        {
          type: 'insert',
          position: 'before',
          path: [
            {
              _key: listBlock._key,
            },
          ],
          items: [headingBlock],
          origin: 'remote',
        },
      ],
      snapshot: [headingBlock, listBlock],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        headingBlock,
        listBlock,
      ])
    })
  })

  test('Scenario: Merging spans', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const aKey = keyGenerator()
    const cKey = keyGenerator()
    const bKey = keyGenerator()

    const {editor} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: aKey, text: 'a', marks: ['strong']},
            {_type: 'span', _key: bKey, text: 'b', marks: []},
            {_type: 'span', _key: cKey, text: 'c', marks: ['strong']},
          ],
        },
      ],
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: blockKey}, 'children', {_key: bKey}, 'marks'],
          value: ['strong'],
        },
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: blockKey}, 'children', {_key: aKey}, 'text'],
          value: 'ab',
        },
        {
          type: 'unset',
          origin: 'remote',
          path: [{_key: blockKey}, 'children', {_key: bKey}],
        },
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: blockKey}, 'children', {_key: aKey}, 'text'],
          value: 'abc',
        },
        {
          type: 'unset',
          origin: 'remote',
          path: [{_key: blockKey}, 'children', {_key: cKey}],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: aKey, text: 'abc', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: `set` span properties', async () => {
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
        },
      ],
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
          value: 'bar',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, '_map'],
          value: {},
        },
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, '_map', 'foo'],
          value: 'bar',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {
              _type: 'span',
              _key: 'k1',
              text: 'bar',
              marks: [],
              _map: {foo: 'bar'},
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'marks'],
          value: ['strong'],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {
              _type: 'span',
              _key: 'k1',
              text: 'bar',
              marks: ['strong'],
              _map: {foo: 'bar'},
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: `unset` span properties', async () => {
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {
              _type: 'span',
              _key: 'k1',
              text: 'foo',
              marks: [],
              _map: {foo: 'bar'},
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'unset',
          origin: 'remote',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, '_map'],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'unset',
          origin: 'remote',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: `unset` lonely block', async () => {
    let foreignValue: Array<PortableTextBlock> | undefined
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        block: {fields: [{name: 'foo', type: 'string'}]},
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

    editor.send({
      type: 'patches',
      patches: [{type: 'unset', origin: 'remote', path: [{_key: 'k0'}]}],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k2',
          _type: 'block',
          children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(foreignValue).toEqual(undefined)
      expect(patches).toEqual([])
    })

    editor.send({
      type: 'block.set',
      at: [{_key: 'k2'}],
      props: {
        foo: 'bar',
      },
    })

    await vi.waitFor(() => {
      const expectedValue = [
        {
          _key: 'k2',
          _type: 'block',
          children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
          foo: 'bar',
        },
      ]

      expect(editor.getSnapshot().context.value).toEqual(expectedValue)
      expect(foreignValue).toEqual(expectedValue)
      expect(patches).toEqual([
        setIfMissing([], []),
        insert(
          [
            {
              _key: 'k2',
              _type: 'block',
              children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          'before',
          [0],
        ),
        set('bar', [{_key: 'k2'}, 'foo']),
      ])
    })
  })

  test('Scenario: `set` initial block object property', async () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _key: imageKey,
          _type: 'image',
        },
      ],
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: imageKey}, 'src'],
          value: 'https://www.sanity.io/logo.png',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: imageKey,
          _type: 'image',
          src: 'https://www.sanity.io/logo.png',
        },
      ])
    })
  })

  test('`set` block object properties', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'url',
            fields: [
              {name: 'description', type: 'string'},
              {name: 'href', type: 'string'},
            ],
          },
        ],
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

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k2',
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: 'k2'}, 'description'],
          value: 'Sanity is a headless CMS',
        },
      ],
      snapshot: [
        {
          _key: 'k2',
          _type: 'url',
          href: 'https://www.sanity.io',
          description: 'Sanity is a headless CMS',
        },
      ],
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k2',
          _type: 'url',
          description: 'Sanity is a headless CMS',
          href: 'https://www.sanity.io',
        },
      ])
    })
  })

  test('`set` nested block object properties', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'url',
            fields: [
              {name: 'content', type: 'object'},
              {name: 'href', type: 'string'},
            ],
          },
        ],
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

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k2',
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: 'k2'}, 'content'],
          value: {},
        },
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: 'k2'}, 'content', 'description'],
          value: 'Sanity is a headless CMS',
        },
      ],
      snapshot: [
        {
          _key: 'k2',
          _type: 'url',
          href: 'https://www.sanity.io',
          content: {
            description: 'Sanity is a headless CMS',
          },
        },
      ],
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k2',
          _type: 'url',
          href: 'https://www.sanity.io',
          content: {
            description: 'Sanity is a headless CMS',
          },
        },
      ])
    })
  })

  test('Scenario: `unset` block object properties', async () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _key: imageKey,
          _type: 'image',
          src: 'https://www.sanity.io/logo.png',
          _map: {foo: 'bar'},
        },
      ],
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
    })

    editor.send({
      type: 'patches',
      patches: [{type: 'unset', origin: 'remote', path: [{_key: 'k0'}, 'src']}],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: imageKey,
          _type: 'image',
          _map: {foo: 'bar'},
        },
      ])
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'unset',
          origin: 'remote',
          path: [{_key: imageKey}, '_map', 'foo'],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: imageKey,
          _type: 'image',
          _map: {},
        },
      ])
    })

    editor.send({
      type: 'patches',
      patches: [
        {type: 'unset', origin: 'remote', path: [{_key: imageKey}, '_map']},
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: imageKey,
          _type: 'image',
        },
      ])
    })
  })

  test('Scenario: `unset` `listItem` and `level`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          style: 'normal',
          markDefs: [],
          listItem: 'bullet',
          level: 1,
        },
      ],
      keyGenerator,
      schemaDefinition: defineSchema({
        lists: [{name: 'bullet'}],
      }),
    })

    editor.send({
      type: 'patches',
      patches: [
        {type: 'unset', origin: 'remote', path: [{_key: blockKey}, 'listItem']},
        {type: 'unset', origin: 'remote', path: [{_key: blockKey}, 'level']},
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          style: 'normal',
          markDefs: [],
        },
      ])
    })
  })

  test('Scenario: Inserting inline object', async () => {
    const {editor, editorB} = await createTestEditors({
      schemaDefinition: defineSchema({
        inlineObjects: [
          {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
        ],
      }),
    })

    editor.send({type: 'focus'})
    editor.send({
      type: 'insert.inline object',
      inlineObject: {
        name: 'stock-ticker',
      },
    })

    const value = [
      {
        _key: 'ea-k0',
        _type: 'block',
        children: [
          {_type: 'span', _key: 'ea-k1', text: '', marks: []},
          {_type: 'stock-ticker', _key: 'ea-k2'},
          {_type: 'span', _key: 'ea-k3', text: '', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(value)
      expect(editorB.getSnapshot().context.value).toEqual(value)
    })
  })

  test('Scenario: `set` inline object properties', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const span1Key = keyGenerator()
    const stockTickerKey = keyGenerator()
    const span2Key = keyGenerator()
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_type: 'span', _key: span1Key, text: '', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey},
            {_type: 'span', _key: span2Key, text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [
          {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
        ],
      }),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [
            {_key: blockKey},
            'children',
            {_key: stockTickerKey},
            'symbol',
          ],
          value: 'AAPL',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_type: 'span', _key: span1Key, text: '', marks: []},
            {
              _type: 'stock-ticker',
              _key: stockTickerKey,
              symbol: 'AAPL',
            },
            {_type: 'span', _key: span2Key, text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: blockKey}, 'children', {_key: stockTickerKey}, '_map'],
          value: {},
        },
        {
          type: 'set',
          origin: 'remote',
          path: [
            {_key: blockKey},
            'children',
            {_key: stockTickerKey},
            '_map',
            'foo',
          ],
          value: 'bar',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_type: 'span', _key: span1Key, text: '', marks: []},
            {
              _type: 'stock-ticker',
              _key: stockTickerKey,
              symbol: 'AAPL',
              _map: {foo: 'bar'},
            },
            {_type: 'span', _key: span2Key, text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: `set` special inline object properties is a noop', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const span1Key = keyGenerator()
    const stockTickerKey = keyGenerator()
    const span2Key = keyGenerator()

    const {editor} = await createTestEditor({
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_type: 'span', _key: span1Key, text: '', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey},
            {_type: 'span', _key: span2Key, text: '', marks: []},
          ],
        },
      ],
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [
          {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
        ],
      }),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: blockKey}, 'children', {_key: stockTickerKey}, '_key'],
          value: 'new key',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_type: 'span', _key: span1Key, text: '', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey},
            {_type: 'span', _key: span2Key, text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: blockKey}, 'children', {_key: stockTickerKey}, '_type'],
          value: 'new type',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_type: 'span', _key: span1Key, text: '', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey},
            {_type: 'span', _key: span2Key, text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: `set`ing "text" field on inline object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const span1Key = keyGenerator()
    const mentionKey = keyGenerator()
    const span2Key = keyGenerator()
    const initialValue = [
      {
        _key: blockKey,
        _type: 'block',
        children: [
          {_type: 'span', _key: span1Key, text: '', marks: []},
          {
            _type: 'mention',
            _key: mentionKey,
            text: 'John Doe',
          },
          {
            _type: 'span',
            _key: span2Key,
            text: '',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor} = await createTestEditor({
      initialValue,
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [
          {name: 'mention', fields: [{name: 'text', type: 'string'}]},
        ],
      }),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: mentionKey}, 'text'],
          value: 'Jane Doe',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_type: 'span', _key: span1Key, text: '', marks: []},
            {_type: 'mention', _key: mentionKey, text: 'Jane Doe'},
            {_type: 'span', _key: span2Key, text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: `unset` inline object properties', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const span1Key = keyGenerator()
    const stockTickerKey = keyGenerator()
    const span2Key = keyGenerator()
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_type: 'span', _key: span1Key, text: '', marks: []},
            {
              _type: 'stock-ticker',
              _key: stockTickerKey,
              symbol: 'AAPL',
              _map: {foo: 'bar'},
            },
            {_type: 'span', _key: span2Key, text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [
          {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
        ],
      }),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'unset',
          origin: 'remote',
          path: [
            {_key: blockKey},
            'children',
            {_key: stockTickerKey},
            'symbol',
          ],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_type: 'span', _key: span1Key, text: '', marks: []},
            {
              _type: 'stock-ticker',
              _key: stockTickerKey,
              _map: {foo: 'bar'},
            },
            {_type: 'span', _key: span2Key, text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: `unset` reserved inline object properties', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const span1Key = keyGenerator()
    const stockTickerKey = keyGenerator()
    const span2Key = keyGenerator()
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_type: 'span', _key: span1Key, text: '', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey},
            {_type: 'span', _key: span2Key, text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [
          {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
        ],
      }),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'unset',
          origin: 'remote',
          path: [{_key: blockKey}, 'children', {_key: stockTickerKey}, '_key'],
        },
        {
          type: 'unset',
          origin: 'remote',
          path: [{_key: blockKey}, 'children', {_key: stockTickerKey}, '_type'],
        },
        {
          type: 'unset',
          origin: 'remote',
          path: [
            {_key: blockKey},
            'children',
            {_key: stockTickerKey},
            'children',
          ],
        },
        {
          type: 'unset',
          origin: 'remote',
          path: [
            {_key: blockKey},
            'children',
            {_key: stockTickerKey},
            '__inline',
          ],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_type: 'span', _key: span1Key, text: '', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey},
            {_type: 'span', _key: span2Key, text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: `set`ing `style` on text block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: blockKey}, 'style'],
          value: 'h1',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'h1',
        },
      ])
    })
  })

  test('Scenario: `set`ing deep inside text block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const markDefKey = keyGenerator()
    const imageKey = keyGenerator()
    const initialValue = [
      {
        _key: blockKey,
        _type: 'block',
        children: [
          {
            _key: fooKey,
            _type: 'span',
            text: 'foo ',
            marks: [markDefKey],
          },
        ],
        markDefs: [
          {
            _key: markDefKey,
            _type: 'link',
          },
        ],
        style: 'normal',
      },
      {
        _key: imageKey,
        _type: 'image',
      },
    ]

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: defineSchema({blockObjects: [{name: 'image'}]}),
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: blockKey}, 'markDefs', {_key: markDefKey}, 'href'],
          value: 'https://www.sanity.io',
        },
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: imageKey}, 'alt'],
          value: 'An image',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          ...initialValue[0],
          markDefs: [
            {
              _key: markDefKey,
              _type: 'link',
              href: 'https://www.sanity.io',
            },
          ],
        },
        {
          _key: imageKey,
          _type: 'image',
          alt: 'An image',
        },
      ])
    })
  })

  test('Scenario: `unset`ing last text block and `insert`ing a new one', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await userEvent.click(locator)
    await userEvent.type(locator, ' bar')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo bar'])
    })

    editor.send({
      type: 'patches',
      patches: [
        {type: 'unset', origin: 'remote', path: [{_key: blockKey}]},
        {
          type: 'insert',
          origin: 'remote',
          path: [0],
          position: 'before',
          items: [
            {
              _type: 'block',
              _key: keyGenerator(),
              children: [
                {_type: 'span', _key: keyGenerator(), text: 'baz', marks: []},
              ],
            },
          ],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['baz'])
    })
  })

  describe('Feature: diffMatchPatch', () => {
    async function createEditor(text: string) {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      const {editor} = await createTestEditor({
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {
                _key: spanKey,
                _type: 'span',
                text,
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        keyGenerator,
        schemaDefinition: defineSchema({}),
      })

      return {editor, keyGenerator, blockKey, spanKey}
    }

    test('Scenario: Adding and removing text to an empty editor', async () => {
      const {editor} = await createTestEditor({
        schemaDefinition: defineSchema({}),
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'diffMatchPatch',
            origin: 'remote',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: '@@ -0,0 +1 @@\n+e\n',
          },
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'e', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'diffMatchPatch',
            origin: 'remote',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: '@@ -1 +0,0 @@\n-e\n',
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
        ])
      })
    })

    test('Scenario: Adding text', async () => {
      const editorText = 'Hello'
      const incomingText = 'Hello there'
      const {editor, blockKey, spanKey} = await createEditor(editorText)

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'diffMatchPatch',
            origin: 'remote',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
            value: stringifyPatches(
              makePatches(makeDiff(editorText, incomingText)),
            ),
          },
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {
                _key: spanKey,
                _type: 'span',
                text: incomingText,
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
    })

    test('Scenario: Removing text', async () => {
      const editorText = 'Hello there'
      const incomingText = 'Hello'
      const {editor, blockKey, spanKey} = await createEditor(editorText)

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'diffMatchPatch',
            origin: 'remote',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
            value: stringifyPatches(
              makePatches(makeDiff(editorText, incomingText)),
            ),
          },
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {
                _key: spanKey,
                _type: 'span',
                text: incomingText,
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
    })

    test('Scenario: Same text', async () => {
      const editorText = 'Hello'
      const incomingText = 'Hello'
      const {editor, blockKey, spanKey} = await createEditor(editorText)

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'diffMatchPatch',
            origin: 'remote',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
            value: stringifyPatches(
              makePatches(makeDiff(editorText, incomingText)),
            ),
          },
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {
                _key: spanKey,
                _type: 'span',
                text: incomingText,
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
    })

    test('Scenario: Adding and removing text', async () => {
      const editorText = 'A quick brown fox jumps over the very lazy dog'
      const incomingText = 'The quick brown fox jumps over the lazy dog'
      const {editor, blockKey, spanKey} = await createEditor(editorText)

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'diffMatchPatch',
            origin: 'remote',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
            value: stringifyPatches(
              makePatches(makeDiff(editorText, incomingText)),
            ),
          },
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {
                _key: spanKey,
                _type: 'span',
                text: incomingText,
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
    })

    test('Scenario: Adding and removing text #2', async () => {
      const editorText = 'Many quick brown fox jumps over the very lazy dog'
      const incomingText =
        'The many, quick, brown, foxes jumps over all of the lazy dogs'
      const {editor, blockKey, spanKey} = await createEditor(editorText)

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'diffMatchPatch',
            origin: 'remote',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
            value: stringifyPatches(
              makePatches(makeDiff(editorText, incomingText)),
            ),
          },
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {
                _key: spanKey,
                _type: 'span',
                text: incomingText,
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
    })

    test('Scenario: Reverse line edits', async () => {
      const line1 = 'The quick brown fox jumps over the lazy dog'
      const line2 = 'But the slow green frog jumps over the wild cat'
      const editorText = [line1, line2, line1, line2].join('\n')
      const incomingText = [line2, line1, line2, line1].join('\n')

      const {editor, blockKey, spanKey} = await createEditor(editorText)

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'diffMatchPatch',
            origin: 'remote',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
            value: stringifyPatches(
              makePatches(makeDiff(editorText, incomingText)),
            ),
          },
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {
                _key: spanKey,
                _type: 'span',
                text: incomingText,
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
    })

    test('Scenario: Larger text differences', async () => {
      const editorText = `Portable Text is a agnostic abstraction of "rich text" that can be stringified into any markup language, for instance HTML, Markdown, SSML, XML, etc. It's designed to be efficient for collaboration, and makes it possible to enrich rich text with data structures in depth.\n\nPortable Text is built on the idea of rich text as an array of blocks, themselves arrays of children spans. Each block can have a style and a set of mark dfinitions, which describe data structures distributed on the children spans. Portable Text also allows for inserting arbitrary data objects in the array, only requiring _type-key. Portable Text also allows for custom objects in the root array, enabling rendering environments to mix rich text with custom content types.\n\nPortable Text is a combination of arrays and objects. In its simplest form it's an array of objects with an array of children. Some definitions: \n- Block: Typically recognized as a section of a text, e.g. a paragraph or a heading.\n- Span: Piece of text with a set of marks, e.g. bold or italic.\n- Mark: A mark is a data structure that can be appliad to a span, e.g. a link or a comment.\n- Mark definition: A mark definition is a structure that describes a mark, a link or a comment.`
      const incomingText = `Portable Text is an agnostic abstraction of rich text that can be serialized into pretty much any markup language, be it HTML, Markdown, SSML, XML, etc. It is designed to be efficient for real-time collaborative interfaces, and makes it possible to annotate rich text with additional data structures recursively.\n\nPortable Text is built on the idea of rich text as an array of blocks, themselves arrays of child spans. Each block can have a style and a set of mark definitions, which describe data structures that can be applied on the children spans. Portable Text also allows for inserting arbitrary data objects in the array, only requiring _type-key. Portable Text also allows for custom content objects in the root array, enabling editing- and rendering environments to mix rich text with custom content types.\n\nPortable Text is a recursive composition of arrays and objects. In its simplest form it's an array of objects of a type with an array of children. Some definitions: \n- Block: A block is what's typically recognized as a section of a text, e.g. a paragraph or a heading.\n- Span: A span is a piece of text with a set of marks, e.g. bold or italic.\n- Mark: A mark is a data structure that can be applied to a span, e.g. a link or a comment.\n- Mark definition: A mark definition is a data structure that describes a mark, e.g. a link or a comment.`

      const {editor, blockKey, spanKey} = await createEditor(editorText)

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'diffMatchPatch',
            origin: 'remote',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
            value: stringifyPatches(
              makePatches(makeDiff(editorText, incomingText)),
            ),
          },
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {
                _key: spanKey,
                _type: 'span',
                text: incomingText,
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
    })

    test('Scenario: Offset text differences', async () => {
      const editorText = `This string has changes, but they occur somewhere near the end. That means we need to use an offset to get at the change, we cannot just rely on equality segaments in the generated diff.`
      const incomingText = `This string has changes, but they occur somewhere near the end. That means we need to use an offset to get at the change, we cannot just rely on equality segments in the generated diff.`

      const {editor, blockKey, spanKey} = await createEditor(editorText)

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'diffMatchPatch',
            origin: 'remote',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
            value: stringifyPatches(
              makePatches(makeDiff(editorText, incomingText)),
            ),
          },
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {
                _key: spanKey,
                _type: 'span',
                text: incomingText,
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
    })
  })

  test('Scenario: `set` block with new markDef', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const linkKey = keyGenerator()
    const newLinkKey = keyGenerator()

    // Given the text foo,bar
    // And a link around "foo"
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: fooKey, _type: 'span', text: 'foo', marks: [linkKey]},
            {_key: barKey, _type: 'span', text: 'bar', marks: []},
          ],
          markDefs: [{_key: linkKey, _type: 'link'}],
          style: 'normal',
        },
      ],
      schemaDefinition: defineSchema({
        annotations: [{name: 'link'}],
        styles: [{name: 'normal'}, {name: 'h1'}],
      }),
    })

    // When the cursor is put after "foo b"
    await userEvent.click(locator)
    const midBarSelection = {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: barKey}],
        offset: 1,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: barKey}],
        offset: 1,
      },
      backward: false,
    }
    editor.send({
      type: 'select',
      at: midBarSelection,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(midBarSelection)
    })

    // And the block is replaced with a new block with different link _key
    const newBlock = {
      _key: blockKey,
      _type: 'block',
      children: [
        {_key: fooKey, _type: 'span', text: 'foo', marks: [newLinkKey]},
        {_key: barKey, _type: 'span', text: 'bar', marks: []},
      ],
      markDefs: [{_key: newLinkKey, _type: 'link'}],
      style: 'normal',
    }
    editor.send({
      type: 'patches',
      patches: [
        {
          origin: 'remote',
          type: 'set',
          path: [{_key: blockKey}],
          value: newBlock,
        },
      ],
      snapshot: [newBlock],
    })

    // Then the block is replaced with the new block
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([newBlock])
    })

    // And the selection is restored
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(midBarSelection)
    })
  })

  describe('`insert`', () => {
    test('Scenario: Inserting block object on empty editor', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          blockObjects: [{name: 'image'}],
        }),
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            ...unset([]),
            origin: 'remote',
          },
          {
            origin: 'remote',
            type: 'insert',
            position: 'before',
            path: [0],
            items: [
              {
                _key: blockKey,
                _type: 'image',
              },
            ],
          },
        ],
        snapshot: [
          {
            _key: blockKey,
            _type: 'image',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(getTersePt(editor.getSnapshot().context)).toEqual(['{image}'])
      })
    })

    test('Scenario: Inserting text block on empty editor', async () => {
      const patches: Array<Patch> = []
      const keyGenerator = createTestKeyGenerator()
      const spanKey = keyGenerator()
      const blockKey = keyGenerator()
      const block = {
        _key: blockKey,
        _type: 'block',
        children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      }
      let foreignValue = [block]
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          block: {fields: [{name: 'foo', type: 'string'}]},
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

      editor.send({
        type: 'patches',
        patches: [
          {
            ...unset([]),
            origin: 'remote',
          },
          {
            origin: 'remote',
            type: 'insert',
            position: 'before',
            path: [0],
            items: [block],
          },
        ],
        snapshot: [block],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([block])
        expect(patches).toEqual([])
      })

      editor.send({
        type: 'block.set',
        at: [{_key: blockKey}],
        props: {
          foo: 'bar',
        },
      })

      await vi.waitFor(() => {
        const expectedValue = [
          {
            ...block,
            foo: 'bar',
          },
        ]

        expect(editor.getSnapshot().context.value).toEqual(expectedValue)
        expect(foreignValue).toEqual(expectedValue)
        expect(patches).toEqual([set('bar', [{_key: blockKey}, 'foo'])])
      })
    })

    describe('Scenario Outline: Inserting two text blocks on empty editor', () => {
      test('Scenario: Both blocks are empty', async () => {
        const keyGenerator = createTestKeyGenerator()
        const {editor} = await createTestEditor({
          keyGenerator,
          schemaDefinition: defineSchema({}),
        })
        const blockAKey = keyGenerator()
        const spanAKey = keyGenerator()
        const blockBKey = keyGenerator()
        const spanBKey = keyGenerator()
        const blockA = {
          _key: blockAKey,
          _type: 'block',
          children: [{_key: spanAKey, _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        }
        const blockB = {
          _key: blockBKey,
          _type: 'block',
          children: [{_key: spanBKey, _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        }
        editor.send({
          type: 'patches',
          patches: [
            {
              origin: 'remote',
              type: 'insert',
              position: 'before',
              path: [0],
              items: [blockA, blockB],
            },
          ],
          snapshot: [blockA, blockB],
        })

        await vi.waitFor(() => {
          expect(editor.getSnapshot().context.value).toEqual([blockA, blockB])
        })
      })

      test('Scenario: First block is empty', async () => {
        const keyGenerator = createTestKeyGenerator()
        const {editor} = await createTestEditor({
          keyGenerator,
          schemaDefinition: defineSchema({}),
        })
        const blockAKey = keyGenerator()
        const spanAKey = keyGenerator()
        const blockBKey = keyGenerator()
        const spanBKey = keyGenerator()
        const blockA = {
          _key: blockAKey,
          _type: 'block',
          children: [{_key: spanAKey, _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        }
        const blockB = {
          _key: blockBKey,
          _type: 'block',
          children: [{_key: spanBKey, _type: 'span', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        }

        editor.send({
          type: 'patches',
          patches: [
            {
              origin: 'remote',
              type: 'insert',
              position: 'before',
              path: [0],
              items: [blockA, blockB],
            },
          ],
          snapshot: [blockA, blockB],
        })

        await vi.waitFor(() => {
          expect(editor.getSnapshot().context.value).toEqual([blockA, blockB])
        })
      })

      test('Scenario: Second block is empty', async () => {
        const keyGenerator = createTestKeyGenerator()
        const {editor} = await createTestEditor({
          keyGenerator,
          schemaDefinition: defineSchema({}),
        })
        const blockAKey = keyGenerator()
        const spanAKey = keyGenerator()
        const blockBKey = keyGenerator()
        const spanBKey = keyGenerator()
        const blockA = {
          _key: blockAKey,
          _type: 'block',
          children: [{_key: spanAKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        }
        const blockB = {
          _key: blockBKey,
          _type: 'block',
          children: [{_key: spanBKey, _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        }

        editor.send({
          type: 'patches',
          patches: [
            {
              origin: 'remote',
              type: 'insert',
              position: 'before',
              path: [0],
              items: [blockA, blockB],
            },
          ],
          snapshot: [blockA, blockB],
        })

        await vi.waitFor(() => {
          expect(editor.getSnapshot().context.value).toEqual([blockA, blockB])
        })
      })
    })
  })

  describe('`setIfMissing`', () => {
    test('Scenario: Setting empty array on non-empty editor is a noop', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      const initialBlock = {
        _key: blockKey,
        _type: 'block',
        children: [{_key: spanKey, _type: 'span', text: 'hello', marks: []}],
        markDefs: [],
        style: 'normal',
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [initialBlock],
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [],
            value: [],
          },
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([initialBlock])
      })
    })

    test('Scenario: Setting empty array on empty editor is a noop', async () => {
      const keyGenerator = createTestKeyGenerator()

      const {editor} = await createTestEditor({
        keyGenerator,
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [],
            value: [],
          },
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          // Original placeholder
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
    })

    test('Scenario: Setting missing text block property', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const block = {
        _key: blockKey,
        _type: 'block',
        children: [{_key: spanKey, _type: 'span', text: '', marks: []}],
        markDefs: [],
        style: 'normal',
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [block],
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'level'],
            value: 1,
          },
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {...block, level: 1},
        ])
      })
    })

    test('Scenario: Setting existing text block property is a noop', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const block = {
        _key: blockKey,
        _type: 'block',
        children: [{_key: spanKey, _type: 'span', text: '', marks: []}],
        markDefs: [],
        style: 'h1',
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          styles: [{name: 'normal'}, {name: 'h1'}],
        }),
        initialValue: [block],
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'style'],
            value: 'normal',
          },
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([block])
      })
    })

    test('Scenario: Setting nested text block property', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const block = {
        _key: blockKey,
        _type: 'block',
        children: [{_key: spanKey, _type: 'span', text: '', marks: []}],
        markDefs: [],
        style: 'normal',
        foo: {},
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [block],
        schemaDefinition: defineSchema({
          block: {fields: [{name: 'foo', type: 'object'}]},
        }),
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'foo', 'bar'],
            value: 'baz',
          },
        ],
        snapshot: undefined,
      })

      expect(editor.getSnapshot().context.value).toEqual([
        {
          ...block,
          foo: {bar: 'baz'},
        },
      ])
    })

    test('Scenario: Setting existing nested text block property is a noop', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const block = {
        _key: blockKey,
        _type: 'block',
        children: [{_key: spanKey, _type: 'span', text: '', marks: []}],
        markDefs: [],
        style: 'normal',
        foo: {bar: 'baz'},
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [block],
        schemaDefinition: defineSchema({
          block: {fields: [{name: 'foo', type: 'object'}]},
        }),
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'foo', 'bar'],
            value: 'fizz',
          },
        ],
        snapshot: undefined,
      })

      expect(editor.getSnapshot().context.value).toEqual([block])
    })

    test('Scenario: Setting markDef property', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const linkKey = keyGenerator()
      const block = {
        _key: blockKey,
        _type: 'block',
        children: [
          {_key: spanKey, _type: 'span', text: 'foo', marks: [linkKey]},
        ],
        markDefs: [
          {
            _key: linkKey,
            _type: 'link',
          },
        ],
        style: 'normal',
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [block],
        schemaDefinition: defineSchema({
          annotations: [
            {name: 'link', fields: [{name: 'href', type: 'string'}]},
          ],
        }),
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'markDefs', {_key: linkKey}, 'href'],
            value: 'https://example.com',
          },
        ],
        snapshot: undefined,
      })

      expect(editor.getSnapshot().context.value).toEqual([
        {
          ...block,
          markDefs: [{...block.markDefs[0], href: 'https://example.com'}],
        },
      ])
    })

    test('Scenario: Setting existing markDef property is a noop', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const linkKey = keyGenerator()
      const block = {
        _key: blockKey,
        _type: 'block',
        children: [
          {_key: spanKey, _type: 'span', text: 'foo', marks: [linkKey]},
        ],
        markDefs: [
          {
            _key: linkKey,
            _type: 'link',
            href: 'https://example.com',
          },
        ],
        style: 'normal',
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [block],
        schemaDefinition: defineSchema({
          annotations: [
            {name: 'link', fields: [{name: 'href', type: 'string'}]},
          ],
        }),
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'markDefs', {_key: linkKey}, 'href'],
            value: 'https://example.net',
          },
        ],
        snapshot: undefined,
      })

      expect(editor.getSnapshot().context.value).toEqual([
        {
          ...block,
          markDefs: [{...block.markDefs[0], href: 'https://example.com'}],
        },
      ])
    })

    test('Scenario: Setting nested markDef property', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const linkKey = keyGenerator()
      const block = {
        _key: blockKey,
        _type: 'block',
        children: [
          {_key: spanKey, _type: 'span', text: 'foo', marks: [linkKey]},
        ],
        markDefs: [
          {
            _key: linkKey,
            _type: 'link',
            foo: {},
          },
        ],
        style: 'normal',
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [block],
        schemaDefinition: defineSchema({
          annotations: [
            {name: 'link', fields: [{name: 'foo', type: 'object'}]},
          ],
        }),
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'markDefs', {_key: linkKey}, 'foo', 'bar'],
            value: 'baz',
          },
        ],
        snapshot: undefined,
      })

      expect(editor.getSnapshot().context.value).toEqual([
        {
          ...block,
          markDefs: [{...block.markDefs[0], foo: {bar: 'baz'}}],
        },
      ])
    })

    test('Scenario: Setting existing nested markDef property is a noop', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const linkKey = keyGenerator()
      const block = {
        _key: blockKey,
        _type: 'block',
        children: [
          {_key: spanKey, _type: 'span', text: 'foo', marks: [linkKey]},
        ],
        markDefs: [
          {
            _key: linkKey,
            _type: 'link',
            foo: {bar: 'baz'},
          },
        ],
        style: 'normal',
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [block],
        schemaDefinition: defineSchema({
          annotations: [
            {name: 'link', fields: [{name: 'foo', type: 'object'}]},
          ],
        }),
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'markDefs', {_key: linkKey}, 'foo', 'bar'],
            value: 'fizz',
          },
        ],
        snapshot: undefined,
      })

      expect(editor.getSnapshot().context.value).toEqual([block])
    })

    test('Scenario: Setting missing block object property', async () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const image = {
        _key: imageKey,
        _type: 'image',
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [image],
        schemaDefinition: defineSchema({
          blockObjects: [
            {name: 'image', fields: [{name: 'src', type: 'string'}]},
          ],
        }),
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: imageKey}, 'src'],
            value: 'https://example.com/image-a.png',
          },
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            ...image,
            src: 'https://example.com/image-a.png',
          },
        ])
      })
    })

    test('Scenario: Setting existing block object property is a noop', async () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const image = {
        _key: imageKey,
        _type: 'image',
        src: 'https://example.com/image-a.png',
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [image],
        schemaDefinition: defineSchema({
          blockObjects: [
            {name: 'image', fields: [{name: 'src', type: 'string'}]},
          ],
        }),
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: imageKey}, 'src'],
            value: 'https://example.com/image-b.png',
          },
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([image])
      })
    })

    test('Scenario: Setting block object property where existing value is 0 is a noop', async () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const image = {
        _key: imageKey,
        _type: 'image',
        asset: {src: 0},
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [image],
        schemaDefinition: defineSchema({
          blockObjects: [
            {name: 'image', fields: [{name: 'asset', type: 'object'}]},
          ],
        }),
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: imageKey}, 'asset', 'src'],
            value: 1,
          },
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([image])
      })
    })

    test('Scenario: Setting block object property where existing value is false is a noop', async () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const image = {
        _key: imageKey,
        _type: 'image',
        asset: {src: false},
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [image],
        schemaDefinition: defineSchema({
          blockObjects: [
            {name: 'image', fields: [{name: 'asset', type: 'object'}]},
          ],
        }),
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: imageKey}, 'asset', 'src'],
            value: true,
          },
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([image])
      })
    })

    test('Scenario: Setting block object property where existing value is null is a noop', async () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const image = {
        _key: imageKey,
        _type: 'image',
        asset: {src: null},
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [image],
        schemaDefinition: defineSchema({
          blockObjects: [
            {name: 'image', fields: [{name: 'asset', type: 'object'}]},
          ],
        }),
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: imageKey}, 'asset', 'src'],
            value: 'https://example.com/image-a.png',
          },
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([image])
      })
    })

    test('Scenario: Setting object property on block object', async () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const image = {
        _key: imageKey,
        _type: 'image',
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [image],
        schemaDefinition: defineSchema({
          blockObjects: [
            {name: 'image', fields: [{name: 'asset', type: 'object'}]},
          ],
        }),
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: imageKey}, 'asset'],
            value: {
              src: 'https://example.com/image-a.png',
            },
          },
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            ...image,
            asset: {src: 'https://example.com/image-a.png'},
          },
        ])
      })
    })

    test('Scenario: Setting array property on block object', async () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const image = {
        _key: imageKey,
        _type: 'image',
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [image],
        schemaDefinition: defineSchema({
          blockObjects: [
            {name: 'image', fields: [{name: 'assets', type: 'array'}]},
          ],
        }),
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: imageKey}, 'assets'],
            value: [{src: 'https://example.com/image-a.png'}],
          },
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            ...image,
            assets: [{src: 'https://example.com/image-a.png'}],
          },
        ])
      })
    })

    test('Scenario: Composing patches on block object', async () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const image = {
        _key: imageKey,
        _type: 'image',
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [image],
        schemaDefinition: defineSchema({
          blockObjects: [
            {name: 'image', fields: [{name: 'asset', type: 'object'}]},
          ],
        }),
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: imageKey}, 'asset'],
            value: {},
          },
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: imageKey}, 'asset', 'src'],
            value: 'https://example.com/image-b.png',
          },
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            ...image,
            asset: {src: 'https://example.com/image-b.png'},
          },
        ])
      })
    })

    test('Scenario: Setting nested block object property', async () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const image = {
        _key: imageKey,
        _type: 'image',
        asset: {},
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [image],
        schemaDefinition: defineSchema({
          blockObjects: [
            {name: 'image', fields: [{name: 'asset', type: 'object'}]},
          ],
        }),
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: imageKey}, 'asset', 'src'],
            value: 'https://example.com/image-a.png',
          },
        ],
        snapshot: undefined,
      })

      expect(editor.getSnapshot().context.value).toEqual([
        {
          ...image,
          asset: {src: 'https://example.com/image-a.png'},
        },
      ])
    })

    test('Scenario: Setting existing nested block object property is a noop', async () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const image = {
        _key: imageKey,
        _type: 'image',
        asset: {src: 'https://example.com/image-a.png'},
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [image],
        schemaDefinition: defineSchema({
          blockObjects: [
            {name: 'image', fields: [{name: 'asset', type: 'object'}]},
          ],
        }),
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: imageKey}, 'asset', 'src'],
            value: 'https://example.com/image-b.png',
          },
        ],
        snapshot: undefined,
      })

      expect(editor.getSnapshot().context.value).toEqual([image])
    })

    test('Scenario: Setting missing span property', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const block = {
        _key: blockKey,
        _type: 'block',
        children: [{_key: spanKey, _type: 'span', text: '', marks: []}],
        markDefs: [],
        style: 'normal',
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [block],
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'foo'],
            value: 'bar',
          },
        ],
        snapshot: undefined,
      })

      expect(editor.getSnapshot().context.value).toEqual([
        {
          ...block,
          children: [{...block.children[0], foo: 'bar'}],
        },
      ])
    })

    test('Scenario: Setting existing span property is a noop', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const block = {
        _key: blockKey,
        _type: 'block',
        children: [
          {_key: spanKey, _type: 'span', text: '', marks: [], foo: 'bar'},
        ],
        markDefs: [],
        style: 'normal',
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [block],
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'foo'],
            value: 'baz',
          },
        ],
        snapshot: undefined,
      })

      expect(editor.getSnapshot().context.value).toEqual([block])
    })

    test('Scenario: Setting span text for empty text property is a noop', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const block = {
        _key: blockKey,
        _type: 'block',
        children: [{_key: spanKey, _type: 'span', text: '', marks: []}],
        markDefs: [],
        style: 'normal',
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [block],
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
            value: 'foo',
          },
        ],
        snapshot: undefined,
      })

      expect(editor.getSnapshot().context.value).toEqual([block])
    })

    test('Scenario: Setting span text is not possible', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const block = {
        _key: blockKey,
        _type: 'block',
        children: [
          {_key: spanKey, _type: 'span', text: 'foo', marks: ['strong']},
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

      const newSpanKey = keyGenerator()

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'insert',
            origin: 'remote',
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            items: [
              // Spans without text are not allowed. This span will therefore
              // be given an empty text prop upon insertion
              {
                _key: newSpanKey,
                _type: 'span',
                marks: [],
              },
            ],
            position: 'after',
          },
          // This patch turns into a noop because the span was given an empty
          // text prop upon insertion
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'children', {_key: newSpanKey}, 'text'],
            value: 'bar',
          },
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([block])
      })
    })

    test('Scenario: Setting nested span property', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const block = {
        _key: blockKey,
        _type: 'block',
        children: [
          {_key: spanKey, _type: 'span', text: '', marks: [], foo: {}},
        ],
        markDefs: [],
        style: 'normal',
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [block],
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'foo', 'bar'],
            value: 'baz',
          },
        ],
        snapshot: undefined,
      })

      expect(editor.getSnapshot().context.value).toEqual([
        {
          ...block,
          children: [{...block.children[0], foo: {bar: 'baz'}}],
        },
      ])
    })

    test('Scenario: Setting existing nested span property is a noop', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const block = {
        _key: blockKey,
        _type: 'block',
        children: [
          {
            _key: spanKey,
            _type: 'span',
            text: '',
            marks: [],
            foo: {bar: 'baz'},
          },
        ],
        markDefs: [],
        style: 'normal',
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [block],
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'foo', 'bar'],
            value: 'fizz',
          },
        ],
        snapshot: undefined,
      })

      expect(editor.getSnapshot().context.value).toEqual([block])
    })
  })
})
