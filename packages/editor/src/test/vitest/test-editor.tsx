import {applyAll} from '@portabletext/patches'
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
import {EventListenerPlugin} from '../../plugins'
import {EditorRefPlugin} from '../../plugins/plugin.editor-ref'
import type {Context} from './step-context'

// The editable gets the `textbox` role only after the initial value has
// synced in batches of 10 blocks per task, so a large value on a loaded
// runner can take over a second.
const editableTimeout = 5_000

type CreateTestEditorOptions = {
  initialValue?: Array<PortableTextBlock>
  keyGenerator?: () => string
  readOnly?: boolean
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
        readOnly: options.readOnly,
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
              keyGenerator,
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
              keyGenerator,
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

  // A read-only editable carries no ARIA `textbox` role (see
  // `editable.tsx`), so `getByRole` never resolves; the always-present
  // `data-pt-editor` marker locates it instead.
  const locator = options.readOnly
    ? await vi.waitFor(() => {
        const element = renderResult.container.querySelector('[data-pt-editor]')
        if (element === null) {
          throw new Error('Expected to find an element with `data-pt-editor`')
        }
        return page.elementLocator(element)
      })
    : renderResult.locator.getByRole('textbox')

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

  // Like a Studio form, both editors are fed from one shared document: the
  // peer gets each mutation's patches and both editors get the document as
  // `update value`. An editor's own snapshot can lag behind patches still in
  // flight to it, and the sync machine applies a parked value a second later
  // without revalidating it, so a peer snapshot would roll back newer edits.
  let sharedDocument = options.initialValue
  let isValueUpdateQueued = false

  function relayMutation(event: EditorEmittedEvent, peer: Editor | null) {
    if (event.type !== 'mutation') {
      return
    }

    sharedDocument = applyAll(sharedDocument, event.patches)

    peer?.send({
      type: 'patches',
      patches: event.patches.map((patch) => ({
        ...patch,
        origin: 'remote',
      })),
      snapshot: sharedDocument,
    })

    // A flush emits all its mutations synchronously and the sender is no
    // longer busy during them, so a value sent after the first would roll
    // back the rest. Studio's form value reaches the editors after React
    // renders, once the whole flush has landed.
    if (!isValueUpdateQueued) {
      isValueUpdateQueued = true
      queueMicrotask(() => {
        isValueUpdateQueued = false
        editorRef.current?.send({type: 'update value', value: sharedDocument})
        editorBRef.current?.send({type: 'update value', value: sharedDocument})
      })
    }
  }

  render(
    <>
      <EditorProvider
        initialConfig={{
          keyGenerator,
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
            relayMutation(event, editorBRef.current)
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
            relayMutation(event, editorRef.current)
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
