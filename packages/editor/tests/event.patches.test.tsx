import {
  applyAll,
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {makeDiff, makePatches, stringifyPatches} from '@sanity/diff-match-patch'
import {describe, expect, onTestFinished, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema, type EditorEmittedEvent} from '../src'
import {raise} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor, createTestEditors} from '../src/test/vitest'
import {
  textBlockDepthsContainers,
  textBlockDepthsSchemaDefinition,
} from '../test-utils/text-block-depths'

// `createTestEditors` forwards A's `mutation` events to B, and the batcher
// flushes those on a 500ms interval, which leaves little of `vi.waitFor`'s
// 1s default on a loaded runner.
const remoteSyncTimeout = 3_000

describe('event.patches', () => {
  describe('Scenario: `set`ing the entire value', () => {
    test('more blocks', async () => {
      const keyGenerator = createTestKeyGenerator()

      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [
          {
            _type: 'block',
            _key: keyGenerator(),
            children: [
              {
                _type: 'span',
                _key: keyGenerator(),
                text: 'Initial text',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      const newValue = [
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [
            {
              _type: 'span',
              _key: keyGenerator(),
              text: 'Replaced text with new content',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [
            {
              _type: 'span',
              _key: keyGenerator(),
              text: 'Second block',
              marks: [],
            },
          ],
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
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual(newValue)
      })
    })

    test('fewer blocks', async () => {
      const keyGenerator = createTestKeyGenerator()

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _type: 'block',
            _key: keyGenerator(),
            children: [
              {_type: 'span', _key: keyGenerator(), text: 'First', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: keyGenerator(),
            children: [
              {_type: 'span', _key: keyGenerator(), text: 'Second', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: keyGenerator(),
            children: [
              {_type: 'span', _key: keyGenerator(), text: 'Third', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      const newValue = [
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [
            {
              _type: 'span',
              _key: keyGenerator(),
              text: 'Only block',
              marks: [],
            },
          ],
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
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual(newValue)
      })
    })
  })

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

    await vi.waitFor(
      () => {
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
      },
      {timeout: remoteSyncTimeout},
    )
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

    await vi.waitFor(
      () => {
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
      },
      {timeout: remoteSyncTimeout},
    )
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

    await vi.waitFor(
      () => {
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
      },
      {timeout: remoteSyncTimeout},
    )
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
      type: 'apply',
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
      type: 'apply',
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
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: aKey, text: 'abc', marks: ['strong']},
          ],
        },
      ])
    })
  })

  test('Scenario: `set` text block key', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
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

    const newBlockKey = keyGenerator()

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: blockKey}, '_key'],
          value: newBlockKey,
        },
      ],
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: newBlockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: `set` block object key', async () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _key: imageKey,
          _type: 'image',
        },
      ],
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    })

    const newImageKey = keyGenerator()

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: imageKey}, '_key'],
          value: newImageKey,
        },
      ],
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: newImageKey,
          _type: 'image',
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
      type: 'apply',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
          value: 'bar',
        },
      ],
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
        },
      ])
    })

    editor.send({
      type: 'apply',
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
        },
      ])
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'marks'],
          value: ['strong'],
        },
      ],
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
      type: 'apply',
      patches: [
        {
          type: 'unset',
          origin: 'remote',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, '_map'],
        },
      ],
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
      type: 'apply',
      patches: [
        {
          type: 'unset',
          origin: 'remote',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
        },
      ],
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
      type: 'apply',
      patches: [{type: 'unset', origin: 'remote', path: [{_key: 'k0'}]}],
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
      type: 'apply',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: imageKey}, 'src'],
          value: 'https://www.sanity.io/logo.png',
        },
      ],
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
      type: 'apply',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: 'k2'}, 'description'],
          value: 'Sanity is a headless CMS',
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
      type: 'apply',
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
      type: 'apply',
      patches: [{type: 'unset', origin: 'remote', path: [{_key: 'k0'}, 'src']}],
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
      type: 'apply',
      patches: [
        {
          type: 'unset',
          origin: 'remote',
          path: [{_key: imageKey}, '_map', 'foo'],
        },
      ],
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
      type: 'apply',
      patches: [
        {type: 'unset', origin: 'remote', path: [{_key: imageKey}, '_map']},
      ],
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
      type: 'apply',
      patches: [
        {type: 'unset', origin: 'remote', path: [{_key: blockKey}, 'listItem']},
        {type: 'unset', origin: 'remote', path: [{_key: blockKey}, 'level']},
      ],
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

    await vi.waitFor(
      () => {
        expect(editor.getSnapshot().context.value).toEqual(value)
        expect(editorB.getSnapshot().context.value).toEqual(value)
      },
      {timeout: remoteSyncTimeout},
    )
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
      type: 'apply',
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
      type: 'apply',
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

  test('Scenario: `set` on `_key` of inline object', async () => {
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
      type: 'apply',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: blockKey}, 'children', {_key: stockTickerKey}, '_key'],
          value: 'new key',
        },
      ],
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_type: 'span', _key: span1Key, text: '', marks: []},
            {_type: 'stock-ticker', _key: 'new key'},
            {_type: 'span', _key: span2Key, text: '', marks: []},
          ],
        },
      ])
    })
  })

  test('Scenario: `set` on `_type` of inline object', async () => {
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
      type: 'apply',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: blockKey}, 'children', {_key: stockTickerKey}, '_type'],
          value: 'new type',
        },
      ],
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_type: 'span', _key: span1Key, text: '', marks: []},
            {_type: 'new type', _key: stockTickerKey},
            {_type: 'span', _key: span2Key, text: '', marks: []},
          ],
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
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: mentionKey}, 'text'],
          value: 'Jane Doe',
        },
      ],
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

  test('Scenario: `set`ing "text" field on span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'foo bar baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'select',
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

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
          value: 'foo',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
        backward: false,
      })
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
      type: 'apply',
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

  test('Scenario: `unset` on `_key` and `_type` of inline object', async () => {
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

    // Unset _key: normalization restores it with a new key
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          origin: 'remote',
          path: [{_key: blockKey}, 'children', {_key: stockTickerKey}, '_key'],
        },
      ],
    })

    const newInlineKey = 'k6'

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_type: 'span', _key: span1Key, text: '', marks: []},
            {_type: 'stock-ticker', _key: newInlineKey},
            {_type: 'span', _key: span2Key, text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    // Unset _type: normalization restores it to span (parent is text block).
    // The three adjacent compatible spans are NOT merged: cosmetic
    // normalization is skipped while applying remote patches; only the
    // repairs run.
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          origin: 'remote',
          path: [{_key: blockKey}, 'children', {_key: newInlineKey}, '_type'],
        },
      ],
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_type: 'span', _key: span1Key, text: '', marks: []},
            {_type: 'span', _key: newInlineKey, text: ''},
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
      type: 'apply',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: blockKey}, 'style'],
          value: 'h1',
        },
      ],
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
      type: 'apply',
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo bar|')
    })

    editor.send({
      type: 'apply',
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
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: |baz')
    })
  })

  describe('`unset` of the node holding the selection', () => {
    test('Scenario: Removing a middle block moves the caret to the start of the next block', async () => {
      const keyGenerator = createTestKeyGenerator()
      const fooBlockKey = keyGenerator()
      const fooSpanKey = keyGenerator()
      const barBlockKey = keyGenerator()
      const barSpanKey = keyGenerator()
      const bazBlockKey = keyGenerator()
      const bazSpanKey = keyGenerator()
      const fooBlock = {
        _key: fooBlockKey,
        _type: 'block',
        children: [{_key: fooSpanKey, _type: 'span', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      }
      const bazBlock = {
        _key: bazBlockKey,
        _type: 'block',
        children: [{_key: bazSpanKey, _type: 'span', text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      }
      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [
          fooBlock,
          {
            _key: barBlockKey,
            _type: 'block',
            children: [
              {_key: barSpanKey, _type: 'span', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          bazBlock,
        ],
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
            offset: 1,
          },
          focus: {
            path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
            offset: 1,
          },
        },
      })
      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: foo\nB: b|ar\nB: baz',
        )
      })

      editor.send({
        type: 'apply',
        patches: [
          {type: 'unset', origin: 'remote', path: [{_key: barBlockKey}]},
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([fooBlock, bazBlock])
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: bazBlockKey}, 'children', {_key: bazSpanKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: bazBlockKey}, 'children', {_key: bazSpanKey}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Removing the first block moves the caret to the start of the next block', async () => {
      const keyGenerator = createTestKeyGenerator()
      const fooBlockKey = keyGenerator()
      const fooSpanKey = keyGenerator()
      const barBlockKey = keyGenerator()
      const barSpanKey = keyGenerator()
      const barBlock = {
        _key: barBlockKey,
        _type: 'block',
        children: [{_key: barSpanKey, _type: 'span', text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      }
      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [
          {
            _key: fooBlockKey,
            _type: 'block',
            children: [
              {_key: fooSpanKey, _type: 'span', text: 'foo', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          barBlock,
        ],
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
            offset: 1,
          },
          focus: {
            path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
            offset: 1,
          },
        },
      })
      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: f|oo\nB: bar',
        )
      })

      editor.send({
        type: 'apply',
        patches: [
          {type: 'unset', origin: 'remote', path: [{_key: fooBlockKey}]},
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([barBlock])
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Removing the only block moves the caret to the start of the placeholder block', async () => {
      const keyGenerator = createTestKeyGenerator()
      const fooBlockKey = keyGenerator()
      const fooSpanKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [
          {
            _key: fooBlockKey,
            _type: 'block',
            children: [
              {_key: fooSpanKey, _type: 'span', text: 'foo', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
            offset: 1,
          },
          focus: {
            path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
            offset: 1,
          },
        },
      })
      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: f|oo')
      })

      editor.send({
        type: 'apply',
        patches: [
          {type: 'unset', origin: 'remote', path: [{_key: fooBlockKey}]},
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: 'k4',
            _type: 'block',
            children: [{_key: 'k5', _type: 'span', text: '', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 0},
          focus: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 0},
          backward: false,
        })
      })
    })

    test('Scenario: Removing the block holding the focus of an expanded selection moves the focus to the start of the next block', async () => {
      const keyGenerator = createTestKeyGenerator()
      const fooBlockKey = keyGenerator()
      const fooSpanKey = keyGenerator()
      const barBlockKey = keyGenerator()
      const barSpanKey = keyGenerator()
      const bazBlockKey = keyGenerator()
      const bazSpanKey = keyGenerator()
      const fooBlock = {
        _key: fooBlockKey,
        _type: 'block',
        children: [{_key: fooSpanKey, _type: 'span', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      }
      const bazBlock = {
        _key: bazBlockKey,
        _type: 'block',
        children: [{_key: bazSpanKey, _type: 'span', text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      }
      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [
          fooBlock,
          {
            _key: barBlockKey,
            _type: 'block',
            children: [
              {_key: barSpanKey, _type: 'span', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          bazBlock,
        ],
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
            offset: 1,
          },
          focus: {
            path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
            offset: 1,
          },
        },
      })
      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: f^oo\nB: b|ar\nB: baz',
        )
      })

      editor.send({
        type: 'apply',
        patches: [
          {type: 'unset', origin: 'remote', path: [{_key: barBlockKey}]},
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([fooBlock, bazBlock])
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
            offset: 1,
          },
          focus: {
            path: [{_key: bazBlockKey}, 'children', {_key: bazSpanKey}],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Removing the last block moves the caret to the end of the previous block', async () => {
      const keyGenerator = createTestKeyGenerator()
      const fooBlockKey = keyGenerator()
      const fooSpanKey = keyGenerator()
      const barBlockKey = keyGenerator()
      const barSpanKey = keyGenerator()
      const fooBlock = {
        _key: fooBlockKey,
        _type: 'block',
        children: [{_key: fooSpanKey, _type: 'span', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      }
      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [
          fooBlock,
          {
            _key: barBlockKey,
            _type: 'block',
            children: [
              {_key: barSpanKey, _type: 'span', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
            offset: 1,
          },
          focus: {
            path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
            offset: 1,
          },
        },
      })
      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: foo\nB: b|ar',
        )
      })

      editor.send({
        type: 'apply',
        patches: [
          {type: 'unset', origin: 'remote', path: [{_key: barBlockKey}]},
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([fooBlock])
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
            offset: 3,
          },
          focus: {
            path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
            offset: 3,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Removing a table cell block keeps the caret in the same cell', async () => {
      const keyGenerator = createTestKeyGenerator()
      const tableKey = keyGenerator()
      const rowKey = keyGenerator()
      const fooCellKey = keyGenerator()
      const fooBlockKey = keyGenerator()
      const fooSpanKey = keyGenerator()
      const barBlockKey = keyGenerator()
      const barSpanKey = keyGenerator()
      const bazCellKey = keyGenerator()
      const bazBlockKey = keyGenerator()
      const bazSpanKey = keyGenerator()
      const fooBlock = {
        _key: fooBlockKey,
        _type: 'block',
        children: [{_key: fooSpanKey, _type: 'span', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      }
      const bazCell = {
        _key: bazCellKey,
        _type: 'cell',
        content: [
          {
            _key: bazBlockKey,
            _type: 'block',
            children: [
              {_key: bazSpanKey, _type: 'span', text: 'baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      }
      const barSpanPath = [
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: fooCellKey},
        'content',
        {_key: barBlockKey},
        'children',
        {_key: barSpanKey},
      ]
      const fooSpanPath = [
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: fooCellKey},
        'content',
        {_key: fooBlockKey},
        'children',
        {_key: fooSpanKey},
      ]
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          blockObjects: [
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
        }),
        initialValue: [
          {
            _key: tableKey,
            _type: 'table',
            rows: [
              {
                _key: rowKey,
                _type: 'row',
                cells: [
                  {
                    _key: fooCellKey,
                    _type: 'cell',
                    content: [
                      fooBlock,
                      {
                        _key: barBlockKey,
                        _type: 'block',
                        children: [
                          {
                            _key: barSpanKey,
                            _type: 'span',
                            text: 'bar',
                            marks: [],
                          },
                        ],
                        markDefs: [],
                        style: 'normal',
                      },
                    ],
                  },
                  bazCell,
                ],
              },
            ],
          },
        ],
        children: (
          <NodePlugin
            nodes={[
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
            ]}
          />
        ),
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {path: barSpanPath, offset: 1},
          focus: {path: barSpanPath, offset: 1},
        },
      })
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: barSpanPath, offset: 1},
          focus: {path: barSpanPath, offset: 1},
          backward: false,
        })
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            type: 'unset',
            origin: 'remote',
            path: [
              {_key: tableKey},
              'rows',
              {_key: rowKey},
              'cells',
              {_key: fooCellKey},
              'content',
              {_key: barBlockKey},
            ],
          },
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: tableKey,
            _type: 'table',
            rows: [
              {
                _key: rowKey,
                _type: 'row',
                cells: [
                  {_key: fooCellKey, _type: 'cell', content: [fooBlock]},
                  bazCell,
                ],
              },
            ],
          },
        ])
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: fooSpanPath, offset: 3},
          focus: {path: fooSpanPath, offset: 3},
          backward: false,
        })
      })
    })

    test('Scenario: Removing the only span and inserting a replacement in one batch clears the selection', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const fooSpanKey = keyGenerator()
      const barSpanKey = keyGenerator()
      const barBlock = {
        _key: blockKey,
        _type: 'block',
        children: [{_key: barSpanKey, _type: 'span', text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      }
      const {editor} = await createTestEditor({
        keyGenerator,
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: fooSpanKey, _type: 'span', text: 'foo', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: fooSpanKey}],
            offset: 1,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: fooSpanKey}],
            offset: 1,
          },
        },
      })
      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: f|oo')
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            type: 'unset',
            origin: 'remote',
            path: [{_key: blockKey}, 'children', {_key: fooSpanKey}],
          },
          {
            type: 'insert',
            origin: 'remote',
            path: [{_key: blockKey}, 'children', 0],
            position: 'before',
            items: [{_key: barSpanKey, _type: 'span', text: 'bar', marks: []}],
          },
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([barBlock])
        expect(editor.getSnapshot().context.selection).toEqual(null)
      })
    })

    test('Scenario: Removing a selected image when only images remain clears the selection', async () => {
      const keyGenerator = createTestKeyGenerator()
      const fooImageKey = keyGenerator()
      const barImageKey = keyGenerator()
      const fooImage = {_key: fooImageKey, _type: 'image'}
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          blockObjects: [{name: 'image'}],
        }),
        initialValue: [fooImage, {_key: barImageKey, _type: 'image'}],
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {path: [{_key: barImageKey}], offset: 0},
          focus: {path: [{_key: barImageKey}], offset: 0},
        },
      })
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: [{_key: barImageKey}], offset: 0},
          focus: {path: [{_key: barImageKey}], offset: 0},
          backward: false,
        })
      })

      editor.send({
        type: 'apply',
        patches: [
          {type: 'unset', origin: 'remote', path: [{_key: barImageKey}]},
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([fooImage])
        expect(editor.getSnapshot().context.selection).toEqual(null)
      })
    })

    test('Scenario: Removing a span next to an inline object keeps typing before the inline object', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const fooSpanKey = keyGenerator()
      const stockTickerKey = keyGenerator()
      const barSpanKey = keyGenerator()
      const bazSpanKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}],
          inlineObjects: [{name: 'stock-ticker'}],
        }),
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: fooSpanKey, _type: 'span', text: 'foo', marks: []},
              {_key: stockTickerKey, _type: 'stock-ticker'},
              {_key: barSpanKey, _type: 'span', text: 'bar', marks: ['strong']},
              {_key: bazSpanKey, _type: 'span', text: 'baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: barSpanKey}],
            offset: 1,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: barSpanKey}],
            offset: 1,
          },
        },
      })
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: barSpanKey}],
            offset: 1,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: barSpanKey}],
            offset: 1,
          },
          backward: false,
        })
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            type: 'unset',
            origin: 'remote',
            path: [{_key: blockKey}, 'children', {_key: barSpanKey}],
          },
        ],
      })
      editor.send({type: 'insert.text', text: 'x'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: fooSpanKey, _type: 'span', text: 'foox', marks: []},
              {_key: stockTickerKey, _type: 'stock-ticker'},
              {_key: bazSpanKey, _type: 'span', text: 'baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
    })

    test('Scenario: Removing the last span by index keeps the caret at the end of the previous span', async () => {
      const keyGenerator = createTestKeyGenerator()
      const fooBlockKey = keyGenerator()
      const fooSpanKey = keyGenerator()
      const barSpanKey = keyGenerator()
      const bazBlockKey = keyGenerator()
      const bazSpanKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
        initialValue: [
          {
            _key: fooBlockKey,
            _type: 'block',
            children: [
              {_key: fooSpanKey, _type: 'span', text: 'foo', marks: []},
              {_key: barSpanKey, _type: 'span', text: 'bar', marks: ['strong']},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: bazBlockKey,
            _type: 'block',
            children: [
              {_key: bazSpanKey, _type: 'span', text: 'baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: fooBlockKey}, 'children', {_key: barSpanKey}],
            offset: 1,
          },
          focus: {
            path: [{_key: fooBlockKey}, 'children', {_key: barSpanKey}],
            offset: 1,
          },
        },
      })
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: fooBlockKey}, 'children', {_key: barSpanKey}],
            offset: 1,
          },
          focus: {
            path: [{_key: fooBlockKey}, 'children', {_key: barSpanKey}],
            offset: 1,
          },
          backward: false,
        })
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            type: 'unset',
            origin: 'remote',
            path: [{_key: fooBlockKey}, 'children', 1],
          },
        ],
      })
      editor.send({type: 'insert.text', text: 'x'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: foox|\nB: baz',
        )
      })
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
        type: 'apply',
        patches: [
          {
            type: 'diffMatchPatch',
            origin: 'remote',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: '@@ -0,0 +1 @@\n+e\n',
          },
        ],
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
        type: 'apply',
        patches: [
          {
            type: 'diffMatchPatch',
            origin: 'remote',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: '@@ -1 +0,0 @@\n-e\n',
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
        ])
      })
    })

    test('Scenario: Adding text', async () => {
      const editorText = 'Hello'
      const incomingText = 'Hello there'
      const {editor, blockKey, spanKey} = await createEditor(editorText)

      editor.send({
        type: 'apply',
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
        type: 'apply',
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
        type: 'apply',
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
        type: 'apply',
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
        type: 'apply',
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
        type: 'apply',
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
        type: 'apply',
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
        type: 'apply',
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

    test('Scenario: diffMatchPatch inside callout', async () => {
      const keyGenerator = createTestKeyGenerator()
      const calloutKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      const editorText = 'Hello'
      const incomingText = 'Hello there'

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
                  {_type: 'span', _key: spanKey, text: editorText, marks: []},
                ],
                markDefs: [],
                style: 'normal',
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
        type: 'apply',
        patches: [
          {
            type: 'diffMatchPatch',
            origin: 'remote',
            path: [
              {_key: calloutKey},
              'content',
              {_key: blockKey},
              'children',
              {_key: spanKey},
              'text',
            ],
            value: stringifyPatches(
              makePatches(makeDiff(editorText, incomingText)),
            ),
          },
        ],
      })

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
                    text: incomingText,
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
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
      type: 'apply',
      patches: [
        {
          origin: 'remote',
          type: 'set',
          path: [{_key: blockKey}],
          value: newBlock,
        },
      ],
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
        type: 'apply',
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
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('{IMAGE}')
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
        type: 'apply',
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
          type: 'apply',
          patches: [
            {
              origin: 'remote',
              type: 'insert',
              position: 'before',
              path: [0],
              items: [blockA, blockB],
            },
          ],
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
          type: 'apply',
          patches: [
            {
              origin: 'remote',
              type: 'insert',
              position: 'before',
              path: [0],
              items: [blockA, blockB],
            },
          ],
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
          type: 'apply',
          patches: [
            {
              origin: 'remote',
              type: 'insert',
              position: 'before',
              path: [0],
              items: [blockA, blockB],
            },
          ],
        })

        await vi.waitFor(() => {
          expect(editor.getSnapshot().context.value).toEqual([blockA, blockB])
        })
      })
      test('Scenario: First block has no _key', async () => {
        const keyGenerator = createTestKeyGenerator()
        const {editor} = await createTestEditor({
          keyGenerator,
          schemaDefinition: defineSchema({}),
        })
        const spanAKey = keyGenerator()
        const blockBKey = keyGenerator()
        const spanBKey = keyGenerator()
        const blockA = {
          _type: 'block',
          children: [{_key: spanAKey, _type: 'span', text: 'foo', marks: []}],
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
          type: 'apply',
          patches: [
            {
              origin: 'remote',
              type: 'insert',
              position: 'before',
              path: [0],
              items: [blockA, blockB],
            },
          ],
        })

        await vi.waitFor(() => {
          const value = editor.getSnapshot().context.value
          expect(value).toEqual([
            {
              _key: 'k5',
              _type: 'block',
              children: [
                {_key: spanAKey, _type: 'span', text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            blockB,
          ])
        })
      })
    })

    test('Scenario: `before` on numeric index 0 prepends to a non-empty array', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockAKey = keyGenerator()
      const spanAKey = keyGenerator()
      const blockBKey = keyGenerator()
      const spanBKey = keyGenerator()
      const newBlockKey = keyGenerator()
      const newSpanKey = keyGenerator()

      const blockA = {
        _key: blockAKey,
        _type: 'block',
        children: [{_key: spanAKey, _type: 'span', text: 'A', marks: []}],
        markDefs: [],
        style: 'normal',
      }
      const blockB = {
        _key: blockBKey,
        _type: 'block',
        children: [{_key: spanBKey, _type: 'span', text: 'B', marks: []}],
        markDefs: [],
        style: 'normal',
      }
      const newBlock = {
        _key: newBlockKey,
        _type: 'block',
        children: [{_key: newSpanKey, _type: 'span', text: 'new', marks: []}],
        markDefs: [],
        style: 'normal',
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [blockA, blockB],
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            origin: 'remote',
            type: 'insert',
            position: 'before',
            path: [0],
            items: [newBlock],
          },
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          newBlock,
          blockA,
          blockB,
        ])
      })
    })

    test('Scenario: `after` on a numeric index inserts after the indexed sibling', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockAKey = keyGenerator()
      const spanAKey = keyGenerator()
      const blockBKey = keyGenerator()
      const spanBKey = keyGenerator()
      const newBlockKey = keyGenerator()
      const newSpanKey = keyGenerator()

      const blockA = {
        _key: blockAKey,
        _type: 'block',
        children: [{_key: spanAKey, _type: 'span', text: 'A', marks: []}],
        markDefs: [],
        style: 'normal',
      }
      const blockB = {
        _key: blockBKey,
        _type: 'block',
        children: [{_key: spanBKey, _type: 'span', text: 'B', marks: []}],
        markDefs: [],
        style: 'normal',
      }
      const newBlock = {
        _key: newBlockKey,
        _type: 'block',
        children: [{_key: newSpanKey, _type: 'span', text: 'new', marks: []}],
        markDefs: [],
        style: 'normal',
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [blockA, blockB],
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            origin: 'remote',
            type: 'insert',
            position: 'after',
            path: [0],
            items: [newBlock],
          },
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          blockA,
          newBlock,
          blockB,
        ])
      })
    })

    test('Scenario: `before` on a numeric index inserts before the indexed sibling', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockAKey = keyGenerator()
      const spanAKey = keyGenerator()
      const blockBKey = keyGenerator()
      const spanBKey = keyGenerator()
      const newBlockKey = keyGenerator()
      const newSpanKey = keyGenerator()

      const blockA = {
        _key: blockAKey,
        _type: 'block',
        children: [{_key: spanAKey, _type: 'span', text: 'A', marks: []}],
        markDefs: [],
        style: 'normal',
      }
      const blockB = {
        _key: blockBKey,
        _type: 'block',
        children: [{_key: spanBKey, _type: 'span', text: 'B', marks: []}],
        markDefs: [],
        style: 'normal',
      }
      const newBlock = {
        _key: newBlockKey,
        _type: 'block',
        children: [{_key: newSpanKey, _type: 'span', text: 'new', marks: []}],
        markDefs: [],
        style: 'normal',
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [blockA, blockB],
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            origin: 'remote',
            type: 'insert',
            position: 'before',
            path: [1],
            items: [newBlock],
          },
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          blockA,
          newBlock,
          blockB,
        ])
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
        type: 'apply',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [],
            value: [],
          },
        ],
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
        type: 'apply',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [],
            value: [],
          },
        ],
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
        type: 'apply',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'level'],
            value: 1,
          },
        ],
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
        type: 'apply',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'style'],
            value: 'normal',
          },
        ],
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
        type: 'apply',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'foo', 'bar'],
            value: 'baz',
          },
        ],
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
        type: 'apply',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'foo', 'bar'],
            value: 'fizz',
          },
        ],
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
        type: 'apply',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'markDefs', {_key: linkKey}, 'href'],
            value: 'https://example.com',
          },
        ],
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
        type: 'apply',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'markDefs', {_key: linkKey}, 'href'],
            value: 'https://example.net',
          },
        ],
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
        type: 'apply',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'markDefs', {_key: linkKey}, 'foo', 'bar'],
            value: 'baz',
          },
        ],
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
        type: 'apply',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'markDefs', {_key: linkKey}, 'foo', 'bar'],
            value: 'fizz',
          },
        ],
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
        type: 'apply',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: imageKey}, 'src'],
            value: 'https://example.com/image-a.png',
          },
        ],
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
        type: 'apply',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: imageKey}, 'src'],
            value: 'https://example.com/image-b.png',
          },
        ],
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
        type: 'apply',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: imageKey}, 'asset', 'src'],
            value: 1,
          },
        ],
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
        type: 'apply',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: imageKey}, 'asset', 'src'],
            value: true,
          },
        ],
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
        type: 'apply',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: imageKey}, 'asset', 'src'],
            value: 'https://example.com/image-a.png',
          },
        ],
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
        type: 'apply',
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
        type: 'apply',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: imageKey}, 'assets'],
            value: [{src: 'https://example.com/image-a.png'}],
          },
        ],
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
        type: 'apply',
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
        type: 'apply',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: imageKey}, 'asset', 'src'],
            value: 'https://example.com/image-a.png',
          },
        ],
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
        type: 'apply',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: imageKey}, 'asset', 'src'],
            value: 'https://example.com/image-b.png',
          },
        ],
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
        type: 'apply',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'foo'],
            value: 'bar',
          },
        ],
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
        type: 'apply',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'foo'],
            value: 'baz',
          },
        ],
      })

      expect(editor.getSnapshot().context.value).toEqual([block])
    })

    test('Scenario: Setting span text is a noop', async () => {
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
        type: 'apply',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
            value: 'foo',
          },
        ],
      })

      expect(editor.getSnapshot().context.value).toEqual([block])
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
        type: 'apply',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'foo', 'bar'],
            value: 'baz',
          },
        ],
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
        type: 'apply',
        patches: [
          {
            type: 'setIfMissing',
            origin: 'remote',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'foo', 'bar'],
            value: 'fizz',
          },
        ],
      })

      expect(editor.getSnapshot().context.value).toEqual([block])
    })
  })

  test('Scenario: `unset` nested text block property', async () => {
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
          metadata: {title: 'hello', description: 'world'},
        },
      ],
      schemaDefinition: defineSchema({
        block: {
          fields: [{name: 'metadata', type: 'object'}],
        },
      }),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          origin: 'remote',
          path: [{_key: 'k0'}, 'metadata', 'title'],
        },
      ],
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
          metadata: {description: 'world'},
        },
      ])
    })
  })

  test('Scenario: `set` text block with new `children`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
    })

    const blockKey = 'k0'
    const newSpanKey = keyGenerator()

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'apply',
      patches: [
        set(
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: newSpanKey, text: 'replaced', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          [{_key: blockKey}],
        ),
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: newSpanKey, text: 'replaced', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: `set` `children` array directly on text block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
    })

    const blockKey = 'k0'
    const newSpanKey = keyGenerator()

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'apply',
      patches: [
        set(
          [{_type: 'span', _key: newSpanKey, text: 'replaced', marks: []}],
          [{_key: blockKey}, 'children'],
        ),
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: newSpanKey, text: 'replaced', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: `set` `children` with lone inline object normalizes surrounding spans', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [
          {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
        ],
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

    const blockKey = 'k0'
    const inlineKey = keyGenerator()

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([])
    })

    editor.send({
      type: 'apply',
      patches: [
        set(
          [{_type: 'stock-ticker', _key: inlineKey, symbol: 'AAPL'}],
          [{_key: blockKey}, 'children'],
        ),
      ],
    })

    await vi.waitFor(() => {
      // Normalization adds empty spans before and after the inline object
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: 'k3', text: '', marks: []},
            {_type: 'stock-ticker', _key: inlineKey, symbol: 'AAPL'},
            {_type: 'span', _key: 'k4', text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        setIfMissing([], [{_key: blockKey}, 'children']),
        insert([{_type: 'span', _key: 'k3', text: '', marks: []}], 'before', [
          {_key: blockKey},
          'children',
          {_key: inlineKey},
        ]),
        setIfMissing([], [{_key: blockKey}, 'children']),
        insert([{_type: 'span', _key: 'k4', text: '', marks: []}], 'after', [
          {_key: blockKey},
          'children',
          {_key: inlineKey},
        ]),
      ])
    })
  })

  test('Scenario: `set` `children` with span missing `text` normalizes text', async () => {
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

    const blockKey = 'k0'
    const spanKey = keyGenerator()

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([])
    })

    // Setting children with a span that has no text property.
    // Normalization adds text: '' to the span.
    editor.send({
      type: 'apply',
      patches: [
        set(
          [{_type: 'span', _key: spanKey, marks: []}],
          [{_key: blockKey}, 'children'],
        ),
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        set('', [{_key: blockKey}, 'children', {_key: spanKey}, 'text']),
        unset([]),
      ])
    })
  })

  test('Scenario: `set` deep property on block object in a single patch', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockObjectKey = keyGenerator()
    const initialValue = [
      {
        _key: blockObjectKey,
        _type: 'url',
        href: 'https://www.sanity.io',
        content: {},
      },
    ]

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue,
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

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: blockObjectKey}, 'content', 'description'],
          value: 'Sanity is a headless CMS',
        },
      ],
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockObjectKey,
          _type: 'url',
          href: 'https://www.sanity.io',
          content: {
            description: 'Sanity is a headless CMS',
          },
        },
      ])
    })
  })

  test('Scenario: `unset` deep property on block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockObjectKey = keyGenerator()
    const initialValue = [
      {
        _key: blockObjectKey,
        _type: 'url',
        href: 'https://www.sanity.io',
        content: {
          description: 'Sanity is a headless CMS',
          title: 'Sanity',
        },
      },
    ]

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue,
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

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          origin: 'remote',
          path: [{_key: blockObjectKey}, 'content', 'description'],
        },
      ],
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockObjectKey,
          _type: 'url',
          href: 'https://www.sanity.io',
          content: {
            title: 'Sanity',
          },
        },
      ])
    })
  })

  test('Scenario: `unset` markDef property', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const markDefKey = keyGenerator()
    const initialValue = [
      {
        _key: blockKey,
        _type: 'block',
        children: [
          {
            _key: spanKey,
            _type: 'span',
            text: 'foo',
            marks: [markDefKey],
          },
        ],
        markDefs: [
          {
            _key: markDefKey,
            _type: 'link',
            href: 'https://www.sanity.io',
          },
        ],
        style: 'normal',
      },
    ]

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: defineSchema({
        annotations: [{name: 'link'}],
      }),
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          origin: 'remote',
          path: [{_key: blockKey}, 'markDefs', {_key: markDefKey}, 'href'],
        },
      ],
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
              text: 'foo',
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
      ])
    })
  })

  test('Scenario: `setIfMissing` deep property on block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockObjectKey = keyGenerator()
    const initialValue = [
      {
        _key: blockObjectKey,
        _type: 'url',
        href: 'https://www.sanity.io',
        content: {},
      },
    ]

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue,
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

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'setIfMissing',
          origin: 'remote',
          path: [{_key: blockObjectKey}, 'content', 'description'],
          value: 'default description',
        },
      ],
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockObjectKey,
          _type: 'url',
          href: 'https://www.sanity.io',
          content: {
            description: 'default description',
          },
        },
      ])
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'setIfMissing',
          origin: 'remote',
          path: [{_key: blockObjectKey}, 'content', 'description'],
          value: 'should not overwrite',
        },
      ],
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockObjectKey,
          _type: 'url',
          href: 'https://www.sanity.io',
          content: {
            description: 'default description',
          },
        },
      ])
    })
  })

  test('Scenario: `unset` the entire value', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
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
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          origin: 'remote',
          path: [],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k4',
          children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  describe('container insert patches', () => {
    const containerSchema = defineSchema({
      blockObjects: [
        {name: 'row'},
        {name: 'cell'},
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

    const calloutContainers = [
      defineContainer({
        type: 'callout',
        arrayField: 'content',
        render: ({children}) => <>{children}</>,
      }),
    ]

    const tableContainers = [
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

    test('insert a block into a callout content field', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const calloutKey = keyGenerator()
      const contentBlockKey = keyGenerator()
      const contentSpanKey = keyGenerator()

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: containerSchema,
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: spanKey, text: 'hello', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'callout',
            _key: calloutKey,
            content: [
              {
                _type: 'block',
                _key: contentBlockKey,
                children: [
                  {
                    _type: 'span',
                    _key: contentSpanKey,
                    text: 'inside callout',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
        children: <NodePlugin nodes={calloutContainers} />,
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            type: 'insert',
            path: [{_key: calloutKey}, 'content', {_key: contentBlockKey}],
            position: 'after',
            items: [
              {
                _type: 'block',
                _key: 'new-block',
                children: [
                  {
                    _type: 'span',
                    _key: 'new-span',
                    text: 'new block',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
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
            _key: blockKey,
            children: [
              {_type: 'span', _key: spanKey, text: 'hello', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'callout',
            _key: calloutKey,
            content: [
              {
                _type: 'block',
                _key: contentBlockKey,
                children: [
                  {
                    _type: 'span',
                    _key: contentSpanKey,
                    text: 'inside callout',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
              {
                _type: 'block',
                _key: 'new-block',
                children: [
                  {
                    _type: 'span',
                    _key: 'new-span',
                    text: 'new block',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ])
      })
    })

    test('insert a span into a text block inside a callout', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const calloutKey = keyGenerator()
      const contentBlockKey = keyGenerator()
      const contentSpanKey = keyGenerator()

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: containerSchema,
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: spanKey, text: 'hello', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'callout',
            _key: calloutKey,
            content: [
              {
                _type: 'block',
                _key: contentBlockKey,
                children: [
                  {
                    _type: 'span',
                    _key: contentSpanKey,
                    text: 'first',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
        children: <NodePlugin nodes={calloutContainers} />,
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            type: 'insert',
            path: [
              {_key: calloutKey},
              'content',
              {_key: contentBlockKey},
              'children',
              {_key: contentSpanKey},
            ],
            position: 'after',
            items: [
              {
                _type: 'span',
                _key: 'new-span',
                text: ' second',
                marks: [],
              },
            ],
            origin: 'remote',
          },
        ],
      })

      // The adjacent same-mark spans are NOT merged: cosmetic normalization
      // is skipped while applying remote patches.
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: spanKey, text: 'hello', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'callout',
            _key: calloutKey,
            content: [
              {
                _type: 'block',
                _key: contentBlockKey,
                children: [
                  {
                    _type: 'span',
                    _key: contentSpanKey,
                    text: 'first',
                    marks: [],
                  },
                  {
                    _type: 'span',
                    _key: 'new-span',
                    text: ' second',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ])
      })
    })

    test('insert a block into a table cell content field', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const tableKey = keyGenerator()
      const rowKey = keyGenerator()
      const cellKey = keyGenerator()
      const contentBlockKey = keyGenerator()
      const contentSpanKey = keyGenerator()

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: containerSchema,
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: spanKey, text: 'hello', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'table',
            _key: tableKey,
            rows: [
              {
                _type: 'row',
                _key: rowKey,
                cells: [
                  {
                    _type: 'cell',
                    _key: cellKey,
                    content: [
                      {
                        _type: 'block',
                        _key: contentBlockKey,
                        children: [
                          {
                            _type: 'span',
                            _key: contentSpanKey,
                            text: 'cell text',
                            marks: [],
                          },
                        ],
                        markDefs: [],
                        style: 'normal',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        children: <NodePlugin nodes={tableContainers} />,
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            type: 'insert',
            path: [
              {_key: tableKey},
              'rows',
              {_key: rowKey},
              'cells',
              {_key: cellKey},
              'content',
              {_key: contentBlockKey},
            ],
            position: 'after',
            items: [
              {
                _type: 'block',
                _key: 'new-cell-block',
                children: [
                  {
                    _type: 'span',
                    _key: 'new-cell-span',
                    text: 'new cell text',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
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
            _key: blockKey,
            children: [
              {_type: 'span', _key: spanKey, text: 'hello', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'table',
            _key: tableKey,
            rows: [
              {
                _type: 'row',
                _key: rowKey,
                cells: [
                  {
                    _type: 'cell',
                    _key: cellKey,
                    content: [
                      {
                        _type: 'block',
                        _key: contentBlockKey,
                        children: [
                          {
                            _type: 'span',
                            _key: contentSpanKey,
                            text: 'cell text',
                            marks: [],
                          },
                        ],
                        markDefs: [],
                        style: 'normal',
                      },
                      {
                        _type: 'block',
                        _key: 'new-cell-block',
                        children: [
                          {
                            _type: 'span',
                            _key: 'new-cell-span',
                            text: 'new cell text',
                            marks: [],
                          },
                        ],
                        markDefs: [],
                        style: 'normal',
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

    test('insert a block into an empty callout content field at numeric index 0', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const calloutKey = keyGenerator()

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: containerSchema,
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: spanKey, text: 'hello', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'callout',
            _key: calloutKey,
            content: [],
          },
        ],
        children: <NodePlugin nodes={calloutContainers} />,
      })

      // Normalization adds a placeholder block (k5/k6) to the empty content
      // array. Unset it first, then insert at numeric index 0 into the
      // now-empty array. This exercises the fallback path in insertPatch
      // where getNode fails because there is nothing at index 0.
      editor.send({
        type: 'apply',
        patches: [
          {
            type: 'unset',
            path: [{_key: calloutKey}, 'content', {_key: 'k5'}],
            origin: 'remote',
          },
          {
            type: 'insert',
            path: [{_key: calloutKey}, 'content', 0],
            position: 'before',
            items: [
              {
                _type: 'block',
                _key: 'new-block',
                children: [
                  {
                    _type: 'span',
                    _key: 'new-span',
                    text: 'inserted into empty',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
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
            _key: blockKey,
            children: [
              {_type: 'span', _key: spanKey, text: 'hello', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'callout',
            _key: calloutKey,
            content: [
              {
                _type: 'block',
                _key: 'new-block',
                children: [
                  {
                    _type: 'span',
                    _key: 'new-span',
                    text: 'inserted into empty',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ])
      })
    })
  })

  test('Scenario: Typing into a pristine block synced in via `initialValue`', async () => {
    const patches: Array<Patch> = []
    const {editor, locator} = await createTestEditor({
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
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
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    await userEvent.click(locator)
    await userEvent.type(locator, 'a')

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'diffMatchPatch',
          path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('', 'a'))),
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: a behavior raising root `unset` then `insert.block` in one action set emits an applicable patch stream', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const initialValue: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: keyGenerator(),
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []},
        ],
      },
    ]
    const replacementBlock: PortableTextBlock = {
      _type: 'block',
      _key: keyGenerator(),
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keyGenerator(), text: 'bar', marks: []}],
    }

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue,
      children: (
        <>
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: 'custom.replace all',
                actions: [
                  () => [
                    raise({type: 'unset', at: []}),
                    raise({
                      type: 'insert.block',
                      block: replacementBlock,
                      placement: 'auto',
                    }),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
        </>
      ),
    })

    await userEvent.click(locator)
    editor.send({type: 'custom.replace all'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([replacementBlock])
    })

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {type: 'unset', path: [], origin: 'local'},
        {type: 'setIfMissing', path: [], value: [], origin: 'local'},
        {
          type: 'insert',
          path: [0],
          position: 'before',
          items: [replacementBlock],
          origin: 'local',
        },
      ])
    })

    expect(applyAll(initialValue, patches)).toEqual(
      editor.getSnapshot().context.value,
    )
  })

  test('Scenario: a behavior raising root `unset` twice then `insert.block` in one action set emits an applicable patch stream', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const initialValue: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: keyGenerator(),
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []},
        ],
      },
    ]
    const replacementBlock: PortableTextBlock = {
      _type: 'block',
      _key: keyGenerator(),
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keyGenerator(), text: 'bar', marks: []}],
    }

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue,
      children: (
        <>
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: 'custom.replace all',
                actions: [
                  () => [
                    raise({type: 'unset', at: []}),
                    raise({type: 'unset', at: []}),
                    raise({
                      type: 'insert.block',
                      block: replacementBlock,
                      placement: 'auto',
                    }),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
        </>
      ),
    })

    await userEvent.click(locator)
    editor.send({type: 'custom.replace all'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([replacementBlock])
    })

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {type: 'unset', path: [], origin: 'local'},
        {type: 'unset', path: [], origin: 'local'},
        {type: 'setIfMissing', path: [], value: [], origin: 'local'},
        {
          type: 'insert',
          path: [0],
          position: 'before',
          items: [replacementBlock],
          origin: 'local',
        },
      ])
    })

    expect(applyAll(initialValue, patches)).toEqual(
      editor.getSnapshot().context.value,
    )
  })

  test('Scenario: a behavior raising root `unset` then a root `set` to an empty block, then typing, emits an applicable patch stream', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const initialValue: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: keyGenerator(),
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []},
        ],
      },
    ]
    const emptyBlock: PortableTextBlock = {
      _type: 'block',
      _key: keyGenerator(),
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keyGenerator(), text: '', marks: []}],
    }

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue,
      children: (
        <>
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: 'custom.reset',
                actions: [
                  () => [
                    raise({type: 'unset', at: []}),
                    raise({type: 'set', at: [], value: [emptyBlock]}),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
        </>
      ),
    })

    await userEvent.click(locator)
    editor.send({type: 'custom.reset'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([emptyBlock])
    })

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {type: 'unset', path: [], origin: 'local'},
        {type: 'set', path: [], value: [emptyBlock], origin: 'local'},
        {type: 'unset', path: [], origin: 'local'},
      ])
    })

    expect(applyAll(initialValue, patches)).toEqual(undefined)

    await userEvent.type(locator, 'f')

    const expectedValue: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'f', marks: []}],
      },
    ]

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(expectedValue)
    })

    await vi.waitFor(() => {
      expect(patches.slice(3)).toEqual([
        {type: 'setIfMissing', path: [], value: [], origin: 'local'},
        {
          type: 'insert',
          path: [0],
          position: 'before',
          items: [emptyBlock],
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [{_key: 'k2'}, 'children', {_key: 'k3'}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('', 'f'))),
          origin: 'local',
        },
      ])
    })

    expect(applyAll(initialValue, patches)).toEqual(expectedValue)
  })

  test('Scenario: a behavior raising root `unset` then `insert.block` while the editor is an empty placeholder emits an applicable patch stream', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      children: (
        <>
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: 'custom.replace all',
                actions: [
                  () => {
                    const replacementBlock: PortableTextBlock = {
                      _type: 'block',
                      _key: keyGenerator(),
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: keyGenerator(),
                          text: 'bar',
                          marks: [],
                        },
                      ],
                    }
                    return [
                      raise({type: 'unset', at: []}),
                      raise({
                        type: 'insert.block',
                        block: replacementBlock,
                        placement: 'auto',
                      }),
                    ]
                  },
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
        </>
      ),
    })

    await userEvent.click(locator)
    editor.send({type: 'custom.replace all'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k2',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
        },
      ])
    })

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {type: 'setIfMissing', path: [], value: [], origin: 'local'},
        {
          type: 'insert',
          path: [0],
          position: 'before',
          items: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
            },
          ],
          origin: 'local',
        },
        {type: 'unset', path: [], origin: 'local'},
        {type: 'setIfMissing', path: [], value: [], origin: 'local'},
        {
          type: 'insert',
          path: [0],
          position: 'before',
          items: [
            {
              _type: 'block',
              _key: 'k2',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
            },
          ],
          origin: 'local',
        },
      ])
    })

    expect(applyAll([] as Array<PortableTextBlock>, patches)).toEqual(
      editor.getSnapshot().context.value,
    )
  })

  test('Scenario: `history.redo` replays a behavior-raised root `unset` then `insert.block` as an applicable patch stream', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const initialValue: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: keyGenerator(),
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []},
        ],
      },
    ]
    const replacementBlock: PortableTextBlock = {
      _type: 'block',
      _key: keyGenerator(),
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keyGenerator(), text: 'bar', marks: []}],
    }

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue,
      children: (
        <>
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: 'custom.replace all',
                actions: [
                  () => [
                    raise({type: 'unset', at: []}),
                    raise({
                      type: 'insert.block',
                      block: replacementBlock,
                      placement: 'auto',
                    }),
                  ],
                ],
              }),
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
        </>
      ),
    })

    await userEvent.click(locator)
    editor.send({type: 'custom.replace all'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([replacementBlock])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })

    const patchCountBeforeRedo = patches.length

    editor.send({type: 'history.redo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([replacementBlock])
    })

    const redoPatches = patches.slice(patchCountBeforeRedo)

    expect(applyAll(initialValue, redoPatches)).toEqual(
      editor.getSnapshot().context.value,
    )
  })

  test('Scenario: Remote `insert` next to a pristine block synced in via `initialValue`', async () => {
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [0],
          position: 'before',
          items: [
            {
              _key: 'c0',
              _type: 'block',
              children: [{_key: 'c1', _type: 'span', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'c0',
          _type: 'block',
          children: [{_key: 'c1', _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Typing into a pristine `initialValue` block', async () => {
    const patches: Array<Patch> = []
    const {locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: '', marks: []}],
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

    await userEvent.click(locator)
    await userEvent.type(locator, 'a')

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'diffMatchPatch',
          path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('', 'a'))),
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: `unset` of an inline object by index path emits a keyed patch', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const stockTickerKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        inlineObjects: [
          {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey, symbol: 'AAPL'},
            {_type: 'span', _key: barSpanKey, text: 'bar', marks: ['strong']},
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
          }}
        />
      ),
    })

    editor.send({type: 'unset', at: [0, 'children', 1]})

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: `set` of an inline object property by index path emits a keyed patch', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const stockTickerKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [
          {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey, symbol: 'AAPL'},
            {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
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
          }}
        />
      ),
    })

    editor.send({type: 'set', at: [0, 'children', 1, 'symbol'], value: 'NVDA'})

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [
            {_key: blockKey},
            'children',
            {_key: stockTickerKey},
            'symbol',
          ],
          value: 'NVDA',
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: `insert` of a span by index path emits keyed patches', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
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
      type: 'insert',
      at: [0, 'children', 0],
      position: 'after',
      value: {_type: 'span', _key: barSpanKey, text: 'bar', marks: ['strong']},
    })

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'setIfMissing',
          path: [{_key: blockKey}, 'children'],
          value: [],
          origin: 'local',
        },
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', {_key: fooSpanKey}],
          position: 'after',
          items: [
            {_type: 'span', _key: barSpanKey, text: 'bar', marks: ['strong']},
          ],
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: `insert.text` by index path emits a keyed patch', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
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
      type: 'insert.text',
      at: [0, 'children', 0],
      offset: 3,
      text: 'bar',
    })

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('foo', 'foobar'))),
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: `remove.text` by index path emits a keyed patch', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_type: 'span', _key: spanKey, text: 'foobar', marks: []}],
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
      type: 'remove.text',
      at: [0, 'children', 0],
      offset: 3,
      text: 'bar',
    })

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('foobar', 'foo'))),
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: `unset` of a `marks` element by index path keeps the `marks` index', async () => {
    const patches: Array<Patch> = []
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
          _key: blockKey,
          _type: 'block',
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
      type: 'unset',
      at: [{_key: blockKey}, 'children', 0, 'marks', 1],
    })

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'marks', 1],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_type: 'span', _key: spanKey, text: 'foo', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })
})

