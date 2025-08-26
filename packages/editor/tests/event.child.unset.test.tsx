import {getTersePt} from '@portabletext/test'
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

describe('event.child.unset', () => {
  test('Scenario: Unsetting properties on span', async () => {
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
            marks: ['strong'],
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
      expect(getTersePt(editorRef.current!.getSnapshot().context)).toEqual([
        'Hello',
      ])
    })

    editorRef.current?.send({
      type: 'child.unset',
      at: [{_key: blockKey}, 'children', {_key: spanKey}],
      props: ['_type', '_key', 'text', 'marks'],
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: 'k4',
              text: '',
              marks: [],
            },
          ],
          style: 'normal',
          markDefs: [],
        },
      ])
    })
  })

  test('Scenario: Unsetting properties on inline object', async () => {
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
            alt: 'Sanity Logo',
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
            inlineObjects: [{name: 'image'}],
          }),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    await vi.waitFor(() => {
      expect(getTersePt(editorRef.current!.getSnapshot().context)).toEqual([
        ',{image},',
      ])
    })

    editorRef.current?.send({
      type: 'child.unset',
      at: [{_key: blockKey}, 'children', {_key: imageKey}],
      props: ['_type', '_key', 'alt'],
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          ...initialValue[0],
          children: [
            {
              ...initialValue[0].children[0],
            },
            {
              // _type can't be unset
              _type: 'image',
              // unsetting _key will generate a new _key
              _key: 'k6',
              url: 'https://www.sanity.io/logo.svg',
            },
            {
              ...initialValue[0].children[2],
            },
          ],
        },
      ])
    })
  })
})
