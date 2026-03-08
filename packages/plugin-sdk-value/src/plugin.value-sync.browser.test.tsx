import type {Editor} from '@portabletext/editor'
import {EditorProvider, PortableTextEditable} from '@portabletext/editor'
import {EditorRefPlugin} from '@portabletext/editor/plugins'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {toTextspec} from '@portabletext/textspec'
import {createRef} from 'react'
import {afterEach, describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {page} from 'vitest/browser'
import {ValueSyncPlugin} from './plugin.sdk-value'

// ---- Mock value store ----

function createMockValueStore(initialValue: PortableTextBlock[] = []) {
  let value = initialValue
  let subscriber: (() => void) | null = null

  const pushValue = vi.fn((newValue: PortableTextBlock[]) => {
    value = newValue
    // Fire subscriber synchronously, like the real SDK (Zustand + RxJS)
    subscriber?.()
  })

  return {
    getRemoteValue: () => value,
    pushValue,
    onRemoteValueChange: (callback: () => void) => {
      subscriber = callback
      return () => {
        subscriber = null
      }
    },
    getValue: () => value,
    // Simulate a remote change (updates value and notifies subscriber)
    setRemoteValue: (newValue: PortableTextBlock[]) => {
      value = newValue
      subscriber?.()
    },
  }
}

type MockStore = ReturnType<typeof createMockValueStore>

// ---- Test editor helper ----

async function createSyncedEditor(options: {
  initialValue?: PortableTextBlock[]
  store: MockStore
}) {
  const editorRef = createRef<Editor>()
  const keyGenerator = createTestKeyGenerator()

  const result = await render(
    <EditorProvider
      initialConfig={{
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'em'}],
          styles: [{name: 'normal'}, {name: 'h1'}],
          lists: [{name: 'bullet'}, {name: 'number'}],
          blockObjects: [],
          inlineObjects: [],
          annotations: [],
        }),
        keyGenerator,
      }}
    >
      <EditorRefPlugin ref={editorRef} />
      <ValueSyncPlugin
        getRemoteValue={options.store.getRemoteValue}
        pushValue={options.store.pushValue}
        onRemoteValueChange={options.store.onRemoteValueChange}
      />
      <PortableTextEditable />
    </EditorProvider>,
  )

  const locator = page.getByRole('textbox')
  await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

  return {
    editor: editorRef.current!,
    locator,
    unmount: result.unmount,
  }
}

// ---- Helpers ----

function makeBlock(key: string, text: string): PortableTextBlock {
  return {
    _type: 'block',
    _key: key,
    children: [{_type: 'span', _key: `${key}-span`, text, marks: []}],
    markDefs: [],
    style: 'normal',
  }
}

function getEditorText(editor: Editor): string {
  const ctx = editor.getSnapshot().context
  return toTextspec({schema: ctx.schema, value: ctx.value})
}

// ---- Tests ----