describe('event.patches with a compact path at the root', () => {
  test('Scenario: an incoming `set` patch at a compact span path (indexed) leaves the valid patches around it applied', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
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
          type: 'set',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: 'barbaz',
          origin: 'remote',
        },
        {type: 'set', path: [0, 0, 'text'], value: 'baz', origin: 'remote'},
        {
          type: 'insert',
          path: [{_key: 'b1'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
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
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])

    const compactOnlyEvents: Array<EditorEmittedEvent> = []
    editor.on('change', (event) => {
      compactOnlyEvents.push(event)
    })
    editor.on('patch', (event) => {
      compactOnlyEvents.push(event)
    })

    editor.send({
      type: 'apply',
      patches: [
        {type: 'set', path: [0, 0, 'text'], value: 'baz', origin: 'remote'},
      ],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: 'b1',
        children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: 'b2',
        children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: 'flushed',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'flushed', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    expect(compactOnlyEvents).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: 'flushed',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `unset` patch at a compact span path (indexed) leaves the valid patches around it applied', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
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
          type: 'set',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: 'barbaz',
          origin: 'remote',
        },
        {type: 'unset', path: [0, 0], origin: 'remote'},
        {
          type: 'insert',
          path: [{_key: 'b1'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
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
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])

    const compactOnlyEvents: Array<EditorEmittedEvent> = []
    editor.on('change', (event) => {
      compactOnlyEvents.push(event)
    })
    editor.on('patch', (event) => {
      compactOnlyEvents.push(event)
    })

    editor.send({
      type: 'apply',
      patches: [{type: 'unset', path: [0, 0], origin: 'remote'}],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: 'b1',
        children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: 'b2',
        children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: 'flushed',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'flushed', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    expect(compactOnlyEvents).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: 'flushed',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `insert` patch at a compact span path (indexed) leaves the valid patches around it applied', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
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
          type: 'set',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [0, 0],
          position: 'after',
          items: [{_type: 'span', _key: 's3', text: 'baz', marks: []}],
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [{_key: 'b1'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
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
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])

    const compactOnlyEvents: Array<EditorEmittedEvent> = []
    editor.on('change', (event) => {
      compactOnlyEvents.push(event)
    })
    editor.on('patch', (event) => {
      compactOnlyEvents.push(event)
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [0, 0],
          position: 'after',
          items: [{_type: 'span', _key: 's3', text: 'baz', marks: []}],
          origin: 'remote',
        },
      ],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: 'b1',
        children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: 'b2',
        children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: 'flushed',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'flushed', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    expect(compactOnlyEvents).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: 'flushed',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `diffMatchPatch` patch at a compact span path (indexed) leaves the valid patches around it applied', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
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
          type: 'set',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'diffMatchPatch',
          path: [0, 0, 'text'],
          value: stringifyPatches(makePatches(makeDiff('foo', 'foobaz'))),
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [{_key: 'b1'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
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
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])

    const compactOnlyEvents: Array<EditorEmittedEvent> = []
    editor.on('change', (event) => {
      compactOnlyEvents.push(event)
    })
    editor.on('patch', (event) => {
      compactOnlyEvents.push(event)
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'diffMatchPatch',
          path: [0, 0, 'text'],
          value: stringifyPatches(makePatches(makeDiff('foo', 'foobaz'))),
          origin: 'remote',
        },
      ],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: 'b1',
        children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: 'b2',
        children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: 'flushed',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'flushed', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    expect(compactOnlyEvents).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: 'flushed',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `setIfMissing` patch at a compact span path (indexed) leaves the valid patches around it applied', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
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
          type: 'set',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'setIfMissing',
          path: [0, 0, 'marks'],
          value: ['strong'],
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [{_key: 'b1'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
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
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])

    const compactOnlyEvents: Array<EditorEmittedEvent> = []
    editor.on('change', (event) => {
      compactOnlyEvents.push(event)
    })
    editor.on('patch', (event) => {
      compactOnlyEvents.push(event)
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'setIfMissing',
          path: [0, 0, 'marks'],
          value: ['strong'],
          origin: 'remote',
        },
      ],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: 'b1',
        children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: 'b2',
        children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: 'flushed',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'flushed', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    expect(compactOnlyEvents).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: 'flushed',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: a multi-item insert at a missing key whose items start with the first block inserts nothing', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={textBlockDepthsContainers} />,
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
          value: 'foofoo',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [{_key: 'missing'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b3',
              children: [{_type: 'span', _key: 's3', text: 'qux', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          origin: 'remote',
        },
        {
          type: 'set',
          path: [{_key: 'b2'}, 'children', {_key: 's2'}, 'text'],
          value: 'bazbaz',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foofoo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'bazbaz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: a multi-item insert at a missing key whose items start with the middle block inserts nothing', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={textBlockDepthsContainers} />,
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
          value: 'foofoo',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [{_key: 'missing'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b3',
              children: [{_type: 'span', _key: 's3', text: 'qux', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          origin: 'remote',
        },
        {
          type: 'set',
          path: [{_key: 'b2'}, 'children', {_key: 's2'}, 'text'],
          value: 'bazbaz',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foofoo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'bazbaz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: a multi-item insert at a missing key whose items start with the last block inserts nothing', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={textBlockDepthsContainers} />,
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
          value: 'foofoo',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [{_key: 'missing'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b3',
              children: [{_type: 'span', _key: 's3', text: 'qux', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          origin: 'remote',
        },
        {
          type: 'set',
          path: [{_key: 'b2'}, 'children', {_key: 's2'}, 'text'],
          value: 'bazbaz',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foofoo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'bazbaz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `set` patch at a path into an array inside an array changes nothing', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: propertyDataSchemaDefinition,
      initialValue: [
        {_type: 'image', _key: 'i0', data: {matrix: [[{text: 'foo'}]]}},
      ],
      children: (
        <>
          <NodePlugin
            nodes={[defineContainer({type: 'callout', arrayField: 'content'})]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
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
          type: 'set',
          path: [{_key: 'i0'}, 'data', 'matrix', 0, 0, 'text'],
          value: 'bar',
          origin: 'remote',
        },
        {
          type: 'set',
          path: [{_key: 'i0'}, 'data', 'caption'],
          value: 'baz',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'remote',
          operations: [
            {
              type: 'set',
              path: [{_key: 'i0'}, 'data', 'caption'],
              value: 'baz',
            },
          ],
        },
      ])
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'image',
        _key: 'i0',
        data: {matrix: [[{text: 'foo'}]], caption: 'baz'},
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })
})

describe('event.patches with a compact path inside a callout', () => {
  test('Scenario: an incoming `set` patch at a compact span path (indexed) leaves the valid patches around it applied', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
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
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'set',
          path: [0, 'content', 0, 0, 'text'],
          value: 'baz',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [{_key: 'c0'}, 'content', {_key: 'b1'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
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
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'c0'}, 'content', {_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])

    const compactOnlyEvents: Array<EditorEmittedEvent> = []
    editor.on('change', (event) => {
      compactOnlyEvents.push(event)
    })
    editor.on('patch', (event) => {
      compactOnlyEvents.push(event)
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [0, 'content', 0, 0, 'text'],
          value: 'baz',
          origin: 'remote',
        },
      ],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'b1',
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'b2',
            children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'flushed',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's1', text: 'flushed', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(compactOnlyEvents).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'flushed',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `unset` patch at a compact span path (indexed) leaves the valid patches around it applied', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
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
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {type: 'unset', path: [0, 'content', 0, 0], origin: 'remote'},
        {
          type: 'insert',
          path: [{_key: 'c0'}, 'content', {_key: 'b1'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
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
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'c0'}, 'content', {_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])

    const compactOnlyEvents: Array<EditorEmittedEvent> = []
    editor.on('change', (event) => {
      compactOnlyEvents.push(event)
    })
    editor.on('patch', (event) => {
      compactOnlyEvents.push(event)
    })

    editor.send({
      type: 'apply',
      patches: [{type: 'unset', path: [0, 'content', 0, 0], origin: 'remote'}],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'b1',
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'b2',
            children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'flushed',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's1', text: 'flushed', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(compactOnlyEvents).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'flushed',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `insert` patch at a compact span path (indexed) leaves the valid patches around it applied', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
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
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [0, 'content', 0, 0],
          position: 'after',
          items: [{_type: 'span', _key: 's3', text: 'baz', marks: []}],
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [{_key: 'c0'}, 'content', {_key: 'b1'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
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
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'c0'}, 'content', {_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])

    const compactOnlyEvents: Array<EditorEmittedEvent> = []
    editor.on('change', (event) => {
      compactOnlyEvents.push(event)
    })
    editor.on('patch', (event) => {
      compactOnlyEvents.push(event)
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [0, 'content', 0, 0],
          position: 'after',
          items: [{_type: 'span', _key: 's3', text: 'baz', marks: []}],
          origin: 'remote',
        },
      ],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'b1',
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'b2',
            children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'flushed',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's1', text: 'flushed', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(compactOnlyEvents).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'flushed',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `diffMatchPatch` patch at a compact span path (indexed) leaves the valid patches around it applied', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
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
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'diffMatchPatch',
          path: [0, 'content', 0, 0, 'text'],
          value: stringifyPatches(makePatches(makeDiff('foo', 'foobaz'))),
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [{_key: 'c0'}, 'content', {_key: 'b1'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
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
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'c0'}, 'content', {_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])

    const compactOnlyEvents: Array<EditorEmittedEvent> = []
    editor.on('change', (event) => {
      compactOnlyEvents.push(event)
    })
    editor.on('patch', (event) => {
      compactOnlyEvents.push(event)
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'diffMatchPatch',
          path: [0, 'content', 0, 0, 'text'],
          value: stringifyPatches(makePatches(makeDiff('foo', 'foobaz'))),
          origin: 'remote',
        },
      ],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'b1',
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'b2',
            children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'flushed',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's1', text: 'flushed', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(compactOnlyEvents).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'flushed',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `setIfMissing` patch at a compact span path (indexed) leaves the valid patches around it applied', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
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
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'setIfMissing',
          path: [0, 'content', 0, 0, 'marks'],
          value: ['strong'],
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [{_key: 'c0'}, 'content', {_key: 'b1'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
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
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'c0'}, 'content', {_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])

    const compactOnlyEvents: Array<EditorEmittedEvent> = []
    editor.on('change', (event) => {
      compactOnlyEvents.push(event)
    })
    editor.on('patch', (event) => {
      compactOnlyEvents.push(event)
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'setIfMissing',
          path: [0, 'content', 0, 0, 'marks'],
          value: ['strong'],
          origin: 'remote',
        },
      ],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'b1',
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'b2',
            children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'flushed',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's1', text: 'flushed', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(compactOnlyEvents).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'flushed',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: a multi-item insert at a missing key whose items start with the first block inserts nothing', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <NodePlugin nodes={textBlockDepthsContainers} />,
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 's0'},
            'text',
          ],
          value: 'foofoo',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [{_key: 'c0'}, 'content', {_key: 'missing'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b3',
              children: [{_type: 'span', _key: 's3', text: 'qux', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          origin: 'remote',
        },
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b2'},
            'children',
            {_key: 's2'},
            'text',
          ],
          value: 'bazbaz',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [
                {_type: 'span', _key: 's0', text: 'foofoo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [
                {_type: 'span', _key: 's2', text: 'bazbaz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: a multi-item insert at a missing key whose items start with the middle block inserts nothing', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <NodePlugin nodes={textBlockDepthsContainers} />,
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 's0'},
            'text',
          ],
          value: 'foofoo',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [{_key: 'c0'}, 'content', {_key: 'missing'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b3',
              children: [{_type: 'span', _key: 's3', text: 'qux', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          origin: 'remote',
        },
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b2'},
            'children',
            {_key: 's2'},
            'text',
          ],
          value: 'bazbaz',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [
                {_type: 'span', _key: 's0', text: 'foofoo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [
                {_type: 'span', _key: 's2', text: 'bazbaz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: a multi-item insert at a missing key whose items start with the last block inserts nothing', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <NodePlugin nodes={textBlockDepthsContainers} />,
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 's0'},
            'text',
          ],
          value: 'foofoo',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [{_key: 'c0'}, 'content', {_key: 'missing'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b3',
              children: [{_type: 'span', _key: 's3', text: 'qux', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          origin: 'remote',
        },
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b2'},
            'children',
            {_key: 's2'},
            'text',
          ],
          value: 'bazbaz',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [
                {_type: 'span', _key: 's0', text: 'foofoo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [
                {_type: 'span', _key: 's2', text: 'bazbaz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `set` patch at a path into an array inside an array changes nothing', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: propertyDataSchemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {_type: 'image', _key: 'i0', data: {matrix: [[{text: 'foo'}]]}},
          ],
        },
      ],
      children: (
        <>
          <NodePlugin
            nodes={[defineContainer({type: 'callout', arrayField: 'content'})]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
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
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'i0'},
            'data',
            'matrix',
            0,
            0,
            'text',
          ],
          value: 'bar',
          origin: 'remote',
        },
        {
          type: 'set',
          path: [{_key: 'c0'}, 'content', {_key: 'i0'}, 'data', 'caption'],
          value: 'baz',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'remote',
          operations: [
            {
              type: 'set',
              path: [{_key: 'c0'}, 'content', {_key: 'i0'}, 'data', 'caption'],
              value: 'baz',
            },
          ],
        },
      ])
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'image',
            _key: 'i0',
            data: {matrix: [[{text: 'foo'}]], caption: 'baz'},
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })
})

describe('event.patches with a compact path inside a callout inside a callout', () => {
  test('Scenario: an incoming `set` patch at a compact span path (indexed) leaves the valid patches around it applied', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'callout',
              _key: 'c1',
              content: [
                {
                  _type: 'block',
                  _key: 'b0',
                  children: [
                    {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'bar', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
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
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'set',
          path: [0, 'content', 0, 'content', 0, 0, 'text'],
          value: 'baz',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
          ],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
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
          _key: 'c0',
          content: [
            {
              _type: 'callout',
              _key: 'c1',
              content: [
                {
                  _type: 'block',
                  _key: 'b0',
                  children: [
                    {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b2',
                  children: [
                    {_type: 'span', _key: 's2', text: 'baz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
            ],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])

    const compactOnlyEvents: Array<EditorEmittedEvent> = []
    editor.on('change', (event) => {
      compactOnlyEvents.push(event)
    })
    editor.on('patch', (event) => {
      compactOnlyEvents.push(event)
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [0, 'content', 0, 'content', 0, 0, 'text'],
          value: 'baz',
          origin: 'remote',
        },
      ],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'callout',
            _key: 'c1',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
                markDefs: [],
                style: 'normal',
              },
              {
                _type: 'block',
                _key: 'b1',
                children: [
                  {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
              {
                _type: 'block',
                _key: 'b2',
                children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ])

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'flushed',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'callout',
              _key: 'c1',
              content: [
                {
                  _type: 'block',
                  _key: 'b0',
                  children: [
                    {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'flushed', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b2',
                  children: [
                    {_type: 'span', _key: 's2', text: 'baz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ])
    })
    expect(compactOnlyEvents).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'flushed',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `unset` patch at a compact span path (indexed) leaves the valid patches around it applied', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'callout',
              _key: 'c1',
              content: [
                {
                  _type: 'block',
                  _key: 'b0',
                  children: [
                    {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'bar', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
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
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'unset',
          path: [0, 'content', 0, 'content', 0, 0],
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
          ],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
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
          _key: 'c0',
          content: [
            {
              _type: 'callout',
              _key: 'c1',
              content: [
                {
                  _type: 'block',
                  _key: 'b0',
                  children: [
                    {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b2',
                  children: [
                    {_type: 'span', _key: 's2', text: 'baz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
            ],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])

    const compactOnlyEvents: Array<EditorEmittedEvent> = []
    editor.on('change', (event) => {
      compactOnlyEvents.push(event)
    })
    editor.on('patch', (event) => {
      compactOnlyEvents.push(event)
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          path: [0, 'content', 0, 'content', 0, 0],
          origin: 'remote',
        },
      ],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'callout',
            _key: 'c1',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
                markDefs: [],
                style: 'normal',
              },
              {
                _type: 'block',
                _key: 'b1',
                children: [
                  {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
              {
                _type: 'block',
                _key: 'b2',
                children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ])

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'flushed',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'callout',
              _key: 'c1',
              content: [
                {
                  _type: 'block',
                  _key: 'b0',
                  children: [
                    {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'flushed', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b2',
                  children: [
                    {_type: 'span', _key: 's2', text: 'baz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ])
    })
    expect(compactOnlyEvents).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'flushed',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `insert` patch at a compact span path (indexed) leaves the valid patches around it applied', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'callout',
              _key: 'c1',
              content: [
                {
                  _type: 'block',
                  _key: 'b0',
                  children: [
                    {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'bar', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
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
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [0, 'content', 0, 'content', 0, 0],
          position: 'after',
          items: [{_type: 'span', _key: 's3', text: 'baz', marks: []}],
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
          ],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
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
          _key: 'c0',
          content: [
            {
              _type: 'callout',
              _key: 'c1',
              content: [
                {
                  _type: 'block',
                  _key: 'b0',
                  children: [
                    {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b2',
                  children: [
                    {_type: 'span', _key: 's2', text: 'baz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
            ],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])

    const compactOnlyEvents: Array<EditorEmittedEvent> = []
    editor.on('change', (event) => {
      compactOnlyEvents.push(event)
    })
    editor.on('patch', (event) => {
      compactOnlyEvents.push(event)
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [0, 'content', 0, 'content', 0, 0],
          position: 'after',
          items: [{_type: 'span', _key: 's3', text: 'baz', marks: []}],
          origin: 'remote',
        },
      ],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'callout',
            _key: 'c1',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
                markDefs: [],
                style: 'normal',
              },
              {
                _type: 'block',
                _key: 'b1',
                children: [
                  {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
              {
                _type: 'block',
                _key: 'b2',
                children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ])

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'flushed',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'callout',
              _key: 'c1',
              content: [
                {
                  _type: 'block',
                  _key: 'b0',
                  children: [
                    {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'flushed', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b2',
                  children: [
                    {_type: 'span', _key: 's2', text: 'baz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ])
    })
    expect(compactOnlyEvents).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'flushed',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `diffMatchPatch` patch at a compact span path (indexed) leaves the valid patches around it applied', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'callout',
              _key: 'c1',
              content: [
                {
                  _type: 'block',
                  _key: 'b0',
                  children: [
                    {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'bar', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
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
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'diffMatchPatch',
          path: [0, 'content', 0, 'content', 0, 0, 'text'],
          value: stringifyPatches(makePatches(makeDiff('foo', 'foobaz'))),
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
          ],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
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
          _key: 'c0',
          content: [
            {
              _type: 'callout',
              _key: 'c1',
              content: [
                {
                  _type: 'block',
                  _key: 'b0',
                  children: [
                    {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b2',
                  children: [
                    {_type: 'span', _key: 's2', text: 'baz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
            ],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])

    const compactOnlyEvents: Array<EditorEmittedEvent> = []
    editor.on('change', (event) => {
      compactOnlyEvents.push(event)
    })
    editor.on('patch', (event) => {
      compactOnlyEvents.push(event)
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'diffMatchPatch',
          path: [0, 'content', 0, 'content', 0, 0, 'text'],
          value: stringifyPatches(makePatches(makeDiff('foo', 'foobaz'))),
          origin: 'remote',
        },
      ],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'callout',
            _key: 'c1',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
                markDefs: [],
                style: 'normal',
              },
              {
                _type: 'block',
                _key: 'b1',
                children: [
                  {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
              {
                _type: 'block',
                _key: 'b2',
                children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ])

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'flushed',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'callout',
              _key: 'c1',
              content: [
                {
                  _type: 'block',
                  _key: 'b0',
                  children: [
                    {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'flushed', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b2',
                  children: [
                    {_type: 'span', _key: 's2', text: 'baz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ])
    })
    expect(compactOnlyEvents).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'flushed',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `setIfMissing` patch at a compact span path (indexed) leaves the valid patches around it applied', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'callout',
              _key: 'c1',
              content: [
                {
                  _type: 'block',
                  _key: 'b0',
                  children: [
                    {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'bar', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
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
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'setIfMissing',
          path: [0, 'content', 0, 'content', 0, 0, 'marks'],
          value: ['strong'],
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
          ],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
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
          _key: 'c0',
          content: [
            {
              _type: 'callout',
              _key: 'c1',
              content: [
                {
                  _type: 'block',
                  _key: 'b0',
                  children: [
                    {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b2',
                  children: [
                    {_type: 'span', _key: 's2', text: 'baz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
            ],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])

    const compactOnlyEvents: Array<EditorEmittedEvent> = []
    editor.on('change', (event) => {
      compactOnlyEvents.push(event)
    })
    editor.on('patch', (event) => {
      compactOnlyEvents.push(event)
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'setIfMissing',
          path: [0, 'content', 0, 'content', 0, 0, 'marks'],
          value: ['strong'],
          origin: 'remote',
        },
      ],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'callout',
            _key: 'c1',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
                markDefs: [],
                style: 'normal',
              },
              {
                _type: 'block',
                _key: 'b1',
                children: [
                  {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
              {
                _type: 'block',
                _key: 'b2',
                children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ])

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'flushed',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'callout',
              _key: 'c1',
              content: [
                {
                  _type: 'block',
                  _key: 'b0',
                  children: [
                    {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'flushed', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b2',
                  children: [
                    {_type: 'span', _key: 's2', text: 'baz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ])
    })
    expect(compactOnlyEvents).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'flushed',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: a multi-item insert at a missing key whose items start with the first block inserts nothing', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'callout',
              _key: 'c1',
              content: [
                {
                  _type: 'block',
                  _key: 'b0',
                  children: [
                    {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'bar', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b2',
                  children: [
                    {_type: 'span', _key: 's2', text: 'baz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={textBlockDepthsContainers} />,
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 's0'},
            'text',
          ],
          value: 'foofoo',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'missing'},
          ],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b3',
              children: [{_type: 'span', _key: 's3', text: 'qux', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          origin: 'remote',
        },
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b2'},
            'children',
            {_key: 's2'},
            'text',
          ],
          value: 'bazbaz',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'callout',
              _key: 'c1',
              content: [
                {
                  _type: 'block',
                  _key: 'b0',
                  children: [
                    {_type: 'span', _key: 's0', text: 'foofoo', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'bar', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b2',
                  children: [
                    {_type: 'span', _key: 's2', text: 'bazbaz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ])
    })
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: a multi-item insert at a missing key whose items start with the middle block inserts nothing', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'callout',
              _key: 'c1',
              content: [
                {
                  _type: 'block',
                  _key: 'b0',
                  children: [
                    {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'bar', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b2',
                  children: [
                    {_type: 'span', _key: 's2', text: 'baz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={textBlockDepthsContainers} />,
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 's0'},
            'text',
          ],
          value: 'foofoo',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'missing'},
          ],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b3',
              children: [{_type: 'span', _key: 's3', text: 'qux', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          origin: 'remote',
        },
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b2'},
            'children',
            {_key: 's2'},
            'text',
          ],
          value: 'bazbaz',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'callout',
              _key: 'c1',
              content: [
                {
                  _type: 'block',
                  _key: 'b0',
                  children: [
                    {_type: 'span', _key: 's0', text: 'foofoo', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'bar', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b2',
                  children: [
                    {_type: 'span', _key: 's2', text: 'bazbaz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ])
    })
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: a multi-item insert at a missing key whose items start with the last block inserts nothing', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'callout',
              _key: 'c1',
              content: [
                {
                  _type: 'block',
                  _key: 'b0',
                  children: [
                    {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'bar', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b2',
                  children: [
                    {_type: 'span', _key: 's2', text: 'baz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={textBlockDepthsContainers} />,
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 's0'},
            'text',
          ],
          value: 'foofoo',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'missing'},
          ],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b3',
              children: [{_type: 'span', _key: 's3', text: 'qux', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          origin: 'remote',
        },
        {
          type: 'set',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b2'},
            'children',
            {_key: 's2'},
            'text',
          ],
          value: 'bazbaz',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'callout',
              _key: 'c1',
              content: [
                {
                  _type: 'block',
                  _key: 'b0',
                  children: [
                    {_type: 'span', _key: 's0', text: 'foofoo', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'bar', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b2',
                  children: [
                    {_type: 'span', _key: 's2', text: 'bazbaz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ])
    })
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })
})

describe('event.patches with a compact path inside a field with its own sub-schema', () => {
  test('Scenario: an incoming `set` patch at a compact span path (indexed) leaves the valid patches around it applied', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'note',
          _key: 'n0',
          body: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
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
          type: 'set',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'set',
          path: [0, 'body', 0, 0, 'text'],
          value: 'baz',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [{_key: 'n0'}, 'body', {_key: 'b1'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'note',
          _key: 'n0',
          body: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'n0'},
              'body',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'n0'}, 'body', {_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])

    const compactOnlyEvents: Array<EditorEmittedEvent> = []
    editor.on('change', (event) => {
      compactOnlyEvents.push(event)
    })
    editor.on('patch', (event) => {
      compactOnlyEvents.push(event)
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [0, 'body', 0, 0, 'text'],
          value: 'baz',
          origin: 'remote',
        },
      ],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'note',
        _key: 'n0',
        body: [
          {
            _type: 'block',
            _key: 'b0',
            children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'b1',
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'b2',
            children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'flushed',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'note',
          _key: 'n0',
          body: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's1', text: 'flushed', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(compactOnlyEvents).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'n0'},
              'body',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'flushed',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `unset` patch at a compact span path (indexed) leaves the valid patches around it applied', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'note',
          _key: 'n0',
          body: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
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
          type: 'set',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {type: 'unset', path: [0, 'body', 0, 0], origin: 'remote'},
        {
          type: 'insert',
          path: [{_key: 'n0'}, 'body', {_key: 'b1'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'note',
          _key: 'n0',
          body: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'n0'},
              'body',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'n0'}, 'body', {_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])

    const compactOnlyEvents: Array<EditorEmittedEvent> = []
    editor.on('change', (event) => {
      compactOnlyEvents.push(event)
    })
    editor.on('patch', (event) => {
      compactOnlyEvents.push(event)
    })

    editor.send({
      type: 'apply',
      patches: [{type: 'unset', path: [0, 'body', 0, 0], origin: 'remote'}],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'note',
        _key: 'n0',
        body: [
          {
            _type: 'block',
            _key: 'b0',
            children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'b1',
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'b2',
            children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'flushed',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'note',
          _key: 'n0',
          body: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's1', text: 'flushed', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(compactOnlyEvents).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'n0'},
              'body',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'flushed',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `insert` patch at a compact span path (indexed) leaves the valid patches around it applied', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'note',
          _key: 'n0',
          body: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
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
          type: 'set',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [0, 'body', 0, 0],
          position: 'after',
          items: [{_type: 'span', _key: 's3', text: 'baz', marks: []}],
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [{_key: 'n0'}, 'body', {_key: 'b1'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'note',
          _key: 'n0',
          body: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'n0'},
              'body',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'n0'}, 'body', {_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])

    const compactOnlyEvents: Array<EditorEmittedEvent> = []
    editor.on('change', (event) => {
      compactOnlyEvents.push(event)
    })
    editor.on('patch', (event) => {
      compactOnlyEvents.push(event)
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [0, 'body', 0, 0],
          position: 'after',
          items: [{_type: 'span', _key: 's3', text: 'baz', marks: []}],
          origin: 'remote',
        },
      ],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'note',
        _key: 'n0',
        body: [
          {
            _type: 'block',
            _key: 'b0',
            children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'b1',
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'b2',
            children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'flushed',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'note',
          _key: 'n0',
          body: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's1', text: 'flushed', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(compactOnlyEvents).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'n0'},
              'body',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'flushed',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `diffMatchPatch` patch at a compact span path (indexed) leaves the valid patches around it applied', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'note',
          _key: 'n0',
          body: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
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
          type: 'set',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'diffMatchPatch',
          path: [0, 'body', 0, 0, 'text'],
          value: stringifyPatches(makePatches(makeDiff('foo', 'foobaz'))),
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [{_key: 'n0'}, 'body', {_key: 'b1'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'note',
          _key: 'n0',
          body: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'n0'},
              'body',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'n0'}, 'body', {_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])

    const compactOnlyEvents: Array<EditorEmittedEvent> = []
    editor.on('change', (event) => {
      compactOnlyEvents.push(event)
    })
    editor.on('patch', (event) => {
      compactOnlyEvents.push(event)
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'diffMatchPatch',
          path: [0, 'body', 0, 0, 'text'],
          value: stringifyPatches(makePatches(makeDiff('foo', 'foobaz'))),
          origin: 'remote',
        },
      ],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'note',
        _key: 'n0',
        body: [
          {
            _type: 'block',
            _key: 'b0',
            children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'b1',
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'b2',
            children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'flushed',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'note',
          _key: 'n0',
          body: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's1', text: 'flushed', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(compactOnlyEvents).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'n0'},
              'body',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'flushed',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: an incoming `setIfMissing` patch at a compact span path (indexed) leaves the valid patches around it applied', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'note',
          _key: 'n0',
          body: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
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
          type: 'set',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'barbaz',
          origin: 'remote',
        },
        {
          type: 'setIfMissing',
          path: [0, 'body', 0, 0, 'marks'],
          value: ['strong'],
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [{_key: 'n0'}, 'body', {_key: 'b1'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'note',
          _key: 'n0',
          body: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's1', text: 'barbaz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'n0'},
              'body',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'barbaz',
          },
          {
            type: 'insert',
            path: [{_key: 'n0'}, 'body', {_key: 'b1'}],
            position: 'after',
            node: {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          },
        ],
      },
    ])

    const compactOnlyEvents: Array<EditorEmittedEvent> = []
    editor.on('change', (event) => {
      compactOnlyEvents.push(event)
    })
    editor.on('patch', (event) => {
      compactOnlyEvents.push(event)
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'setIfMissing',
          path: [0, 'body', 0, 0, 'marks'],
          value: ['strong'],
          origin: 'remote',
        },
      ],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'note',
        _key: 'n0',
        body: [
          {
            _type: 'block',
            _key: 'b0',
            children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'b1',
            children: [{_type: 'span', _key: 's1', text: 'barbaz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'b2',
            children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'text',
          ],
          value: 'flushed',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'note',
          _key: 'n0',
          body: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's1', text: 'flushed', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(compactOnlyEvents).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'n0'},
              'body',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'flushed',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: a multi-item insert at a missing key whose items start with the first block inserts nothing', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'note',
          _key: 'n0',
          body: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <NodePlugin nodes={textBlockDepthsContainers} />,
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b0'},
            'children',
            {_key: 's0'},
            'text',
          ],
          value: 'foofoo',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [{_key: 'n0'}, 'body', {_key: 'missing'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b3',
              children: [{_type: 'span', _key: 's3', text: 'qux', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          origin: 'remote',
        },
        {
          type: 'set',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b2'},
            'children',
            {_key: 's2'},
            'text',
          ],
          value: 'bazbaz',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'note',
          _key: 'n0',
          body: [
            {
              _type: 'block',
              _key: 'b0',
              children: [
                {_type: 'span', _key: 's0', text: 'foofoo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [
                {_type: 'span', _key: 's2', text: 'bazbaz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: a multi-item insert at a missing key whose items start with the middle block inserts nothing', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'note',
          _key: 'n0',
          body: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <NodePlugin nodes={textBlockDepthsContainers} />,
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b0'},
            'children',
            {_key: 's0'},
            'text',
          ],
          value: 'foofoo',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [{_key: 'n0'}, 'body', {_key: 'missing'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b3',
              children: [{_type: 'span', _key: 's3', text: 'qux', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          origin: 'remote',
        },
        {
          type: 'set',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b2'},
            'children',
            {_key: 's2'},
            'text',
          ],
          value: 'bazbaz',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'note',
          _key: 'n0',
          body: [
            {
              _type: 'block',
              _key: 'b0',
              children: [
                {_type: 'span', _key: 's0', text: 'foofoo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [
                {_type: 'span', _key: 's2', text: 'bazbaz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })

  test('Scenario: a multi-item insert at a missing key whose items start with the last block inserts nothing', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'note',
          _key: 'n0',
          body: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <NodePlugin nodes={textBlockDepthsContainers} />,
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b0'},
            'children',
            {_key: 's0'},
            'text',
          ],
          value: 'foofoo',
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [{_key: 'n0'}, 'body', {_key: 'missing'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b3',
              children: [{_type: 'span', _key: 's3', text: 'qux', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          origin: 'remote',
        },
        {
          type: 'set',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b2'},
            'children',
            {_key: 's2'},
            'text',
          ],
          value: 'bazbaz',
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'note',
          _key: 'n0',
          body: [
            {
              _type: 'block',
              _key: 'b0',
              children: [
                {_type: 'span', _key: 's0', text: 'foofoo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [
                {_type: 'span', _key: 's2', text: 'bazbaz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })
})

const propertyDataSchemaDefinition = defineSchema({
  blockObjects: [
    {name: 'image', fields: [{name: 'data', type: 'object'}]},
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'image'}],
        },
      ],
    },
  ],
})
