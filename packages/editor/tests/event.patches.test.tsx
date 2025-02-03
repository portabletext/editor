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

describe('event.patches', () => {
  test('`set` block object properties', async () => {
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
