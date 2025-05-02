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
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {EditorRefPlugin, EventListenerPlugin} from '../src/plugins'

describe('event.patches', () => {
  test('Scenario: Patching while syncing initial value', async () => {
    const editorRef = React.createRef<Editor>()
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

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({
            lists: [{name: 'bullet'}],
            styles: [{name: 'normal'}, {name: 'h1'}],
          }),
          initialValue: [listBlock],
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <EventListenerPlugin on={onEvent} />
        <PortableTextEditable />
      </EditorProvider>,
    )

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
    const editorRef = React.createRef<Editor>()
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

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({
            lists: [{name: 'bullet'}],
            styles: [{name: 'normal'}, {name: 'h1'}],
          }),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <EventListenerPlugin on={onEvent} />
        <PortableTextEditable />
      </EditorProvider>,
    )

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

  test('`set` block object properties', async () => {
    const editorRef = React.createRef<Editor>()
    const keyGenerator = createTestKeyGenerator()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
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
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

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
    const editorRef = React.createRef<Editor>()
    const keyGenerator = createTestKeyGenerator()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
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
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

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
})
