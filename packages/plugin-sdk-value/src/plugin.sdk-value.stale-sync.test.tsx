// @vitest-environment jsdom
import type {PortableTextBlock} from '@portabletext/editor'
import {act, createElement} from 'react'
import {createRoot} from 'react-dom/client'
import {afterEach, describe, expect, test, vi} from 'vitest'

// ---- Mock state ----

// The value the SDK store holds. Updated by setSdkValue, read by getCurrent.
let sdkStoreValue: PortableTextBlock[] = []

// Subscriber registered by the plugin via onSdkValueChange.
let sdkSubscriber: (() => void) | null = null

// The value the editor holds. Read by getEditorValue (editor.getSnapshot).
let editorValue: PortableTextBlock[] = []

// Listeners registered via editor.on('patch', ...) and editor.on('mutation', ...).
const patchListeners: Array<(event: {patch: unknown}) => void> = []
const mutationListeners: Array<
  (event: {patches: unknown[]; value: PortableTextBlock[] | undefined}) => void
> = []

// Spy for editor.send
const editorSend = vi.fn()

// Mock setSdkValue: updates the store and fires the subscriber synchronously
// (mirrors real SDK behavior: Zustand + RxJS pipeline is synchronous).
const mockSetSdkValue = vi.fn((value: PortableTextBlock[]) => {
  sdkStoreValue = value
  // Fire subscriber synchronously, just like the real SDK
  sdkSubscriber?.()
})

// ---- Module mocks ----

vi.mock('@portabletext/editor', () => ({
  useEditor: () => ({
    getSnapshot: () => ({context: {value: editorValue}}),
    on: (event: string, callback: (...args: Array<unknown>) => void) => {
      if (event === 'patch') {
        patchListeners.push(callback as (typeof patchListeners)[number])
      }
      if (event === 'mutation') {
        mutationListeners.push(callback as (typeof mutationListeners)[number])
      }
      return {unsubscribe: () => {}}
    },
    send: editorSend,
  }),
}))

vi.mock('@sanity/sdk-react', () => ({
  useEditDocument: () => mockSetSdkValue,
  useSanityInstance: () => ({}),
  getDocumentState: () => ({
    getCurrent: () => sdkStoreValue,
    subscribe: (callback: () => void) => {
      sdkSubscriber = callback
      return () => {
        sdkSubscriber = null
      }
    },
  }),
}))

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

function firePatchEvent() {
  for (const listener of patchListeners) {
    listener({patch: {}})
  }
}

function fireMutationEvent(value: PortableTextBlock[] | undefined) {
  for (const listener of mutationListeners) {
    listener({patches: [], value})
  }
}

let root: ReturnType<typeof createRoot> | null = null
let container: HTMLDivElement | null = null

async function renderPlugin() {
  const {SDKValuePlugin} = await import('./plugin.sdk-value')

  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)

  act(() => {
    root!.render(
      createElement(SDKValuePlugin, {
        documentId: 'test-doc',
        documentType: 'article',
        path: 'body',
      }),
    )
  })
}

// ---- Tests ----

afterEach(() => {
  if (root && container) {
    act(() => {
      root!.unmount()
    })
    container.remove()
  }
  root = null
  container = null
  sdkSubscriber = null
  sdkStoreValue = []
  editorValue = []
  patchListeners.length = 0
  mutationListeners.length = 0
  vi.clearAllMocks()
})

