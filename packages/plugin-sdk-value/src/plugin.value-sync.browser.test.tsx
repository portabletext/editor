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
import {page, userEvent} from 'vitest/browser'
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
    // value and emit through both channels, patches first, like the real SDK.
    // Application is best-effort per patch, mirroring the server's json-match
    // semantics where patches whose paths don't resolve are no-ops.
    receiveRemotePatches: (patches: PtePatch[]) => {
      for (const patch of patches) {
        try {
          value = applyAll(value, [patch])
        } catch {
          // the server would no-op this patch
        }
      }
      patchSubscriber?.(patches)
      valueSubscriber?.()
    },
    // Simulate a remote transaction whose patches don't resolve against this
    // client's state: the server still applied it (it had the sender's view
    // of the document), so the store value jumps to `newValue`, while the raw
    // `patches` are what travels over the patch channel.
    receiveRemoteTransaction: (
      newValue: PortableTextBlock[],
      patches: PtePatch[],
    ) => {
      value = newValue
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
  schemaDefinition?: ReturnType<typeof defineSchema>
}) {
  const editorRef = createRef<Editor>()
  const keyGenerator = createTestKeyGenerator()
  const {store} = options

  const result = await render(
    <EditorProvider
      initialConfig={{
        keyGenerator,
        schemaDefinition: options.schemaDefinition ?? defineSchema({}),
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

  describe('solo typing fidelity', () => {
    // Field regression: a single user typing with delete-and-retype bursts
    // saw text reordered and duplicated. Two machine bugs compounded:
    // 'mutation flushed' events arriving in bursts were dropped by states
    // without a handler (their patches never pushed, so the store diverged),
    // and the whole-value repair ran while local edits were in flight,
    // diffing the editor against the diverged store and resurrecting
    // deleted text. This test types in bursts that straddle flush timing
    // and requires the editor, the store, and the expected text to agree.
    test('delete-and-retype bursts converge to exactly what was typed', async () => {
      const store = createMockPatchStore([])
      const {editor, locator, unmount} = await createSyncedEditor({store})
      cleanup = unmount

      await vi.waitFor(() => {
        expect(getEditorText(editor)).toEqual('B: |')
      })
      // Real key events matter here: each keystroke is its own operation,
      // so a flush emits one mutation event per pending operation — the
      // burst that used to hit states without a 'mutation flushed' handler.
      // `editor.send` events coalesce into a single bulk and cannot
      // reproduce the burst.
      await userEvent.click(locator)

      const settle = (ms: number) => new Promise((r) => setTimeout(r, ms))
      const backspace = async (count: number) => {
        for (let i = 0; i < count; i++) {
          await userEvent.keyboard('{Backspace}')
        }
      }

      // Interleave typing, deletes, and retypes across flush windows (the
      // test-mode flush interval is 500ms, the typing debounce 250ms)
      // without waiting for convergence in between.
      await userEvent.type(locator, 'publish editors ')
      await settle(300)
      await userEvent.type(locator, 'deadline ')
      await backspace(5)
      await settle(120)
      await userEvent.type(locator, 'line ')
      await settle(300)
      await userEvent.type(locator, 'sources ')
      await backspace(8)
      await settle(550)
      await userEvent.type(locator, 'sources ')
      await userEvent.type(locator, 'context')
      await settle(120)
      await backspace(3)
      await settle(300)
      await userEvent.type(locator, 'ext')

      const expectedEditor = 'B: publish editors deadline sources context|'
      const expectedStore = 'B: publish editors deadline sources context'

      await vi.waitFor(
        () => {
          expect(getEditorText(editor)).toEqual(expectedEditor)
          expect(
            toTextspec({
              value: store.getValue(),
              schema: editor.getSnapshot().context.schema,
              selection: null,
            }),
          ).toEqual(expectedStore)
        },
        {timeout: 5000},
      )
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

    // Field regression: when a collaborator's transaction arrives
    // interleaved with the listener echoes of this client's own recent
    // edits, the store value is transiently wrong until the rebase
    // corrects it. A repair fired inside that window used to copy the
    // transient into the editor and a follow-up repair restored the text
    // at a drifted offset, scrambling words typed in the meantime. The
    // repair must wait out the blink and only act on divergence that
    // persists.
    test('a transiently wrong store value is never copied into the editor', async () => {
      const store = createMockValueStore([makeBlock('b1', 'stable text here')])
      const {editor, unmount} = await createSyncedEditor({store})
      cleanup = unmount

      await vi.waitFor(() => {
        expect(getEditorText(editor)).toEqual('B: stable text here')
      })

      // A whipsaw self-heals by the end (the second repair restores the
      // text), so final-state assertions cannot catch it; in production the
      // user types between the two repairs and the restore lands at a
      // drifted offset. The direct observable is the repair traffic itself:
      // a transient must produce ZERO sync writes into the editor.
      const syncWrites: Array<string> = []
      const originalSend = editor.send.bind(editor)
      editor.send = ((event: Parameters<Editor['send']>[0]) => {
        if (event.type === 'patches' || event.type === 'update value') {
          syncWrites.push(event.type)
        }
        originalSend(event)
      }) as Editor['send']

      try {
        // The store blinks: a wrong value (own edits double-applied) that
        // self-corrects shortly after, well inside the confirmation window.
        store.setRemoteValue([makeBlock('b1', 'stable tex')])
        await new Promise((resolve) => setTimeout(resolve, 50))
        store.setRemoteValue([makeBlock('b1', 'stable text here')])

        // Wait past the confirmation window.
        await new Promise((resolve) => setTimeout(resolve, 400))
      } finally {
        editor.send = originalSend
      }

      expect(getEditorText(editor)).toEqual('B: stable text here')
      expect(syncWrites).toEqual([])
    })

    test('persistent divergence still gets repaired', async () => {
      const store = createMockValueStore([makeBlock('b1', 'before')])
      const {editor, unmount} = await createSyncedEditor({store})
      cleanup = unmount

      await vi.waitFor(() => {
        expect(getEditorText(editor)).toEqual('B: before')
      })

      // A real remote change: it persists, so after the confirmation
      // window the repair applies it.
      store.setRemoteValue([makeBlock('b1', 'after, and it stays')])

      await vi.waitFor(() => {
        expect(getEditorText(editor)).toEqual('B: after, and it stays')
      })
    })

    test('remote decorator toggle syncs `marks` inserts and unsets', async () => {
      const makeValue = (marks: string[]): PortableTextBlock[] => [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'Hello', marks}],
          markDefs: [],
          style: 'normal',
        },
      ]

      const store = createMockValueStore(makeValue([]))
      const {editor, unmount} = await createSyncedEditor({
        store,
        schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      })
      cleanup = unmount

      await vi.waitFor(() => {
        expect(getEditorText(editor)).toEqual('B: Hello')
      })

      // A collaborator toggles bold on. `applySync` diffs this into an
      // `insert` after `marks[-1]`.
      store.setRemoteValue(makeValue(['strong']))

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual(
          makeValue(['strong']),
        )
      })

      // The collaborator toggles bold back off. `applySync` diffs this
      // into an `unset` of `marks[0]`.
      store.setRemoteValue(makeValue([]))

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual(makeValue([]))
      })
    })

    test('remote annotation toggle syncs span splits, `marks` and `markDefs`', async () => {
      const plainValue: PortableTextBlock[] = [
        {
          _type: 'block',
          _key: 'b1',
          children: [
            {_type: 'span', _key: 's1', text: 'hello world', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ]
      const annotatedValue: PortableTextBlock[] = [
        {
          _type: 'block',
          _key: 'b1',
          children: [
            {_type: 'span', _key: 's1', text: 'hello ', marks: []},
            {_type: 'span', _key: 's2', text: 'wor', marks: ['m1']},
            {_type: 'span', _key: 's3', text: 'ld', marks: []},
          ],
          markDefs: [{_key: 'm1', _type: 'link', href: 'https://sanity.io'}],
          style: 'normal',
        },
      ]

      const store = createMockValueStore(plainValue)
      const {editor, unmount} = await createSyncedEditor({
        store,
        schemaDefinition: defineSchema({
          annotations: [
            {name: 'link', fields: [{name: 'href', type: 'string'}]},
          ],
        }),
      })
      cleanup = unmount

      await vi.waitFor(() => {
        expect(getEditorText(editor)).toEqual('B: hello world')
      })

      // A collaborator applies a link to "wor": the span splits in three,
      // the middle one referencing a new markDef.
      store.setRemoteValue(annotatedValue)

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual(annotatedValue)
      })

      // The collaborator removes the link again: spans merge back and the
      // markDef is removed.
      store.setRemoteValue(plainValue)

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual(plainValue)
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

    test('converges to the store value when remote patches cannot apply', async () => {
      const store = createMockPatchStore([makeBlock('b1', 'Hello')])
      const {editor, unmount} = await createSyncedEditor({store})
      cleanup = unmount

      await vi.waitFor(() => {
        expect(getEditorText(editor)).toEqual('B: Hello')
      })

      // Another client, working from a diverged view of the document,
      // replaced a span this client doesn't have. Its keyed operations
      // don't resolve here (the editor logs and skips them), but the
      // store (server) accepted the transaction.
      store.receiveRemoteTransaction(
        [
          {
            ...makeBlock('b1', ''),
            children: [
              {_type: 'span', _key: 'other-1', text: 'Hello there', marks: []},
            ],
          },
        ],
        [
          {
            type: 'unset',
            origin: 'remote',
            path: [{_key: 'b1'}, 'children', {_key: 'nonexistent'}],
          },
          {
            type: 'insert',
            origin: 'remote',
            position: 'after',
            path: [{_key: 'b1'}, 'children', {_key: 'also-nonexistent'}],
            items: [
              {_type: 'span', _key: 'other-1', text: 'Hello there', marks: []},
            ] as unknown as JSONValue[],
          },
        ],
      )

      // The whole-value repair kicks in and converges the editor
      await vi.waitFor(() => {
        expect(getEditorText(editor)).toEqual('B: Hello there')
      })
    })

    test('concurrent same-range formatting converges to the store value', async () => {
      // Both clients format the same range at the same moment: while this
      // client's own patch push is still in flight, the other client's
      // transaction arrives. Its keyed operations were produced against a
      // different view of the document, so applying them here garbles the
      // editor; the repair sync must still converge the editor to the
      // store (server) truth, even though the value-change notification is
      // absorbed as the push acknowledgement.
      const store = createMockPatchStore([makeBlock('b1', 'Hello world')])
      const {editor, locator, unmount} = await createSyncedEditor({
        store,
        schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      })
      cleanup = unmount

      await vi.waitFor(() => {
        expect(getEditorText(editor)).toEqual('B: Hello world')
      })

      // The server truth after both transactions: the other client bolded
      // "Hello" (splitting the span its way) on top of our bolding of
      // "world"
      const mergedValue = [
        {
          ...makeBlock('b1', ''),
          children: [
            {_type: 'span', _key: 'r1', text: 'Hello', marks: ['strong']},
            {_type: 'span', _key: 'b1-span', text: ' ', marks: []},
            {_type: 'span', _key: 'l1', text: 'world', marks: ['strong']},
          ],
        },
      ]

      // When our push goes out, the concurrent remote transaction comes
      // back interleaved with it, before the machine settles
      store.pushPatches.mockImplementationOnce(() => {
        store.receiveRemoteTransaction(mergedValue, [
          {
            type: 'set',
            origin: 'remote',
            path: [{_key: 'b1'}, 'children', {_key: 'b1-span'}, 'text'],
            value: ' world',
          },
          {
            type: 'insert',
            origin: 'remote',
            position: 'before',
            path: [{_key: 'b1'}, 'children', {_key: 'b1-span'}],
            items: [
              {_type: 'span', _key: 'r1', text: 'Hello', marks: ['strong']},
            ] as unknown as JSONValue[],
          },
        ])
      })

      // Local client bolds "world" (splits b1-span into two spans)
      await locator.click()
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 'b1-span'}],
            offset: 6,
          },
          focus: {
            path: [{_key: 'b1'}, 'children', {_key: 'b1-span'}],
            offset: 11,
          },
        },
      })
      editor.send({type: 'decorator.add', decorator: 'strong'})

      await vi.waitFor(() => {
        expect(store.pushPatches).toHaveBeenCalled()
      })

      // Whatever the intermediate misapplications, the editor must end up
      // mirroring the store value
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual(store.getValue())
      })
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
