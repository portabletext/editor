import type {PortableTextBlock} from '@sanity/types'
import {page} from '@vitest/browser/context'
import React from 'react'
import {expect, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import type {Editor} from '../editor'
import {PortableTextEditable} from '../editor/Editable'
import type {EditorActor} from '../editor/editor-machine'
import {EditorProvider} from '../editor/editor-provider'
import {
  defineSchema,
  type SchemaDefinition,
} from '../editor/editor-schema-definition'
import type {EditorEmittedEvent} from '../editor/relay-machine'
import {EditorRefPlugin} from '../plugins/plugin.editor-ref'
import {EventListenerPlugin} from '../plugins/plugin.event-listener'
import {InternalEditorAfterRefPlugin} from '../plugins/plugin.internal.editor-actor-ref'
import {InternalSlateEditorRefPlugin} from '../plugins/plugin.internal.slate-editor-ref'
import type {PortableTextSlateEditor} from '../types/editor'
import {createTestKeyGenerator} from './test-key-generator'

export async function createTestEditor(
  options: {
    initialValue?: Array<PortableTextBlock>
    keyGenerator?: () => string
    schemaDefinition?: SchemaDefinition
  } = {},
) {
  const editorRef = React.createRef<Editor>()
  const editorActorRef = React.createRef<EditorActor>()
  const slateRef = React.createRef<PortableTextSlateEditor>()
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
      <InternalEditorAfterRefPlugin ref={editorActorRef} />
      <InternalSlateEditorRefPlugin ref={slateRef} />
      <EventListenerPlugin on={onEvent} />
      <PortableTextEditable />
    </EditorProvider>,
  )

  const locator = page.getByRole('textbox')

  await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

  return {
    editorActorRef,
    editorRef,
    keyGenerator,
    locator,
    onEvent,
    slateRef,
  }
}
