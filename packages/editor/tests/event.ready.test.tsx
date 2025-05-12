import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import type {EditorEmittedEvent} from '../src'
import type {Editor} from '../src/editor'
import {PortableTextEditable} from '../src/editor/Editable'
import {EditorProvider} from '../src/editor/editor-provider'
import {defineSchema} from '../src/editor/editor-schema'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {EditorRefPlugin, EventListenerPlugin} from '../src/plugins'

describe('event.ready', () => {
  test('emits for "undefined" initial value', () => {
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

    expect(onEvent).toHaveBeenCalledWith({type: 'ready'})
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

    expect(onEvent).toHaveBeenCalledWith({type: 'ready'})
  })
})
