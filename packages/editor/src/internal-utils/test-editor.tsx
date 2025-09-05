import {defineSchema, type SchemaDefinition} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import type {PortableTextBlock} from '@sanity/types'
import {page} from '@vitest/browser/context'
import React from 'react'
import {expect, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import type {Context} from '../../gherkin-tests-v2/step-context'
import type {NativeBehaviorEvent} from '../behaviors'
import type {Editor} from '../editor'
import {
  PortableTextEditable,
  type PortableTextEditableProps,
} from '../editor/Editable'
import type {EditorActor} from '../editor/editor-machine'
import {EditorProvider} from '../editor/editor-provider'
import {EditorRefPlugin} from '../plugins/plugin.editor-ref'
import {InternalEditorAfterRefPlugin} from '../plugins/plugin.internal.editor-actor-ref'
import {InternalSlateEditorRefPlugin} from '../plugins/plugin.internal.slate-editor-ref'
import type {PortableTextSlateEditor} from '../types/editor'

export async function createTestEditor(
  options: {
    initialValue?: Array<PortableTextBlock>
    keyGenerator?: () => string
    schemaDefinition?: SchemaDefinition
    children?: React.ReactNode
    editableProps?: PortableTextEditableProps
  } = {},
): Promise<Pick<Context, 'editor' | 'locator'>> {
  const editorRef = React.createRef<Editor>()
  const editorActorRef = React.createRef<EditorActor>()
  const slateRef = React.createRef<PortableTextSlateEditor>()
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
      <PortableTextEditable {...options.editableProps} />
      {options.children}
    </EditorProvider>,
  )

  const locator = page.getByRole('textbox')

  await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

  function sendNativeEvent(event: NativeBehaviorEvent) {
    editorActorRef.current?.send({
      type: 'behavior event',
      behaviorEvent: event,
      editor: slateRef.current!,
    })
  }

  return {
    editor: {
      ...editorRef.current!,
      sendNativeEvent,
    },
    locator,
  }
}
