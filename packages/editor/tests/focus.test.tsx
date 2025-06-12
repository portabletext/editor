import {page, userEvent} from '@vitest/browser/context'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {
  defineSchema,
  EditorProvider,
  type Editor,
  type EditorEmittedEvent,
} from '../src'
import {PortableTextEditable} from '../src/editor/Editable'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'

describe('focus', () => {
  test('Scenario: Focusing on an empty editor', async () => {
    const keyGenerator = createTestKeyGenerator()
    const editorRef = React.createRef<Editor>()
    const events: Array<EditorEmittedEvent> = []

    render(
      <>
        <EditorProvider
          initialConfig={{
            keyGenerator,
            schemaDefinition: defineSchema({}),
          }}
        >
          <div data-testid="toolbar">Toolbar</div>
          <EditorRefPlugin ref={editorRef} />
          <PortableTextEditable />
          <EventListenerPlugin
            on={(event) => {
              events.push(event)
            }}
          />
        </EditorProvider>
      </>,
    )

    const editorLocator = page.getByRole('textbox')
    const toolbarLocator = page.getByTestId('toolbar')
    await vi.waitFor(() => expect.element(editorLocator).toBeInTheDocument())
    await vi.waitFor(() => expect.element(toolbarLocator).toBeInTheDocument())

    await userEvent.click(editorLocator)

    const initialEvents = [
      {
        type: 'ready',
      },
      expect.objectContaining({
        type: 'focused',
      }),
      {
        type: 'selection',
        selection: {
          anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
          focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
          backward: false,
        },
      },
    ]

    await vi.waitFor(() => {
      expect(events).toEqual(initialEvents)
    })

    await userEvent.click(toolbarLocator)

    expect(events.slice(3)).toEqual([
      expect.objectContaining({
        type: 'blurred',
      }),
    ])

    await userEvent.click(editorLocator)

    await vi.waitFor(() => {
      expect(events.slice(4)).toEqual([
        expect.objectContaining({type: 'focused'}),
        {
          type: 'selection',
          selection: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
            backward: false,
          },
        },
      ])
    })
  })

  test('Scenario: Focusing on a non-empty editor', async () => {
    const keyGenerator = createTestKeyGenerator()
    const editorRef = React.createRef<Editor>()
    const events: Array<EditorEmittedEvent> = []
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: fooBlockKey,
        children: [
          {
            _type: 'span',
            _key: fooSpanKey,
            text: 'foo',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: barBlockKey,
        children: [
          {
            _type: 'span',
            _key: barSpanKey,
            text: 'b',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ]

    render(
      <>
        <EditorProvider
          initialConfig={{
            keyGenerator,
            schemaDefinition: defineSchema({}),
            initialValue,
          }}
        >
          <div data-testid="toolbar">Toolbar</div>
          <EditorRefPlugin ref={editorRef} />
          <PortableTextEditable />
          <EventListenerPlugin
            on={(event) => {
              events.push(event)
            }}
          />
        </EditorProvider>
      </>,
    )

    const editorLocator = page.getByRole('textbox')
    const barSpanLocator = editorLocator.getByText('b')
    const toolbarLocator = page.getByTestId('toolbar')
    await vi.waitFor(() => expect.element(barSpanLocator).toBeInTheDocument())
    await vi.waitFor(() => expect.element(toolbarLocator).toBeInTheDocument())

    await userEvent.click(barSpanLocator)

    const initialEvents = [
      {
        type: 'value changed',
        value: initialValue,
      },
      {
        type: 'ready',
      },
      expect.objectContaining({
        type: 'focused',
      }),
      {
        type: 'selection',
        selection: {
          anchor: {
            path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
            offset: 0,
          },
          backward: false,
        },
      },
    ]

    await vi.waitFor(() => {
      expect(events).toEqual(initialEvents)
    })

    await userEvent.click(toolbarLocator)

    await vi.waitFor(() => {
      expect(events.slice(4)).toEqual([
        expect.objectContaining({
          type: 'blurred',
        }),
      ])
    })

    await userEvent.click(barSpanLocator)

    await vi.waitFor(() => {
      expect(events.slice(5)).toEqual([
        expect.objectContaining({type: 'focused'}),
        {
          type: 'selection',
          selection: {
            anchor: {
              path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
              offset: 0,
            },
            focus: {
              path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
              offset: 0,
            },
            backward: false,
          },
        },
      ])
    })
  })
})
