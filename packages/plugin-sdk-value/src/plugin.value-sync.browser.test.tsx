import type {Editor, Patch as PtePatch} from '@portabletext/editor'
import {EditorProvider, PortableTextEditable} from '@portabletext/editor'
import {EditorRefPlugin} from '@portabletext/editor/plugins'
import {toTextspec} from '@portabletext/editor/test'
import {applyAll, type JSONValue} from '@portabletext/patches'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
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

/**
 * A mock store with a patch channel, mirroring an SDK that emits
 * `remote-patches` document events and accepts preserved patch operations.
 */
function createMockPatchStore(initialValue: PortableTextBlock[] = []) {
  let value = initialValue
  let valueSubscriber: (() => void) | null = null
  let patchSubscriber: ((patches: PtePatch[]) => void) | null = null

  const pushValue = vi.fn((newValue: PortableTextBlock[]) => {
    value = newValue
    valueSubscriber?.()
  })

  const pushPatches = vi.fn((patches: PtePatch[]) => {
    value = applyAll(value, patches)
    valueSubscriber?.()
  })

  return {
    getRemoteValue: () => value,
    pushValue,
    pushPatches,
    onRemoteValueChange: (callback: () => void) => {
      valueSubscriber = callback
      return () => {
        valueSubscriber = null
      }
    },
    onRemotePatches: (callback: (patches: PtePatch[]) => void) => {
      patchSubscriber = callback
      return () => {
        patchSubscriber = null
      }
    },
    getValue: () => value,
    // Simulate patches arriving from another client: apply them to the store
    // value and emit through both channels, patches first, like the real SDK
    receiveRemotePatches: (patches: PtePatch[]) => {
      value = applyAll(value, patches)
      patchSubscriber?.(patches)
      valueSubscriber?.()
    },
  }
}

type MockPatchStore = ReturnType<typeof createMockPatchStore>

// ---- Test editor helper ----

