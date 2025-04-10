import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  type Editor,
} from '../src'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {EditorRefPlugin} from '../src/plugins'

describe('event.block.unset', () => {
  test('Scenario: removing block object property', async () => {
    const editorRef = React.createRef<Editor>()
    const keyGenerator = createTestKeyGenerator()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({
            blockObjects: [
              {name: 'url', fields: [{name: 'href', type: 'string'}]},
            ],
          }),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    const urlBlockKey = keyGenerator()

    editorRef.current?.send({
      type: 'insert.block',
      block: {
        _key: urlBlockKey,
        _type: 'url',
        href: 'https://www.sanity.io',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: urlBlockKey,
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
    })

    editorRef.current?.send({
      type: 'block.unset',
      at: [{_key: urlBlockKey}],
      props: ['href'],
    })

    await vi.waitFor(() => {
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: urlBlockKey,
          _type: 'url',
        },
      ])
    })
  })

  test('Scenario: removing block object _key sets a new _key', async () => {
    const editorRef = React.createRef<Editor>()
    const keyGenerator = createTestKeyGenerator()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({
            blockObjects: [
              {name: 'url', fields: [{name: 'href', type: 'string'}]},
            ],
          }),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    const urlBlockKey = keyGenerator()

    editorRef.current?.send({
      type: 'insert.block',
      block: {
        _key: urlBlockKey,
        _type: 'url',
        href: 'https://www.sanity.io',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: urlBlockKey,
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
    })

    editorRef.current?.send({
      type: 'block.unset',
      at: [{_key: urlBlockKey}],
      props: ['_key'],
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toMatchObject([
        {
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
      expect(
        editorRef.current?.getSnapshot().context.value()[0]._key,
      ).not.toEqual(urlBlockKey)
    })
  })

  test('Scenario: removing block object _type is a noop', async () => {
    const editorRef = React.createRef<Editor>()
    const keyGenerator = createTestKeyGenerator()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({
            blockObjects: [
              {name: 'url', fields: [{name: 'href', type: 'string'}]},
            ],
          }),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    const urlBlockKey = keyGenerator()

    editorRef.current?.send({
      type: 'insert.block',
      block: {
        _key: urlBlockKey,
        _type: 'url',
        href: 'https://www.sanity.io',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: urlBlockKey,
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
    })

    editorRef.current?.send({
      type: 'block.unset',
      at: [{_key: urlBlockKey}],
      props: ['_type'],
    })

    await vi.waitFor(() => {
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: urlBlockKey,
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
    })
  })

  test('Scenario: removing text block listItem', async () => {
    const editorRef = React.createRef<Editor>()
    const keyGenerator = createTestKeyGenerator()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({
            lists: [{name: 'bullet'}],
          }),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    const textBlockKey = keyGenerator()

    editorRef.current?.send({
      type: 'insert.block',
      block: {
        _key: textBlockKey,
        _type: 'block',
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'Hello, world!'},
        ],
        listItem: 'bullet',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      return expect(
        editorRef.current?.getSnapshot().context.value,
      ).toMatchObject([
        {
          _key: textBlockKey,
          _type: 'block',
          listItem: 'bullet',
          style: 'normal',
        },
      ])
    })

    editorRef.current?.send({
      type: 'block.unset',
      at: [{_key: textBlockKey}],
      props: ['listItem'],
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toMatchObject([
        {
          _key: textBlockKey,
          _type: 'block',
        },
      ])
      expect(editorRef.current?.getSnapshot().context.value()[0].listItem).toBe(
        undefined,
      )
    })
  })

  test('Scenario: removing text block style', async () => {
    const editorRef = React.createRef<Editor>()
    const keyGenerator = createTestKeyGenerator()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({
            styles: [{name: 'normal'}, {name: 'h1'}],
          }),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    const textBlockKey = keyGenerator()

    editorRef.current?.send({
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
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
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
    })

    editorRef.current?.send({
      type: 'block.unset',
      at: [{_key: textBlockKey}],
      props: ['style'],
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
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
    })
  })

  test('Scenario: Removing text block children is a noop', async () => {
    const editorRef = React.createRef<Editor>()
    const keyGenerator = createTestKeyGenerator()

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

    const textBlockKey = keyGenerator()

    editorRef.current?.send({
      type: 'insert.block',
      block: {
        _key: textBlockKey,
        _type: 'block',
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'Hello, world!'},
        ],
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
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
    })

    editorRef.current?.send({
      type: 'block.unset',
      at: [{_key: textBlockKey}],
      props: ['children'],
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
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
    })
  })
})
