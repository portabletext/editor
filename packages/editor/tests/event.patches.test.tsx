import type {SchemaDefinition} from '@portabletext/schema'
import {getTersePt} from '@portabletext/test'
import {makeDiff, makePatches, stringifyPatches} from '@sanity/diff-match-patch'
import {page, userEvent} from '@vitest/browser/context'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  type Editor,
  type EditorEmittedEvent,
} from '../src'
import {createTestEditor} from '../src/internal-utils/test-editor'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {EditorRefPlugin, EventListenerPlugin} from '../src/plugins'

async function getEditors({
  schemaDefinition,
}: {
  schemaDefinition?: SchemaDefinition
} = {}) {
  const editorARef = React.createRef<Editor>()
  const editorBRef = React.createRef<Editor>()
  const editorAKeyGenerator = createTestKeyGenerator('ea-')
  const editorBKeyGenerator = createTestKeyGenerator('eb-')
  const onEditorAEvent = vi.fn<(event: EditorEmittedEvent) => void>()
  const onEditorBEvent = vi.fn<(event: EditorEmittedEvent) => void>()

  const editors = (
    <>
      <EditorProvider
        initialConfig={{
          keyGenerator: editorAKeyGenerator,
          schemaDefinition: schemaDefinition ?? defineSchema({}),
        }}
      >
        <EditorRefPlugin ref={editorARef} />
        <EventListenerPlugin
          on={(event) => {
            onEditorAEvent(event)

            if (event.type === 'mutation') {
              editorBRef.current?.send({
                type: 'patches',
                patches: event.patches.map((patch) => ({
                  ...patch,
                  origin: 'remote',
                })),
                snapshot: editorBRef.current?.getSnapshot().context.value,
              })
            }
          }}
        />
        <PortableTextEditable data-testid="editor-a" />
      </EditorProvider>
      <EditorProvider
        initialConfig={{
          keyGenerator: editorBKeyGenerator,
          schemaDefinition: schemaDefinition ?? defineSchema({}),
        }}
      >
        <EditorRefPlugin ref={editorBRef} />
        <EventListenerPlugin
          on={(event) => {
            onEditorBEvent(event)

            if (event.type === 'mutation') {
              editorARef.current?.send({
                type: 'patches',
                patches: event.patches.map((patch) => ({
                  ...patch,
                  origin: 'remote',
                })),
                snapshot: editorARef.current?.getSnapshot().context.value,
              })
            }
          }}
        />
        <PortableTextEditable data-testid="editor-b" />
      </EditorProvider>
    </>
  )

  render(editors)

  const editorALocator = page.getByTestId('editor-a')
  const editorBLocator = page.getByTestId('editor-b')

  await vi.waitFor(async () => {
    await expect.element(editorALocator).toBeInTheDocument()
    await expect.element(editorBLocator).toBeInTheDocument()
  })

  return {
    editorALocator,
    editorBLocator,
    editorARef,
    editorBRef,
    onEditorAEvent,
    onEditorBEvent,
    editors,
  }
}

