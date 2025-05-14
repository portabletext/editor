import {page, userEvent} from '@vitest/browser/context'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  type Editor,
  type EditorEmittedEvent,
} from '../src'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {EditorRefPlugin, EventListenerPlugin} from '../src/plugins'

describe('event.mutation', () => {
  test('Scenario: Deferring mutation events when read-only', async () => {
    const editorRef = React.createRef<Editor>()
    const onEvent = vi.fn<(event: EditorEmittedEvent) => void>()
    const keyGenerator = createTestKeyGenerator()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({}),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <EventListenerPlugin on={onEvent} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    const locator = page.getByRole('textbox')
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    await userEvent.type(locator, 'foo')

    await new Promise((resolve) => setTimeout(resolve, 250))

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'mutation',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      }),
    )

    await userEvent.type(locator, 'bar')

    editorRef.current?.send({type: 'update readOnly', readOnly: true})

    await new Promise((resolve) => setTimeout(resolve, 250))

    expect(onEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'mutation',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'foobar', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      }),
    )

    editorRef.current?.send({type: 'update readOnly', readOnly: false})

    await new Promise((resolve) => setTimeout(resolve, 250))

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'mutation',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'foobar', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      }),
    )
  })
})
