import {
  defineSchema,
  type PortableTextBlock,
  type SchemaDefinition,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
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
import type {EditorEmittedEvent} from '../../editor/relay'
import {useEditor} from '../../editor/use-editor'
import {EventListenerPlugin} from '../../plugins'
import {EditorRefPlugin} from '../../plugins/plugin.editor-ref'
import type {Context} from './step-context'

// The editable gets the `textbox` role only after the initial value has
// synced in batches of 10 blocks per task, so a large value on a loaded
// runner can take over a second.
const editableTimeout = 5_000

/**
 * @internal
 */
export type TestEditorCreatedListener = (created: {
  name: 'A' | 'B'
  editor: Editor
}) => void

const testEditorCreatedListeners = new Set<TestEditorCreatedListener>()

/**
 * @internal
 * Calls `listener` with every editor that `createTestEditor` and
 * `createTestEditors` create, before the editor starts, so an `editor.on`
 * subscription made inside `listener` receives the startup events. `name` is
 * `B` for the second editor of `createTestEditors` and `A` otherwise.
 * Returns a function that removes the listener.
 */
export function onTestEditorCreated(
  listener: TestEditorCreatedListener,
): () => void {
  testEditorCreatedListeners.add(listener)

  return () => {
    testEditorCreatedListeners.delete(listener)
  }
}

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
        keyGenerator,
        schemaDefinition: options.schemaDefinition ?? defineSchema({}),
        initialValue: options.initialValue,
      }}
    >
      <TestEditorCreatedPlugin name="A" />
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
              keyGenerator,
              schemaDefinition: newOptions.schemaDefinition ?? defineSchema({}),
              initialValue: newOptions.initialValue,
            }}
          >
            <TestEditorCreatedPlugin name="A" />
            <EditorRefPlugin ref={editorRef} />
            <PortableTextEditable {...newOptions.editableProps} />
            {newOptions.children}
          </EditorProvider>,
        )
      : renderResult.rerender(
          <EditorProvider
            initialConfig={{
              keyGenerator,
              schemaDefinition: options.schemaDefinition ?? defineSchema({}),
              initialValue: options.initialValue,
            }}
          >
            <TestEditorCreatedPlugin name="A" />
            <EditorRefPlugin ref={editorRef} />
            <PortableTextEditable {...options.editableProps} />
            {options.children}
          </EditorProvider>,
        ))
  }

  const locator = renderResult.locator.getByRole('textbox')

  await expect.element(locator, {timeout: editableTimeout}).toBeInTheDocument()

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
          keyGenerator,
          schemaDefinition: options.schemaDefinition ?? defineSchema({}),
          initialValue: options.initialValue,
        }}
      >
        <TestEditorCreatedPlugin name="A" />
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
                snapshot: event.value,
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
        <TestEditorCreatedPlugin name="B" />
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

  await expect.element(locator, {timeout: editableTimeout}).toBeInTheDocument()
  await expect.element(locatorB, {timeout: editableTimeout}).toBeInTheDocument()

  return {
    editor: editorRef.current!,
    locator,
    onEditorEvent,
    editorB: editorBRef.current!,
    locatorB,
    onEditorBEvent,
  }
}

function TestEditorCreatedPlugin(props: {name: 'A' | 'B'}) {
  const editor = useEditor()

  // `EditorProvider` starts the editor in its own effect, which runs after
  // this child effect.
  React.useEffect(() => {
    for (const listener of testEditorCreatedListeners) {
      listener({name: props.name, editor})
    }
  }, [editor, props.name])

  return null
}