describe('SDKValuePlugin stale sync prevention', () => {
  test('stale SDK callback during pending writes should not revert editor text', async () => {
    // Initial state: both sides have "hello"
    const initialValue = [makeBlock('b1', 'hello')]
    editorValue = initialValue
    sdkStoreValue = initialValue

    await renderPlugin()
    editorSend.mockClear()

    // Step 1: User types "hello" and mutation flushes to SDK
    // (This is the first mutation cycle, already complete)

    // Step 2: User types " world" — editor is now "hello world"
    editorValue = [makeBlock('b1', 'hello world')]

    // Each keystroke emits a patch event
    firePatchEvent() // ' '
    firePatchEvent() // 'w'
    firePatchEvent() // 'o'
    firePatchEvent() // 'r'
    firePatchEvent() // 'l'
    firePatchEvent() // 'd'

    // Step 3: SDK fires onSdkValueChange with stale value "hello"
    // (e.g., Content Lake acknowledged the first mutation, WebSocket reconnect)
    // The SDK store still has "hello" because the new mutations haven't flushed yet.
    sdkStoreValue = [makeBlock('b1', 'hello')]
    sdkSubscriber?.()

    // BUG: Without the fix, diffValue("hello world", "hello") produces patches
    // that remove " world", and the editor reverts to "hello".
    // With the fix, the plugin should skip the diff because hasPendingWrites is true.
    expect(editorSend).not.toHaveBeenCalledWith(
      expect.objectContaining({type: 'patches'}),
    )
  })

  test('deferred sync recomputes after mutation flush', async () => {
    const initialValue = [makeBlock('b1', 'hello')]
    editorValue = initialValue
    sdkStoreValue = initialValue

    await renderPlugin()
    editorSend.mockClear()

    // User types " world"
    editorValue = [makeBlock('b1', 'hello world')]
    firePatchEvent()

    // Stale SDK callback arrives — should be deferred
    sdkStoreValue = [makeBlock('b1', 'hello')]
    sdkSubscriber?.()

    expect(editorSend).not.toHaveBeenCalledWith(
      expect.objectContaining({type: 'patches'}),
    )

    // Mutation flushes: editor sends "hello world" to SDK
    // setSdkValue updates the store, which fires the subscriber synchronously.
    // After the flush, the deferred sync should recompute.
    mockSetSdkValue.mockImplementationOnce((value: PortableTextBlock[]) => {
      sdkStoreValue = value
      sdkSubscriber?.()
    })
    fireMutationEvent(editorValue)

    // After flush, SDK and editor are in sync ("hello world" on both sides).
    // The deferred sync recomputes: diffValue("hello world", "hello world") = []
    // No patches should be sent.
    await vi.waitFor(() => {
      expect(editorSend).not.toHaveBeenCalledWith(
        expect.objectContaining({type: 'patches'}),
      )
    })
  })

  test('real remote change during pending writes applies after flush', async () => {
    const initialValue = [makeBlock('b1', 'hello')]
    editorValue = initialValue
    sdkStoreValue = initialValue

    await renderPlugin()
    editorSend.mockClear()

    // User types " world"
    editorValue = [makeBlock('b1', 'hello world')]
    firePatchEvent()

    // Remote user adds a second block while we have pending writes
    sdkStoreValue = [makeBlock('b1', 'hello'), makeBlock('b2', 'from remote')]
    sdkSubscriber?.()

    // Should be deferred (we have pending writes)
    expect(editorSend).not.toHaveBeenCalledWith(
      expect.objectContaining({type: 'patches'}),
    )

    // Mutation flushes: editor sends "hello world" to SDK
    mockSetSdkValue.mockImplementationOnce((value: PortableTextBlock[]) => {
      sdkStoreValue = [
        // SDK now has our "hello world" plus the remote block
        ...(value as PortableTextBlock[]),
        makeBlock('b2', 'from remote'),
      ]
      sdkSubscriber?.()
    })
    fireMutationEvent(editorValue)

    // After flush, the deferred sync should detect the remote block
    // and send patches to add it.
    await vi.waitFor(() => {
      expect(editorSend).toHaveBeenCalledWith(
        expect.objectContaining({type: 'patches'}),
      )
    })
  })

  test('SDK callback without pending writes applies immediately', async () => {
    const initialValue = [makeBlock('b1', 'hello')]
    editorValue = initialValue
    sdkStoreValue = initialValue

    await renderPlugin()
    editorSend.mockClear()

    // Remote change arrives when editor has no pending writes
    sdkStoreValue = [makeBlock('b1', 'hello from remote')]
    sdkSubscriber?.()

    // Should apply immediately (no pending writes)
    expect(editorSend).toHaveBeenCalledWith(
      expect.objectContaining({type: 'patches'}),
    )
  })

  test('multiple SDK callbacks during typing only trigger one recompute', async () => {
    const initialValue = [makeBlock('b1', 'hello')]
    editorValue = initialValue
    sdkStoreValue = initialValue

    await renderPlugin()
    editorSend.mockClear()

    // User types
    editorValue = [makeBlock('b1', 'hello world')]
    firePatchEvent()

    // Multiple stale SDK callbacks arrive
    sdkStoreValue = [makeBlock('b1', 'hello')]
    sdkSubscriber?.()
    sdkSubscriber?.()
    sdkSubscriber?.()

    // All deferred
    expect(editorSend).not.toHaveBeenCalledWith(
      expect.objectContaining({type: 'patches'}),
    )

    // Mutation flushes — SDK and editor converge
    mockSetSdkValue.mockImplementationOnce((value: PortableTextBlock[]) => {
      sdkStoreValue = value
      sdkSubscriber?.()
    })
    fireMutationEvent(editorValue)

    // Only one recompute, and since values match, no patches
    await vi.waitFor(() => {
      expect(editorSend).not.toHaveBeenCalledWith(
        expect.objectContaining({type: 'patches'}),
      )
    })
  })
})
