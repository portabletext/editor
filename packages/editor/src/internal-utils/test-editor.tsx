import {defineSchema, type SchemaDefinition} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import type {PortableTextBlock} from '@sanity/types'
import {page} from '@vitest/browser/context'
import React from 'react'
import {expect, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import type {Editor} from '../editor'
import {PortableTextEditable} from '../editor/Editable'
import type {EditorActor} from '../editor/editor-machine'
import {EditorProvider} from '../editor/editor-provider'
import type {EditorEmittedEvent} from '../editor/relay-machine'
import {EditorRefPlugin} from '../plugins/plugin.editor-ref'
import {EventListenerPlugin} from '../plugins/plugin.event-listener'
import {InternalEditorAfterRefPlugin} from '../plugins/plugin.internal.editor-actor-ref'
import {InternalSlateEditorRefPlugin} from '../plugins/plugin.internal.slate-editor-ref'
import type {PortableTextSlateEditor} from '../types/editor'

export async function createTestEditor(
  options: {
    initialValue?: Array<PortableTextBlock>
    keyGenerator?: () => string
    schemaDefinition?: SchemaDefinition
    children?: React.ReactNode
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
      {options.children}
    </EditorProvider>,
  )

  const locator = page.getByRole('textbox')

  await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

  function paste(dataTransfer: DataTransfer) {
    editorActorRef.current?.send({
      type: 'behavior event',
      behaviorEvent: {
        type: 'clipboard.paste',
        originEvent: {dataTransfer},
        position: {
          selection: editorRef.current?.getSnapshot().context.selection!,
        },
      },
      editor: slateRef.current!,
    })
  }

  return {
    editorActorRef,
    editorRef,
    keyGenerator,
    locator,
    onEvent,
    slateRef,
    paste,
  }
}
