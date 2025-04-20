import * as React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import type {Editor} from '../src/editor/create-editor'
import {PortableTextEditable} from '../src/editor/Editable'
import {EditorProvider} from '../src/editor/editor-provider'
import {defineSchema} from '../src/editor/editor-schema'
import {getTersePt} from '../src/internal-utils/terse-pt'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {getSelectionAfterText} from '../src/internal-utils/text-selection'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'

describe('event.split.block', () => {
  test('Scenario: Splitting mid-block before inline object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({
            inlineObjects: [{name: 'stock-ticker'}],
          }),
          initialValue: [
            {
              _key: keyGenerator(),
              _type: 'block',
              children: [
                {
                  _key: keyGenerator(),
                  _type: 'span',
                  text: 'foo',
                  marks: [],
                },
                {
                  _key: keyGenerator(),
                  _type: 'stock-ticker',
                  value: 'AAPL',
                },
                {
                  _key: keyGenerator(),
                  _type: 'span',
                  text: '',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    await vi.waitFor(() => {
      return expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['foo', '[stock-ticker]', ''])
    })

    editorRef.current?.send({
      type: 'select',
      at: getSelectionAfterText(
        editorRef.current.getSnapshot().context.value,
        'foo',
      ),
    })

    editorRef.current?.send({
      type: 'split.block',
    })

    expect(getTersePt(editorRef.current?.getSnapshot().context.value)).toEqual([
      'foo',
      '|',
      '',
      '[stock-ticker]',
      '',
    ])
  })

  test('Scenario: Splitting text block with custom properties', async () => {
    const keyGenerator = createTestKeyGenerator()
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({}),
          initialValue: [
            {
              _key: keyGenerator(),
              _type: 'block',
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'foo bar baz'},
              ],
              _foo: 'bar',
              baz: 42,
            },
          ],
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    await vi.waitFor(() => {
      return expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['foo bar baz'])
    })

    editorRef.current?.send({
      type: 'select',
      at: getSelectionAfterText(
        editorRef.current.getSnapshot().context.value,
        'foo',
      ),
    })

    editorRef.current?.send({
      type: 'split.block',
    })

    expect(editorRef.current?.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
        _foo: 'bar',
        baz: 42,
      },
      {
        _key: 'k4',
        _type: 'block',
        children: [{_key: 'k5', _type: 'span', text: ' bar baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})