async function createSyncedEditor(options: {
  initialValue?: PortableTextBlock[]
  store: MockStore | MockPatchStore
}) {
  const editorRef = createRef<Editor>()
  const keyGenerator = createTestKeyGenerator()
  const {store} = options

  const result = await render(
    <EditorProvider
      initialConfig={{
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: options.initialValue,
      }}
    >
      <EditorRefPlugin ref={editorRef} />
      <PortableTextEditable />
      <ValueSyncPlugin
        getRemoteValue={store.getRemoteValue}
        pushValue={store.pushValue}
        onRemoteValueChange={store.onRemoteValueChange}
        onRemotePatches={
          'onRemotePatches' in store ? store.onRemotePatches : undefined
        }
        pushPatches={'pushPatches' in store ? store.pushPatches : undefined}
      />
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
  return toTextspec(editor.getSnapshot().context)
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
        expect(getEditorText(editor)).toEqual('B: Hello')
      })
    })

    test('starts with empty editor when store is empty', async () => {
      const store = createMockValueStore([])
      const {editor, unmount} = await createSyncedEditor({store})
      cleanup = unmount

      await vi.waitFor(() => {
        expect(getEditorText(editor)).toEqual('B: |')
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
          selection: null,
        }),
      ).toEqual('B: Hello')
    })
  })

  describe('remote changes apply to editor', () => {
    test('remote change updates editor when idle', async () => {
      const store = createMockValueStore()
      const {editor, unmount} = await createSyncedEditor({store})
      cleanup = unmount

      store.setRemoteValue([makeBlock('b1', 'Hello from remote')])

      await vi.waitFor(() => {
        expect(getEditorText(editor)).toEqual('B: Hello from remote')
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
        expect(getEditorText(editor)).toEqual('B: Hello|')
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
        expect(getEditorText(editor)).toEqual('B: Hello|')
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
      expect(getEditorText(editor)).toEqual('B: Hello world|')

      // Wait for the second push
      await vi.waitFor(() => {
        expect(store.pushValue).toHaveBeenCalled()
      })

      // After mutation flush, editor should have the full text
      await vi.waitFor(() => {
        expect(getEditorText(editor)).toEqual('B: Hello world|')
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
        expect(getEditorText(editor)).toEqual(
          ['B: Hello world|', 'B: from remote'].join('\n'),
        )
      })
    })

    test('remote change without pending writes applies immediately', async () => {
      const store = createMockValueStore()
      const {editor, unmount} = await createSyncedEditor({store})
      cleanup = unmount

      store.setRemoteValue([makeBlock('b1', 'Hello from remote')])

      await vi.waitFor(() => {
        expect(getEditorText(editor)).toEqual('B: Hello from remote')
      })
    })
  })

  describe('patch channel', () => {
    test('remote patches apply to the editor', async () => {
      const store = createMockPatchStore([makeBlock('b1', 'Hello')])
      const {editor, unmount} = await createSyncedEditor({store})
      cleanup = unmount

      await vi.waitFor(() => {
        expect(getEditorText(editor)).toEqual('B: Hello')
      })

      store.receiveRemotePatches([
        {
          type: 'insert',
          origin: 'remote',
          position: 'after',
          path: [{_key: 'b1'}],
          items: [makeBlock('b2', 'From remote')] as unknown as JSONValue[],
        },
      ])

      await vi.waitFor(() => {
        expect(getEditorText(editor)).toEqual(
          ['B: Hello', 'B: From remote'].join('\n'),
        )
      })
      // the patch was applied operationally; no whole-value push happened
      expect(store.pushValue).not.toHaveBeenCalled()
    })

    test('remote text set applies to a specific span', async () => {
      const store = createMockPatchStore([
        makeBlock('b1', 'First'),
        makeBlock('b2', 'Second'),
      ])
      const {editor, unmount} = await createSyncedEditor({store})
      cleanup = unmount

      await vi.waitFor(() => {
        expect(getEditorText(editor)).toEqual(
          ['B: First', 'B: Second'].join('\n'),
        )
      })

      store.receiveRemotePatches([
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: 'b2'}, 'children', {_key: 'b2-span'}, 'text'],
          value: 'Second, edited remotely',
        },
      ])

      await vi.waitFor(() => {
        expect(getEditorText(editor)).toEqual(
          ['B: First', 'B: Second, edited remotely'].join('\n'),
        )
      })
    })

    test('remote patches apply during local typing without losing local changes', async () => {
      const store = createMockPatchStore([makeBlock('b1', 'Hello')])
      const {editor, locator, unmount} = await createSyncedEditor({store})
      cleanup = unmount

      await vi.waitFor(() => {
        expect(getEditorText(editor)).toEqual('B: Hello')
      })

      await locator.click()
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 'b1-span'}],
            offset: 5,
          },
          focus: {
            path: [{_key: 'b1'}, 'children', {_key: 'b1-span'}],
            offset: 5,
          },
        },
      })
      editor.send({type: 'insert.text', text: ' world'})

      // remote patches arrive while the local write is still unflushed
      store.receiveRemotePatches([
        {
          type: 'insert',
          origin: 'remote',
          position: 'after',
          path: [{_key: 'b1'}],
          items: [makeBlock('b2', 'From remote')] as unknown as JSONValue[],
        },
      ])

      await vi.waitFor(() => {
        expect(getEditorText(editor)).toEqual(
          ['B: Hello world|', 'B: From remote'].join('\n'),
        )
      })
    })

    test('local edits push operational patches instead of whole values', async () => {
      const store = createMockPatchStore()
      const {editor, locator, unmount} = await createSyncedEditor({store})
      cleanup = unmount

      await locator.click()
      editor.send({type: 'insert.text', text: 'Hello'})

      await vi.waitFor(() => {
        expect(store.pushPatches).toHaveBeenCalled()
      })

      // the store converged on the editor value purely through patches
      await vi.waitFor(() => {
        expect(
          toTextspec({
            value: store.getValue(),
            schema: editor.getSnapshot().context.schema,
            selection: null,
          }),
        ).toEqual('B: Hello')
      })
      expect(store.pushValue).not.toHaveBeenCalled()
    })

    test('falls back to whole-value push when pushPatches throws', async () => {
      const store = createMockPatchStore()
      store.pushPatches.mockImplementation(() => {
        throw new Error('cannot convert')
      })
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
          selection: null,
        }),
      ).toEqual('B: Hello')
    })
  })
})
