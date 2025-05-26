import type {PortableTextBlock} from '@sanity/types'
import {page} from '@vitest/browser/context'
import React from 'react'
import {expect, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import type {Editor} from '../editor'
import {PortableTextEditable} from '../editor/Editable'
import {EditorProvider} from '../editor/editor-provider'
import {defineSchema, type SchemaDefinition} from '../editor/editor-schema'
import type {EditorEmittedEvent} from '../editor/relay-machine'
import {EditorRefPlugin} from '../plugins/plugin.editor-ref'
import {EventListenerPlugin} from '../plugins/plugin.event-listener'
import {createTestKeyGenerator} from './test-key-generator'

export async function createTestEditor(
  options: {
    initialValue?: Array<PortableTextBlock>
    keyGenerator?: () => string
    schemaDefinition?: SchemaDefinition
  } = {},
) {
  const editorRef = React.createRef<Editor>()
  const onEvent = vi.fn<() => EditorEmittedEvent>()
  const keyGenerator = options.keyGenerator ?? createTestKeyGenerator()

  render(
    <EditorProvider
      initialConfig={{
        keyGenerator,
        schemaDefinition: options.schemaDefinition ?? defineSchema({}),
        initialValue: options.initialValue,
      }}
    >
      <EditorRefPlugin ref={editorRef} />
      <EventListenerPlugin on={onEvent} />
      <PortableTextEditable />
    </EditorProvider>,
  )

  const locator = page.getByRole('textbox')

  await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

  return {editorRef, keyGenerator, locator, onEvent}
}
