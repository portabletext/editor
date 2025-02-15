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
            blockObjects: [{name: 'url'}],
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
            blockObjects: [{name: 'url'}],
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
        editorRef.current?.getSnapshot().context.value[0]._key,
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
            blockObjects: [{name: 'url'}],
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
})
