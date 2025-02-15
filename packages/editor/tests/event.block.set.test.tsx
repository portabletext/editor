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
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'

describe('event.block.set', () => {
  test('Scenario: adding block object property', async () => {
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
      type: 'block.set',
      at: [{_key: urlBlockKey}],
      description: 'Sanity is a headless CMS',
    })

    await vi.waitFor(() => {
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: urlBlockKey,
          _type: 'url',
          href: 'https://www.sanity.io',
          description: 'Sanity is a headless CMS',
        },
      ])
    })
  })

  test('Scenario: updating block object _key', async () => {
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

    const newUrlBlockKey = keyGenerator()

    editorRef.current?.send({
      type: 'block.set',
      at: [{_key: urlBlockKey}],
      _key: newUrlBlockKey,
    })

    await vi.waitFor(() => {
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: newUrlBlockKey,
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
    })
  })

  test('Scenario: updating block object _type is a noop', async () => {
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
      type: 'block.set',
      at: [{_key: urlBlockKey}],
      _type: 'block',
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
