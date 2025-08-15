import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  type Editor,
} from '../src'
import {getTersePt} from '../src/internal-utils/terse-pt'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {EditorRefPlugin} from '../src/plugins'

describe('event.child.set', () => {
  test('Scenario: Setting properties on inline object', async () => {
    const editorRef = React.createRef<Editor>()
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const imageKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {
            _type: 'span',
            _key: keyGenerator(),
            text: '',
            marks: [],
          },
          {
            _type: 'image',
            _key: imageKey,
            url: 'https://www.sanity.io/logo.svg',
          },
          {
            _type: 'span',
            _key: keyGenerator(),
            text: '',
            marks: [],
          },
        ],
        style: 'normal',
        markDefs: [],
      },
    ]

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          initialValue,
          schemaDefinition: defineSchema({
            inlineObjects: [
              {
                name: 'image',
                fields: [
                  {
                    name: 'alt',
                    type: 'string',
                  },
                  {
                    name: 'url',
                    type: 'string',
                  },
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

    await vi.waitFor(() => {
      return expect(
        getTersePt(editorRef.current!.getSnapshot().context),
      ).toEqual([',{image},'])
    })

    const newImageKey = keyGenerator()

    editorRef.current?.send({
      type: 'child.set',
      at: [{_key: blockKey}, 'children', {_key: imageKey}],
      props: {
        _type: 'image2',
        _key: newImageKey,
        alt: 'Sanity Logo',
        caption: 'Unknown field',
      },
    })

    await vi.waitFor(() => {
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          ...initialValue[0],
          children: [
            ...initialValue[0].children.slice(0, 1),
            {
              _type: 'image',
              _key: newImageKey,
              url: 'https://www.sanity.io/logo.svg',
              alt: 'Sanity Logo',
            },
            ...initialValue[0].children.slice(2),
          ],
        },
      ])
    })
  })

  test('Scenario: Setting properties on span', async () => {
    const editorRef = React.createRef<Editor>()
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {
            _type: 'span',
            _key: spanKey,
            text: 'Hello',
            marks: [],
          },
        ],
        style: 'normal',
        markDefs: [],
      },
    ]

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          initialValue,
          schemaDefinition: defineSchema({
            decorators: [{name: 'strong'}],
          }),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    await vi.waitFor(() => {
      return expect(
        getTersePt(editorRef.current!.getSnapshot().context),
      ).toEqual(['Hello'])
    })

    const newSpanKey = keyGenerator()

    editorRef.current?.send({
      type: 'child.set',
      at: [{_key: blockKey}, 'children', {_key: spanKey}],
      props: {
        _type: 'span2',
        _key: newSpanKey,
        marks: ['strong'],
        text: 'Hello, world!',
      },
    })

    await vi.waitFor(() => {
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          ...initialValue[0],
          children: [
            {
              ...initialValue[0].children[0],
              _key: newSpanKey,
              text: 'Hello, world!',
              marks: ['strong'],
            },
          ],
        },
      ])
    })
  })
})
