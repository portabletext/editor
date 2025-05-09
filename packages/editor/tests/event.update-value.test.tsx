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
import {EventListenerPlugin} from '../src/plugins'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'

describe('event.update value', () => {
  test('Scenario: Clearing placeholder value', async () => {
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({}),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    expect(editorRef.current?.getSnapshot().context.value).toEqual([
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

    editorRef.current?.send({
      type: 'update value',
      value: undefined,
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
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
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({}),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    editorRef.current?.send({
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
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
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

    editorRef.current?.send({
      type: 'update value',
      value: undefined,
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
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
    const editorRef = React.createRef<Editor>()
    const keyGenerator = createTestKeyGenerator()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({
            blockObjects: [{name: 'url'}],
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

    editorRef.current?.send({
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
        return expect(editorRef.current?.getSnapshot().context.value).toEqual([
          {
            _key: 'k2',
            _type: 'url',
            description: 'Sanity is a headless CMS',
            href: 'https://www.sanity.io',
          },
        ])
      },
      {
        timeout: 1100,
      },
    )
  })

  test('Scenario: Updating the text of an empty span', async () => {
    const editorRef = React.createRef<Editor>()
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

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({}),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    editorRef.current?.send({
      type: 'update value',
      value: [emptyFirstLine, lastLine],
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        emptyFirstLine,
        lastLine,
      ])
    })

    editorRef.current?.send({
      type: 'update value',
      value: [populatedFirstLine, lastLine],
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        populatedFirstLine,
        lastLine,
      ])
    })
  })

  test("Scenario: Updating before 'ready'", async () => {
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

    render(
      <EditorProvider
        initialConfig={{
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

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        listBlock,
      ])
    })
  })

  test('Scenario: Adding blocks before existing block', async () => {
    const editorRef = React.createRef<Editor>()
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

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({}),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <EventListenerPlugin on={onEvent} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    await vi.waitFor(() => {
      expect(onEvent).toHaveBeenCalledWith({type: 'ready'})
    })

    editorRef.current?.send({
      type: 'update value',
      value: [h2],
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([h2])
    })

    editorRef.current?.send({
      type: 'update value',
      value: [h1, paragraph, h2],
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        h1,
        paragraph,
        h2,
      ])
    })
  })
})