describe('ValueSyncPlugin', () => {
  let cleanup: (() => void) | undefined

  afterEach(() => {
    cleanup?.()
    cleanup = undefined
  })

  describe('initial value', () => {
    test('sends initial value from store to editor', async () => {
      const store = createMockValueStore([makeBlock('b1', 'Hello')])
      const {editor, unmount} = await createSyncedEditor({store})
      cleanup = unmount

      await vi.waitFor(() => {
        expect(getEditorText(editor)).toBe('P: Hello')
      })
    })

    test('starts with empty editor when store is empty', async () => {
      const store = createMockValueStore([])
      const {editor, unmount} = await createSyncedEditor({store})
      cleanup = unmount

      await vi.waitFor(() => {
        expect(getEditorText(editor)).toBe('P: ')
      })
    })
  })

  describe('local edits push to store', () => {
    test('typing pushes value to store after mutation flush', async () => {
      const store = createMockValueStore()
      const {editor, locator, unmount} = await createSyncedEditor({store})
      cleanup = unmount

      await locator.click()
      editor.send({type: 'insert.text', text: 'Hello'})

      await vi.waitFor(() => {
        expect(store.pushValue).toHaveBeenCalled()
      })

      const pushedValue = store.pushValue.mock.lastCall?.[0] ?? []
      expect(
        toTextspec({
          value: pushedValue,
          schema: editor.getSnapshot().context.schema,
        }),
      ).toBe('P: Hello')
    })
  })

  describe('remote changes apply to editor', () => {
    test('remote change updates editor when idle', async () => {
      const store = createMockValueStore()
      const {editor, unmount} = await createSyncedEditor({store})
      cleanup = unmount

      store.setRemoteValue([makeBlock('b1', 'Hello from remote')])

      await vi.waitFor(() => {
        expect(getEditorText(editor)).toBe('P: Hello from remote')
      })
    })
  })

  describe('echo suppression', () => {
    test('echo after local edit does not revert editor', async () => {
      const store = createMockValueStore()
      const {editor, locator, unmount} = await createSyncedEditor({store})
      cleanup = unmount

      await locator.click()
      editor.send({type: 'insert.text', text: 'Hello'})

      // Wait for the value to push to the store
      await vi.waitFor(() => {
        expect(store.pushValue).toHaveBeenCalled()
      })

      // The synchronous echo from pushValue should have been absorbed
      // by the "pushing to remote" state. The editor should still
      // have the correct value.
      await vi.waitFor(() => {
        expect(getEditorText(editor)).toBe('P: Hello')
      })
    })

    test('echo with normalization divergence does not revert editor', async () => {
      const store = createMockValueStore()
      const {editor, locator, unmount} = await createSyncedEditor({store})
      cleanup = unmount

      await locator.click()
      editor.send({type: 'insert.text', text: 'Hello'})

      // Make pushValue store a slightly different value (normalization divergence)
      store.pushValue.mockImplementationOnce((value: PortableTextBlock[]) => {
        const divergent = value.map((block) => {
          const {markDefs: _markDefs, ...rest} = block as PortableTextBlock & {
            markDefs: unknown
          }
          return rest
        })
        store.setRemoteValue(divergent as PortableTextBlock[])
      })

      // Wait for mutation flush
      await vi.waitFor(() => {
        expect(store.pushValue).toHaveBeenCalled()
      })

      // Editor should still have the correct value, not reverted
      await vi.waitFor(() => {
        expect(getEditorText(editor)).toBe('P: Hello')
      })
    })
  })

  describe('stale sync prevention', () => {
    test('stale remote value during typing does not revert editor', async () => {
      const store = createMockValueStore()
      const {editor, locator, unmount} = await createSyncedEditor({store})
      cleanup = unmount

      await locator.click()
      editor.send({type: 'insert.text', text: 'Hello'})

      // Wait for first push
      await vi.waitFor(() => {
        expect(store.pushValue).toHaveBeenCalled()
      })
      store.pushValue.mockClear()

      // Type more text
      editor.send({type: 'insert.text', text: ' world'})

      // Simulate stale remote callback (e.g., Content Lake acknowledged
      // the first mutation, WebSocket reconnect delivers old value)
      store.setRemoteValue([makeBlock('stale', 'Hello')])

      // Editor should NOT revert to "Hello" — it has pending writes.
      // Wait a bit to make sure no revert happens.
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(getEditorText(editor)).toBe('P: Hello world')

      // Wait for the second push
      await vi.waitFor(() => {
        expect(store.pushValue).toHaveBeenCalled()
      })

      // After mutation flush, editor should have the full text
      await vi.waitFor(() => {
        expect(getEditorText(editor)).toBe('P: Hello world')
      })
    })

    test('remote change during local write applies after flush', async () => {
      const store = createMockValueStore()
      const {editor, locator, unmount} = await createSyncedEditor({store})
      cleanup = unmount

      await locator.click()
      editor.send({type: 'insert.text', text: 'Hello'})
      await vi.waitFor(() => {
        expect(store.pushValue).toHaveBeenCalled()
      })
      store.pushValue.mockClear()

      // When the mutation flushes and pushValue is called, simulate the
      // server merging our value with the concurrent remote change
      store.pushValue.mockImplementationOnce(
        (newValue: PortableTextBlock[]) => {
          store.setRemoteValue([
            ...(newValue as PortableTextBlock[]),
            makeBlock('remote-1', 'from remote'),
          ])
        },
      )

      // Insert text — the patch fires synchronously (machine enters
      // `local write`) but the mutation flush is asynchronous
      editor.send({type: 'insert.text', text: ' world'})

      // A remote change arrives while the machine is in `local write`,
      // pushing it into `pending sync`
      store.setRemoteValue([
        ...store.getValue(),
        makeBlock('remote-1', 'from remote'),
      ])

      // Wait for mutation flush
      await vi.waitFor(() => {
        expect(store.pushValue).toHaveBeenCalled()
      })

      // `pending sync` defers the sync until after the push. The deferred
      // sync should detect the remote block and apply it.
      await vi.waitFor(() => {
        expect(getEditorText(editor)).toBe('P: Hello world\nP: from remote')
      })
    })

    test('remote change without pending writes applies immediately', async () => {
      const store = createMockValueStore()
      const {editor, unmount} = await createSyncedEditor({store})
      cleanup = unmount

      store.setRemoteValue([makeBlock('b1', 'Hello from remote')])

      await vi.waitFor(() => {
        expect(getEditorText(editor)).toBe('P: Hello from remote')
      })
    })
  })
})
