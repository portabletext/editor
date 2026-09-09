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

  await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

  return {
    editor: editorRef.current!,
    locator,
    rerender,
  }
}

/**
 * Relays a `mutation` event's patches to `target` immediately, and its
 * `value` once the whole synchronous flush batch that produced the event
 * has finished. A single `flush()` call can emit several `mutation`
 * events back to back (one per pending bulk), all stamped with the same
 * current-at-flush-time `value` (see `MutationEvent.value`); sending that
 * value on the first of them would jump `target` straight past the
 * others' own patches before they get relayed, so those patches would
 * find nothing left to apply against.
 */
function relayMutationsTo(target: React.RefObject<Editor | null>) {
  let pendingValue: Array<PortableTextBlock> | undefined
  let valueSyncScheduled = false

  return (event: EditorEmittedEvent) => {
    if (event.type !== 'mutation') {
      return
    }
    target.current?.send({
      type: 'patches',
      patches: event.patches.map((patch) => ({
        ...patch,
        origin: 'remote',
      })),
      snapshot: event.value,
    })
    pendingValue = event.value
    if (!valueSyncScheduled) {
      valueSyncScheduled = true
      queueMicrotask(() => {
        valueSyncScheduled = false
        target.current?.send({type: 'update value', value: pendingValue})
      })
    }
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
  const relayToB = relayMutationsTo(editorBRef)
  const relayToA = relayMutationsTo(editorRef)

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
            relayToB(event)
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
            relayToA(event)
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
