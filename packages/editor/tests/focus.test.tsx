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
    const onEvent = vi.fn<() => EditorEmittedEvent>()

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
          <EventListenerPlugin on={onEvent} />
        </EditorProvider>
      </>,
    )

    const editorLocator = page.getByRole('textbox')
    const toolbarLocator = page.getByTestId('toolbar')
    await vi.waitFor(() => expect.element(editorLocator).toBeInTheDocument())
    await vi.waitFor(() => expect.element(toolbarLocator).toBeInTheDocument())
    await userEvent.click(editorLocator)

    expect(onEvent).toHaveBeenNthCalledWith(1, {
      type: 'ready',
    })
    expect(onEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: 'focused',
      }),
    )
    expect(onEvent).toHaveBeenNthCalledWith(3, {
      type: 'selection',
      selection: {
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 0,
        },
        backward: false,
      },
    })

    await userEvent.click(toolbarLocator)

    expect(onEvent).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        type: 'blurred',
      }),
    )

    await userEvent.click(editorLocator)

    expect(onEvent).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({type: 'focused'}),
    )
    expect(onEvent).toHaveBeenNthCalledWith(
      6,
      expect.objectContaining({
        type: 'selection',
        selection: {
          anchor: {
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
            offset: 0,
          },
          backward: false,
        },
      }),
    )
  })
})
