import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import type {PortableTextTextBlock} from '@sanity/types'
import {page, userEvent} from '@vitest/browser/context'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import type {Editor, EditorEmittedEvent} from '../src'
import {PortableTextEditable} from '../src/editor/Editable'
import {EditorProvider} from '../src/editor/editor-provider'
import {createTestEditor} from '../src/internal-utils/test-editor'
import {EventListenerPlugin} from '../src/plugins'
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
        _key: 'k2',
        _type: 'block',
        children: [
          {_key: 'k4', _type: 'span', text: '', marks: []},
          {_key: 'k3', _type: 'stock ticker'},
          {_key: 'k5', _type: 'span', text: '', marks: []},
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

  test('Scenario: Inserting and focusing inline object', async () => {
    const editorRef = React.createRef<Editor>()
    const focusEvents: Array<EditorEmittedEvent> = []

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
        <button
          data-testid="insert-stock-ticker"
          type="button"
          onClick={() => {
            editorRef.current?.send({
              type: 'insert.inline object',
              inlineObject: {
                name: 'stock ticker',
                value: {
                  symbol: 'AAPL',
                },
              },
            })
            editorRef.current?.send({
              type: 'focus',
            })
          }}
        >
          Insert stock ticker
        </button>
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'focused') {
              focusEvents.push(event)
            }
          }}
        />
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    const locator = page.getByRole('textbox')
    const insertStockTickerButton = page.getByTestId('insert-stock-ticker')
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())
    await vi.waitFor(() =>
      expect.element(insertStockTickerButton).toBeInTheDocument(),
    )

    await userEvent.click(locator)

    // Focusing in Slate is async, so we need to make sure it has settled
    await vi.waitFor(() => {
      expect(focusEvents).toHaveLength(1)
    })

    await userEvent.click(insertStockTickerButton)

    // Focusing in Slate is async, so we need to make sure it has settled
    await vi.waitFor(() => {
      expect(focusEvents).toHaveLength(2)
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: 'k2',
          _type: 'block',
          children: [
            {_key: 'k4', _type: 'span', text: '', marks: []},
            {_key: 'k3', _type: 'stock ticker', symbol: 'AAPL'},
            {_key: 'k5', _type: 'span', text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: 'k2'}, 'children', {_key: 'k3'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k2'}, 'children', {_key: 'k3'}],
          offset: 0,
        },
        backward: false,
      })
    })

    await userEvent.keyboard('{ArrowRight}')
    await userEvent.type(locator, 'foo')

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: 'k2',
          _type: 'block',
          children: [
            {_key: 'k4', _type: 'span', text: '', marks: []},
            {_key: 'k3', _type: 'stock ticker', symbol: 'AAPL'},
            {_key: 'k5', _type: 'span', text: 'foo', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: 'k2'}, 'children', {_key: 'k5'}],
          offset: 3,
        },
        focus: {
          path: [{_key: 'k2'}, 'children', {_key: 'k5'}],
          offset: 3,
        },
        backward: false,
      })
    })
  })

  test('Scenario: Inserting inline object on block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()

    const {editorRef} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
        inlineObjects: [
          {name: 'stock ticker', fields: [{name: 'symbol', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _type: 'image',
          _key: imageKey,
        },
      ],
    })

    editorRef.current?.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: imageKey}], offset: 0},
        focus: {path: [{_key: imageKey}], offset: 0},
      },
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: imageKey}], offset: 0},
        focus: {path: [{_key: imageKey}], offset: 0},
        backward: false,
      })
    })

    editorRef.current?.send({
      type: 'insert.inline object',
      inlineObject: {
        name: 'stock ticker',
        value: {
          symbol: 'AAPL',
        },
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editorRef.current!.getSnapshot().context)).toEqual([
        '{image}',
        ',{stock ticker},',
      ])
    })
  })
})
