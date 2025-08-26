import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import type {EditorEmittedEvent} from '../src'
import type {Editor} from '../src/editor'
import {PortableTextEditable} from '../src/editor/Editable'
import {EditorProvider} from '../src/editor/editor-provider'
import {EditorRefPlugin} from '../src/plugins'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'

describe('event.value changed', () => {
  test('does not emit for "undefined" initial value', () => {
    const editorRef = React.createRef<Editor>()
    const onEvent = vi.fn<(event: EditorEmittedEvent) => void>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({}),
          initialValue: undefined,
        }}
      >
        <EventListenerPlugin on={onEvent} />
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    expect(onEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({type: 'value changed'}),
    )
  })

  test('emits for "[]" initial value', () => {
    const editorRef = React.createRef<Editor>()
    const onEvent = vi.fn<(event: EditorEmittedEvent) => void>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({}),
          initialValue: [],
        }}
      >
        <EventListenerPlugin on={onEvent} />
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    expect(onEvent).toHaveBeenCalledWith({type: 'value changed', value: []})
  })
})
