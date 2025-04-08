import type {PortableTextTextBlock} from '@sanity/types'
import {page, userEvent} from '@vitest/browser/context'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import type {Editor} from '../src/editor/create-editor'
import {defineSchema} from '../src/editor/define-schema'
import {PortableTextEditable} from '../src/editor/Editable'
import {EditorProvider} from '../src/editor/editor-provider'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'

describe('event.insert.inline object', () => {
  test('Scenario: Inserting inline object without any initial fields', async () => {
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({
            inlineObjects: [
              {
                name: 'stock ticker',
                fields: [{type: 'string', name: 'symbol'}],
              },
            ],
          }),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    const locator = page.getByRole('textbox')
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())
    await userEvent.click(locator)

    editorRef.current?.send({
      type: 'insert.inline object',
      inlineObject: {name: 'stock ticker', value: {}},
    })

    expect(editorRef.current?.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [
          {_key: 'k1', _type: 'span', text: '', marks: []},
          {_key: 'k2', _type: 'stock ticker'},
          {_key: 'k4', _type: 'span', text: '', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])

    expect(
      Object.keys(
        (
          editorRef.current?.getSnapshot().context
            .value?.[0] as PortableTextTextBlock
        ).children?.[1],
      ),
    ).toEqual(['_key', '_type'])
  })
})
