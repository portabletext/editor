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

// Listeners registered via editor.on('mutation', ...).
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

function fireMutationEvent(value: PortableTextBlock[] | undefined) {
  for (const listener of mutationListeners) {
    listener({patches: [], value})
  }
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
  mutationListeners.length = 0
  vi.clearAllMocks()
})

describe('SDKValuePlugin echo suppression', () => {
  test('local edit with normalization divergence should not echo patches back to editor', async () => {
    // Initial state: both editor and SDK have the same value
    const initialValue = [makeBlock('b1', 'Hello')]
    editorValue = initialValue
    sdkStoreValue = initialValue

    await renderPlugin()

    // Clear the initial 'update value' send
    editorSend.mockClear()

    // Simulate a local edit: user types, editor processes it.
    editorValue = [makeBlock('b1', 'Hello world')]

    // Simulate normalization divergence: when setSdkValue pushes the editor
    // value to the SDK, the SDK stores a slightly different value.
    // This happens when the SDK's round-trip produces a structurally
    // different value (e.g., normalization adds markDefs that the raw
    // document doesn't have, or remote state was rebased).
    mockSetSdkValue.mockImplementationOnce(() => {
      sdkStoreValue = [
        {
          _type: 'block',
          _key: 'b1',
          children: [
            {_type: 'span', _key: 'b1-span', text: 'Hello world', marks: []},
          ],
          // Missing markDefs — structural divergence from editor value
          style: 'normal',
        },
      ]
      // Fire subscriber synchronously (echo)
      sdkSubscriber?.()
    })

    // Fire the mutation event (simulates editor emitting a mutation after local edit)
    fireMutationEvent(editorValue)

    // The echo callback should NOT send patches back to the editor.
    // This is a local edit — the editor already has the correct value.
    // Sending patches back causes selection disruption and wasted work.
    expect(editorSend).not.toHaveBeenCalledWith(
      expect.objectContaining({type: 'patches'}),
    )
  })

  test('remote change should still send patches to editor', async () => {
    // Initial state
    const initialValue = [makeBlock('b1', 'Hello')]
    editorValue = initialValue
    sdkStoreValue = initialValue

    await renderPlugin()
    editorSend.mockClear()

    // Simulate a remote change: SDK value changes without a local edit.
    // The subscriber fires because another user edited the document.
    sdkStoreValue = [makeBlock('b1', 'Hello from remote')]

    // Trigger the subscriber directly (no local edit, no patch event)
    sdkSubscriber?.()

    // Remote changes SHOULD produce patches to update the editor.
    expect(editorSend).toHaveBeenCalledWith(
      expect.objectContaining({type: 'patches'}),
    )
  })

  test('local edit without divergence should not send patches back to editor', async () => {
    // Initial state
    const initialValue = [makeBlock('b1', 'Hello')]
    editorValue = initialValue
    sdkStoreValue = initialValue

    await renderPlugin()
    editorSend.mockClear()

    // Simulate a local edit
    editorValue = [makeBlock('b1', 'Hello world')]

    // setSdkValue stores the exact same value the editor has (no divergence)
    mockSetSdkValue.mockImplementationOnce((value: PortableTextBlock[]) => {
      sdkStoreValue = value
      sdkSubscriber?.()
    })

    fireMutationEvent(editorValue)

    // No divergence, so diffValue produces []. No patches sent.
    // This passes today — the echo is harmless when values match.
    expect(editorSend).not.toHaveBeenCalledWith(
      expect.objectContaining({type: 'patches'}),
    )
  })
})