describe('event.patches', () => {
  test('Scenario: Consuming initial diffMatchPatch', async () => {
    const {editorARef, editorBRef, onEditorAEvent, editorALocator} =
      await getEditors()

    await userEvent.type(editorALocator, 'f')

    await vi.waitFor(() => {
      expect(onEditorAEvent).toHaveBeenCalledWith({
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          origin: 'local',
          path: [],
          value: [],
        },
      })
      expect(onEditorAEvent).toHaveBeenCalledWith({
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
      expect(onEditorAEvent).toHaveBeenCalledWith({
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
      expect(editorARef.current?.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'ea-k0',
          children: [{_type: 'span', _key: 'ea-k1', text: 'f', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(editorBRef.current?.getSnapshot().context.value).toEqual([
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
    const {editorARef, editorBRef, onEditorAEvent} = await getEditors()

    editorARef.current?.send({type: 'focus'})
    await userEvent.keyboard('{Enter}')

    await vi.waitFor(() => {
      expect(onEditorAEvent).toHaveBeenCalledWith({
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          origin: 'local',
          path: [],
          value: [],
        },
      })
      expect(onEditorAEvent).toHaveBeenCalledWith({
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
      expect(onEditorAEvent).toHaveBeenCalledWith({
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
      expect(editorARef.current?.getSnapshot().context.value).toEqual([
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
      expect(editorBRef.current?.getSnapshot().context.value).toEqual([
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
    const {editorARef, editorBRef, onEditorAEvent, editorALocator} =
      await getEditors()

    await userEvent.click(editorALocator)
    await userEvent.keyboard('{Enter}')

    await vi.waitFor(() => {
      expect(onEditorAEvent).toHaveBeenCalledWith({
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          origin: 'local',
          path: [],
          value: [],
        },
      })
      expect(onEditorAEvent).toHaveBeenCalledWith({
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
      expect(onEditorAEvent).toHaveBeenCalledWith({
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
      expect(editorARef.current?.getSnapshot().context.value).toEqual([
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
      expect(editorBRef.current?.getSnapshot().context.value).toEqual([
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

    const {editorRef} = await createTestEditor({
      initialValue: [listBlock],
      keyGenerator,
      schemaDefinition: defineSchema({
        lists: [{name: 'bullet'}],
        styles: [{name: 'normal'}, {name: 'h1'}],
      }),
    })

    editorRef.current?.send({
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
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        headingBlock,
        listBlock,
      ])
    })
  })

  test('Scenario: Patching while syncing incoming value', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editorRef, onEvent} = await createTestEditor({
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

    editorRef.current?.send({
      type: 'update value',
      value: [listBlock],
    })

    await vi.waitFor(() => {
      expect(onEvent).toHaveBeenCalledWith({type: 'ready'})
    })

    editorRef.current?.send({
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
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
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

    const {editorRef} = await createTestEditor({
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

    editorRef.current?.send({
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
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
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
    const {editorRef} = await createTestEditor({
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

    editorRef.current?.send({
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
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editorRef.current?.send({
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
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
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

    editorRef.current?.send({
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
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
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
    const {editorRef} = await createTestEditor({
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

    editorRef.current?.send({
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
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editorRef.current?.send({
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
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
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

  test('Scenario: `set` initial block object property', async () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    const {editorRef} = await createTestEditor({
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

    editorRef.current?.send({
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
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: imageKey,
          _type: 'image',
          src: 'https://www.sanity.io/logo.png',
        },
      ])
    })
  })

  test('`set` block object properties', async () => {
    const {editorRef} = await createTestEditor({
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

    editorRef.current?.send({
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
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: 'k2',
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
    })

    editorRef.current?.send({
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
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
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
    const {editorRef} = await createTestEditor({
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

    editorRef.current?.send({
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
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: 'k2',
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
    })

    editorRef.current?.send({
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
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
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
    const {editorRef} = await createTestEditor({
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

    editorRef.current?.send({
      type: 'patches',
      patches: [{type: 'unset', origin: 'remote', path: [{_key: 'k0'}, 'src']}],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: imageKey,
          _type: 'image',
          _map: {foo: 'bar'},
        },
      ])
    })

    editorRef.current?.send({
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
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: imageKey,
          _type: 'image',
          _map: {},
        },
      ])
    })

    editorRef.current?.send({
      type: 'patches',
      patches: [
        {type: 'unset', origin: 'remote', path: [{_key: imageKey}, '_map']},
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: imageKey,
          _type: 'image',
        },
      ])
    })
  })

  test('Scenario: Inserting inline object', async () => {
    const {editorARef, editorBRef} = await getEditors({
      schemaDefinition: defineSchema({
        inlineObjects: [
          {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
        ],
      }),
    })

    editorARef.current?.send({type: 'focus'})
    editorARef.current?.send({
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
          {_type: 'span', _key: 'ea-k4', text: '', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]

    await vi.waitFor(() => {
      expect(editorARef.current?.getSnapshot().context.value).toEqual(value)
      expect(editorBRef.current?.getSnapshot().context.value).toEqual(value)
    })
  })

  test('Scenario: `set` inline object properties', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const span1Key = keyGenerator()
    const stockTickerKey = keyGenerator()
    const span2Key = keyGenerator()
    const {editorRef} = await createTestEditor({
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

    editorRef.current?.send({
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
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
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

    editorRef.current?.send({
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
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
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

    const {editorRef} = await createTestEditor({
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

    editorRef.current?.send({
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
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
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

    editorRef.current?.send({
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
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
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

  test('Scenario: `unset` inline object properties', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const span1Key = keyGenerator()
    const stockTickerKey = keyGenerator()
    const span2Key = keyGenerator()
    const {editorRef} = await createTestEditor({
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

    editorRef.current?.send({
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
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
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
    const {editorRef} = await createTestEditor({
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

    editorRef.current?.send({
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
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
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

  // TODO: We should revisit this and allow `set` inside text blocks
  test('Scenario: `set`ing inside text block is a noop', async () => {
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

    const {editorRef} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: defineSchema({blockObjects: [{name: 'image'}]}),
    })

    await vi.waitFor(() => {
      return expect(editorRef.current?.getSnapshot().context.value).toEqual(
        initialValue,
      )
    })

    editorRef.current?.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: blockKey}, 'markDefs', {_key: markDefKey}],
          value: {href: 'https://www.sanity.io'},
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
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
        initialValue[0],
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
    const {editorRef, locator} = await createTestEditor({
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
      expect(getTersePt(editorRef.current!.getSnapshot().context)).toEqual([
        'foo bar',
      ])
    })

    editorRef.current?.send({
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
      expect(getTersePt(editorRef.current!.getSnapshot().context)).toEqual([
        'baz',
      ])
    })
  })

  describe('Feature: diffMatchPatch', () => {
    function createEditor(text: string) {
      const editorRef = React.createRef<Editor>()
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      render(
        <EditorProvider
          initialConfig={{
            keyGenerator,
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
            schemaDefinition: defineSchema({}),
          }}
        >
          <EditorRefPlugin ref={editorRef} />
          <PortableTextEditable />
        </EditorProvider>,
      )

      return {editorRef, keyGenerator, blockKey, spanKey}
    }

    test('Scenario: Adding and removing text to an empty editor', async () => {
      const {editorRef} = await createTestEditor({
        schemaDefinition: defineSchema({}),
      })

      editorRef.current?.send({
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
        expect(editorRef.current?.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'e', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])
      })

      editorRef.current?.send({
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
        expect(editorRef.current?.getSnapshot().context.value).toEqual([
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
      const {editorRef, blockKey, spanKey} = createEditor(editorText)

      editorRef.current?.send({
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
        return expect(editorRef.current?.getSnapshot().context.value).toEqual([
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
      const {editorRef, blockKey, spanKey} = createEditor(editorText)

      editorRef.current?.send({
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
        return expect(editorRef.current?.getSnapshot().context.value).toEqual([
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
      const {editorRef, blockKey, spanKey} = createEditor(editorText)

      editorRef.current?.send({
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
        return expect(editorRef.current?.getSnapshot().context.value).toEqual([
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
      const {editorRef, blockKey, spanKey} = createEditor(editorText)

      editorRef.current?.send({
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
        return expect(editorRef.current?.getSnapshot().context.value).toEqual([
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
      const {editorRef, blockKey, spanKey} = createEditor(editorText)

      editorRef.current?.send({
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
        return expect(editorRef.current?.getSnapshot().context.value).toEqual([
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

      const {editorRef, blockKey, spanKey} = createEditor(editorText)

      editorRef.current?.send({
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
        return expect(editorRef.current?.getSnapshot().context.value).toEqual([
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

      const {editorRef, blockKey, spanKey} = createEditor(editorText)

      editorRef.current?.send({
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
        return expect(editorRef.current?.getSnapshot().context.value).toEqual([
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

      const {editorRef, blockKey, spanKey} = createEditor(editorText)

      editorRef.current?.send({
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
        return expect(editorRef.current?.getSnapshot().context.value).toEqual([
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
})
