import {defineSchema, type SchemaDefinition} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import type {PortableTextBlock} from '@sanity/types'
import React from 'react'
import {expect, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {page} from 'vitest/browser'
import type {Editor} from '../../editor'
import {
  PortableTextEditable,
  type PortableTextEditableProps,
} from '../../editor/Editable'
import {EditorProvider} from '../../editor/editor-provider'
import type {EditorEmittedEvent} from '../../editor/relay-machine'
import {EventListenerPlugin} from '../../plugins'
import {EditorRefPlugin} from '../../plugins/plugin.editor-ref'
import type {Context} from './step-context'

type CreateTestEditorOptions = {
  initialValue?: Array<PortableTextBlock>
  keyGenerator?: () => string
  schemaDefinition?: SchemaDefinition
  children?: React.ReactNode
  editableProps?: PortableTextEditableProps
}

/**
 * @internal
 */
export async function createTestEditor(
  options: CreateTestEditorOptions = {},
): Promise<
  Pick<Context, 'editor' | 'locator'> & {
    rerender: (options?: CreateTestEditorOptions) => Promise<void>
  }
> {
  const editorRef = React.createRef<Editor>()
  const keyGenerator = options.keyGenerator ?? createTestKeyGenerator()
  const renderResult = await render(
    <EditorProvider
      initialConfig={{
        keyGenerator: keyGenerator,
        schemaDefinition: options.schemaDefinition ?? defineSchema({}),
        initialValue: options.initialValue,
      }}
    >
      <EditorRefPlugin ref={editorRef} />
      <PortableTextEditable {...options.editableProps} />
      {options.children}
    </EditorProvider>,
  )

  async function rerender(newOptions?: CreateTestEditorOptions) {
    await (newOptions
      ? renderResult.rerender(
          <EditorProvider
            initialConfig={{
              keyGenerator: keyGenerator,
              schemaDefinition: newOptions.schemaDefinition ?? defineSchema({}),
              initialValue: newOptions.initialValue,
            }}
          >
            <EditorRefPlugin ref={editorRef} />
            <PortableTextEditable {...newOptions.editableProps} />
            {newOptions.children}
          </EditorProvider>,
        )
      : renderResult.rerender(
          <EditorProvider
            initialConfig={{
              keyGenerator: keyGenerator,
              schemaDefinition: options.schemaDefinition ?? defineSchema({}),
              initialValue: options.initialValue,
            }}
          >
            <EditorRefPlugin ref={editorRef} />
            <PortableTextEditable {...options.editableProps} />
            {options.children}
          </EditorProvider>,
        ))
  }

  const locator = page.getByRole('textbox')

  await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

  return {
    editor: editorRef.current!,
    locator,
    rerender,
  }
}

/**
 * @internal
 */
export async function createTestEditors(
  options: CreateTestEditorOptions = {},
): Promise<
  Pick<Context, 'editor' | 'locator' | 'editorB' | 'locatorB'> & {
    onEditorEvent: (event: EditorEmittedEvent) => void
    onEditorBEvent: (event: EditorEmittedEvent) => void
  }
> {
  const editorRef = React.createRef<Editor>()
  const editorBRef = React.createRef<Editor>()

  const keyGenerator = options.keyGenerator ?? createTestKeyGenerator('ea-')
  const keyGeneratorB = options.keyGenerator ?? createTestKeyGenerator('eb-')
  const onEditorEvent = vi.fn<(event: EditorEmittedEvent) => void>()
  const onEditorBEvent = vi.fn<(event: EditorEmittedEvent) => void>()

  render(
    <>
      <EditorProvider
        initialConfig={{
          keyGenerator: keyGenerator,
          schemaDefinition: options.schemaDefinition ?? defineSchema({}),
          initialValue: options.initialValue,
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable
          {...options.editableProps}
          data-testid="editor-a"
        />
        <EventListenerPlugin
          on={(event) => {
            onEditorEvent(event)
            if (event.type === 'mutation') {
              editorBRef.current?.send({
                type: 'patches',
                patches: event.patches.map((patch) => ({
                  ...patch,
                  origin: 'remote',
                })),
                snapshot: event.snapshot,
              })
              editorBRef.current?.send({
                type: 'update value',
                value: event.value,
              })
            }
          }}
        />
        {options.children}
      </EditorProvider>
      <EditorProvider
        initialConfig={{
          keyGenerator: keyGeneratorB,
          schemaDefinition: options.schemaDefinition ?? defineSchema({}),
          initialValue: options.initialValue,
        }}
      >
        <EditorRefPlugin ref={editorBRef} />
        <PortableTextEditable
          {...options.editableProps}
          data-testid="editor-b"
        />
        <EventListenerPlugin
          on={(event) => {
            onEditorBEvent(event)
            if (event.type === 'mutation') {
              editorRef.current?.send({
                type: 'patches',
                patches: event.patches.map((patch) => ({
                  ...patch,
                  origin: 'remote',
                })),
                snapshot: event.value,
              })
              editorRef.current?.send({
                type: 'update value',
                value: event.value,
              })
            }
          }}
        />
        {options.children}
      </EditorProvider>
    </>,
  )

  const locator = page.getByTestId('editor-a')
  const locatorB = page.getByTestId('editor-b')

  await vi.waitFor(() => expect.element(locator).toBeInTheDocument())
  await vi.waitFor(() => expect.element(locatorB).toBeInTheDocument())

  return {
    editor: editorRef.current!,
    locator,
    onEditorEvent,
    editorB: editorBRef.current!,
    locatorB,
    onEditorBEvent,
  }
}
