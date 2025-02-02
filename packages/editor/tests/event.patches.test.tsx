import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {
  defineSchema,
  Editor,
  EditorProvider,
  PortableTextEditable,
} from '../src'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {EditorRefPlugin} from '../src/plugins'

describe('event.patches', () => {
  test('foo', async () => {
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
      type: 'insert.block',
      block: {
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
      },
      placement: 'auto',
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
          _type: 'block',
          children: [
            {
              _key: 'k3',
              _type: 'span',
              text: 'foo',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: 'k4',
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
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

    // editorRef.current?.send({
    //   type: 'patches',
    //   patches: [
    //     {
    //       origin: 'remote',
    //       type: 'set',
    //       path: [{_key: 'k2'}, 'description'],
    //       value: 'Sanity is a headless CMS',
    //       // path: [{_key: 'k2'}],
    //       // value: {
    //       //   _key: 'k2',
    //       //   _type: 'url',
    //       //   href: 'https://www.sanity.io',
    //       //   description: 'Sanity is a headless CMS',
    //       // },
    //     },
    //   ],
    //   snapshot: [
    //     {
    //       _key: 'k2',
    //       _type: 'url',
    //       href: 'https://www.sanity.io',
    //       description: 'Sanity is a headless CMS',
    //     },
    //   ],
    // })

    await vi.waitFor(() => {
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: 'k2',
          _type: 'url',
          // description: 'Sanity is a headless CMS',
          href: 'https://www.sanity.io',
        },
      ])
    })
  })
})
