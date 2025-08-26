import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import type {PortableTextChild} from '@sanity/types'
import * as React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import type {Editor} from '../src/editor'
import {PortableTextEditable} from '../src/editor/Editable'
import {EditorProvider} from '../src/editor/editor-provider'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'

const keyGenerator = createTestKeyGenerator()

const foo = {
  _key: keyGenerator(),
  _type: 'span',
  text: 'foo',
  marks: [],
}
const fooBar = {
  _key: keyGenerator(),
  _type: 'span',
  text: 'foo bar',
  marks: [],
}
const stockTicker = {
  _key: keyGenerator(),
  _type: 'stock-ticker',
  value: 'AAPL',
}
const empty = {
  _key: keyGenerator(),
  _type: 'span',
  text: '',
  marks: [],
}
function createBlock(children: Array<PortableTextChild>) {
  return {
    _key: keyGenerator(),
    _type: 'block',
    children,
    markDefs: [],
    style: 'normal',
  }
}
function createSpan(text: string) {
  return {
    _key: keyGenerator(),
    _type: 'span',
    text,
    marks: [],
  }
}

describe('event.decorator.add', () => {
  describe('manual offsets', () => {
    test('Scenario: Adding decorator with inline object at the end', async () => {
      const editorRef = React.createRef<Editor>()
      const block = createBlock([foo, stockTicker, empty])

      render(
        <EditorProvider
          initialConfig={{
            keyGenerator,
            schemaDefinition: defineSchema({
              decorators: [{name: 'strong'}],
              inlineObjects: [{name: 'stock-ticker'}],
            }),
            initialValue: [block],
          }}
        >
          <EditorRefPlugin ref={editorRef} />
          <PortableTextEditable />
        </EditorProvider>,
      )

      await vi.waitFor(() => {
        return expect(editorRef.current?.getSnapshot().context.value).toEqual([
          block,
        ])
      })

      editorRef.current?.send({
        type: 'decorator.add',
        decorator: 'strong',
        at: {
          anchor: {
            path: [{_key: block._key}],
            offset: 0,
          },
          focus: {
            path: [{_key: block._key}],
            offset: 3,
          },
        },
      })

      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          ...block,
          children: [
            {
              ...foo,
              marks: ['strong'],
            },
            stockTicker,
            empty,
          ],
        },
      ])
    })

    test('Scenario: Adding decorator between two block edges', async () => {
      const editorRef = React.createRef<Editor>()
      const foo = createSpan('foo')
      const block1 = createBlock([foo])
      const bar = createSpan('bar')
      const block2 = createBlock([bar])
      const baz = createSpan('baz')
      const block3 = createBlock([baz])

      render(
        <EditorProvider
          initialConfig={{
            keyGenerator,
            schemaDefinition: defineSchema({
              decorators: [{name: 'strong'}],
            }),
            initialValue: [block1, block2, block3],
          }}
        >
          <EditorRefPlugin ref={editorRef} />
          <PortableTextEditable />
        </EditorProvider>,
      )

      await vi.waitFor(() => {
        return expect(editorRef.current?.getSnapshot().context.value).toEqual([
          block1,
          block2,
          block3,
        ])
      })

      editorRef.current?.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: block1._key}, 'children', {_key: foo._key}],
            offset: 3,
          },
          focus: {
            path: [{_key: block3._key}, 'children', {_key: baz._key}],
            offset: 0,
          },
        },
      })

      editorRef.current?.send({
        type: 'decorator.add',
        decorator: 'strong',
      })

      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        block1,
        {
          ...block2,
          children: [{...bar, marks: ['strong']}],
        },
        block3,
      ])
    })

    test('Scenario: Adding decorator between two block edges with manual offsets', async () => {
      const editorRef = React.createRef<Editor>()
      const foo = createSpan('foo')
      const block1 = createBlock([foo])
      const bar = createSpan('bar')
      const block2 = createBlock([bar])
      const baz = createSpan('baz')
      const block3 = createBlock([baz])

      render(
        <EditorProvider
          initialConfig={{
            keyGenerator,
            schemaDefinition: defineSchema({
              decorators: [{name: 'strong'}],
            }),
            initialValue: [block1, block2, block3],
          }}
        >
          <EditorRefPlugin ref={editorRef} />
          <PortableTextEditable />
        </EditorProvider>,
      )

      await vi.waitFor(() => {
        return expect(editorRef.current?.getSnapshot().context.value).toEqual([
          block1,
          block2,
          block3,
        ])
      })

      editorRef.current?.send({
        type: 'decorator.add',
        decorator: 'strong',
        at: {
          anchor: {
            path: [{_key: block1._key}],
            offset: 3,
          },
          focus: {
            path: [{_key: block3._key}],
            offset: 0,
          },
        },
      })

      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        block1,
        {
          ...block2,
          children: [{...bar, marks: ['strong']}],
        },
        block3,
      ])
    })

    test('Scenario: Adding decorator at the end of span', async () => {
      const editorRef = React.createRef<Editor>()
      const block = createBlock([fooBar])

      render(
        <EditorProvider
          initialConfig={{
            keyGenerator,
            schemaDefinition: defineSchema({
              decorators: [{name: 'strong'}],
              inlineObjects: [{name: 'stock-ticker'}],
            }),
            initialValue: [block],
          }}
        >
          <EditorRefPlugin ref={editorRef} />
          <PortableTextEditable />
        </EditorProvider>,
      )

      await vi.waitFor(() => {
        return expect(editorRef.current?.getSnapshot().context.value).toEqual([
          block,
        ])
      })

      editorRef.current?.send({
        type: 'decorator.add',
        decorator: 'strong',
        at: {
          anchor: {
            path: [{_key: block._key}],
            offset: 4,
          },
          focus: {
            path: [{_key: block._key}],
            offset: 7,
          },
        },
      })

      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          ...block,
          children: [
            {
              ...fooBar,
              text: 'foo ',
            },
            {
              _key: expect.any(String),
              _type: 'span',
              text: 'bar',
              marks: ['strong'],
            },
          ],
        },
      ])
    })
  })
})
