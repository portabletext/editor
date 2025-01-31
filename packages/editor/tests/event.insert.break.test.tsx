import * as React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {getSelectionAfterText} from '../gherkin-tests/gherkin-step-helpers'
import type {Editor} from '../src/editor/create-editor'
import {defineSchema} from '../src/editor/define-schema'
import {PortableTextEditable} from '../src/editor/Editable'
import {EditorProvider} from '../src/editor/editor-provider'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'

const keyGenerator = createTestKeyGenerator()
const initialValue = [
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
]

describe('event.insert.break', () => {
  test('Scenario: Breaking mid-block before inline object', async () => {
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({
            inlineObjects: [{name: 'stock-ticker'}],
          }),
          initialValue,
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    await vi.waitFor(() => {
      return expect(editorRef.current?.getSnapshot().context.value).toEqual(
        initialValue,
      )
    })

    editorRef.current?.send({
      type: 'select',
      selection: getSelectionAfterText(
        editorRef.current.getSnapshot().context.value,
        'foo',
      ),
    })

    editorRef.current?.send({
      type: 'insert.break',
    })

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
      {
        _key: 'k6',
        _type: 'block',
        children: [
          {
            _key: 'k7',
            _type: 'span',
            text: '',
            marks: [],
          },
          {
            _key: 'k2',
            _type: 'stock-ticker',
            value: 'AAPL',
          },
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
