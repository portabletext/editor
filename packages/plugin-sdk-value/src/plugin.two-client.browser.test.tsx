import type {Editor, Patch as PtePatch} from '@portabletext/editor'
import {EditorProvider, PortableTextEditable} from '@portabletext/editor'
import {EditorRefPlugin} from '@portabletext/editor/plugins'
import {applyAll} from '@portabletext/patches'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createRef} from 'react'
import {afterEach, describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {page} from 'vitest/browser'
import {ValueSyncPlugin} from './plugin.sdk-value'

/**
 * A shared "server" connecting two clients, mimicking the SDK's document
 * store semantics:
 *
 * - a client's own patches apply to its local value optimistically and
 *   synchronously
 * - deliveries to the server are queued; `deliver()` applies a queued
 *   transaction to the server value best-effort (json-match semantics:
 *   patches whose paths don't resolve are no-ops), rebases every client's
 *   local value onto the server truth, and forwards the raw patches to the
 *   other client's patch channel
 */
function createTwoClientServer(initialValue: PortableTextBlock[]) {
  let serverValue = initialValue

  type PendingTransaction =
    | {kind: 'patches'; patches: PtePatch[]}
    | {kind: 'value'; value: PortableTextBlock[]}

  type ClientChannels = {
    pending: PendingTransaction[]
    valueSubscriber: (() => void) | null
    patchSubscriber: ((patches: PtePatch[]) => void) | null
  }

  const clients: [ClientChannels, ClientChannels] = [
    {pending: [], valueSubscriber: null, patchSubscriber: null},
    {pending: [], valueSubscriber: null, patchSubscriber: null},
  ]

  const pendingDeliveries: Array<() => void> = []

  function applyBestEffort(
    value: PortableTextBlock[],
    patches: PtePatch[],
  ): PortableTextBlock[] {
    let next = value
    for (const patch of patches) {
      try {
        next = applyAll(next, [patch])
      } catch {
        // the server no-ops patches whose paths don't resolve
      }
    }
    return next
  }

  // A client's local value is the server truth with its own unacknowledged
  // transactions rebased on top, like the SDK's optimistic document store
  function localValue(client: ClientChannels): PortableTextBlock[] {
    return client.pending.reduce(
      (value, transaction) =>
        transaction.kind === 'value'
          ? transaction.value
          : applyBestEffort(value, transaction.patches),
      serverValue,
    )
  }

  function createStore(index: 0 | 1) {
    const client = clients[index]
    const other = clients[index === 0 ? 1 : 0]

    return {
      getRemoteValue: () => localValue(client),
      onRemoteValueChange: (callback: () => void) => {
        client.valueSubscriber = callback
        return () => {
          client.valueSubscriber = null
        }
      },
      onRemotePatches: (callback: (patches: PtePatch[]) => void) => {
        client.patchSubscriber = callback
        return () => {
          client.patchSubscriber = null
        }
      },
      pushValue: vi.fn((newValue: PortableTextBlock[]) => {
        const transaction: PendingTransaction = {kind: 'value', value: newValue}
        client.pending.push(transaction)
        client.valueSubscriber?.()
        pendingDeliveries.push(() => {
          serverValue = newValue
          client.pending.splice(client.pending.indexOf(transaction), 1)
          other.valueSubscriber?.()
          client.valueSubscriber?.()
        })
      }),
      pushPatches: vi.fn((patches: PtePatch[]) => {
        const transaction: PendingTransaction = {kind: 'patches', patches}
        client.pending.push(transaction)
        client.valueSubscriber?.()
        pendingDeliveries.push(() => {
          serverValue = applyBestEffort(serverValue, patches)
          client.pending.splice(client.pending.indexOf(transaction), 1)
          other.patchSubscriber?.(patches)
          other.valueSubscriber?.()
          client.valueSubscriber?.()
        })
      }),
    }
  }

  return {
    storeA: createStore(0),
    storeB: createStore(1),
    getServerValue: () => serverValue,
    hasPendingDeliveries: () => pendingDeliveries.length > 0,
    deliver: () => {
      while (pendingDeliveries.length > 0) {
        pendingDeliveries.shift()!()
      }
    },
  }
}

type Server = ReturnType<typeof createTwoClientServer>
type Store = Server['storeA']

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
  annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
})

async function renderTwoClients(server: Server) {
  const editorARef = createRef<Editor>()
  const editorBRef = createRef<Editor>()

  const client = (ref: React.Ref<Editor>, store: Store, testId: string) => (
    <EditorProvider
      initialConfig={{
        schemaDefinition,
        initialValue: store.getRemoteValue(),
      }}
    >
      <EditorRefPlugin ref={ref} />
      <PortableTextEditable data-testid={testId} />
      <ValueSyncPlugin
        getRemoteValue={store.getRemoteValue}
        pushValue={store.pushValue}
        onRemoteValueChange={store.onRemoteValueChange}
        onRemotePatches={store.onRemotePatches}
        pushPatches={store.pushPatches}
      />
    </EditorProvider>
  )

  const result = await render(
    <>
      {client(editorARef, server.storeA, 'client-a')}
      {client(editorBRef, server.storeB, 'client-b')}
    </>,
  )

  await vi.waitFor(() => {
    expect(editorARef.current).toBeTruthy()
    expect(editorBRef.current).toBeTruthy()
  })

  return {
    editorA: editorARef.current!,
    editorB: editorBRef.current!,
    locatorA: page.getByTestId('client-a'),
    locatorB: page.getByTestId('client-b'),
    unmount: result.unmount,
  }
}

function makeBlock(key: string, text: string): PortableTextBlock {
  return {
    _type: 'block',
    _key: key,
    children: [{_type: 'span', _key: `${key}-span`, text, marks: []}],
    markDefs: [],
    style: 'normal',
  }
}

function selectRange(
  editor: Editor,
  blockKey: string,
  spanKey: string,
  anchorOffset: number,
  focusOffset: number,
) {
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: anchorOffset,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: focusOffset,
      },
    },
  })
}

async function settleAndAssertConvergence(options: {
  server: Server
  editorA: Editor
  editorB: Editor
}) {
  const {server, editorA, editorB} = options

  await vi.waitFor(
    () => {
      server.deliver()
      expect(server.hasPendingDeliveries()).toBe(false)
      expect(editorA.getSnapshot().context.value).toEqual(
        server.getServerValue(),
      )
      expect(editorB.getSnapshot().context.value).toEqual(
        server.getServerValue(),
      )
    },
    {timeout: 5000, interval: 100},
  )
}

describe('two clients through a shared patch-channel store', () => {
  let cleanup: (() => void) | undefined
  let consoleError: ReturnType<typeof vi.spyOn> | undefined

  afterEach(() => {
    cleanup?.()
    cleanup = undefined
    consoleError?.mockRestore()
    consoleError = undefined
  })

  test('concurrent typing in different blocks converges without data loss', async () => {
    const server = createTwoClientServer([
      makeBlock('b1', 'alpha'),
      makeBlock('b2', 'omega'),
    ])
    const {editorA, editorB, locatorA, locatorB, unmount} =
      await renderTwoClients(server)
    cleanup = unmount

    await locatorA.click()
    selectRange(editorA, 'b1', 'b1-span', 5, 5)
    editorA.send({type: 'insert.text', text: ' one'})
    await locatorB.click()
    selectRange(editorB, 'b2', 'b2-span', 5, 5)
    editorB.send({type: 'insert.text', text: ' two'})

    await vi.waitFor(() => {
      expect(server.storeA.pushPatches).toHaveBeenCalled()
      expect(server.storeB.pushPatches).toHaveBeenCalled()
    })

    await settleAndAssertConvergence({server, editorA, editorB})

    const texts = server
      .getServerValue()
      .map((block) =>
        ((block as {children?: Array<{text?: string}>}).children ?? [])
          .map((child) => child.text ?? '')
          .join(''),
      )
    expect(texts).toEqual(['alpha one', 'omega two'])
  })

  test('concurrent same-range bolding converges', async () => {
    // Both clients bold overlapping parts of the same span at the same
    // moment. The engine cannot apply the other side's split operations
    // (its keyed targets are gone locally), so this exercises the repair
    // path end to end.
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const server = createTwoClientServer([makeBlock('b1', 'Hello world')])
    const {editorA, editorB, locatorA, locatorB, unmount} =
      await renderTwoClients(server)
    cleanup = unmount

    await locatorA.click()
    selectRange(editorA, 'b1', 'b1-span', 0, 8)
    editorA.send({type: 'decorator.add', decorator: 'strong'})
    await locatorB.click()
    selectRange(editorB, 'b1', 'b1-span', 4, 11)
    editorB.send({type: 'decorator.add', decorator: 'strong'})

    await vi.waitFor(() => {
      expect(server.storeA.pushPatches).toHaveBeenCalled()
      expect(server.storeB.pushPatches).toHaveBeenCalled()
    })

    await settleAndAssertConvergence({server, editorA, editorB})
  })

  test('concurrent link and bold over overlapping ranges converge', async () => {
    // The rig's link-overlap-range scenario: one client annotates while the
    // other bolds an overlapping range. markDefs is written as a whole-array
    // set, so this also exercises sidecar-array conflicts.
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const server = createTwoClientServer([makeBlock('b1', 'Hello world')])
    const {editorA, editorB, locatorA, locatorB, unmount} =
      await renderTwoClients(server)
    cleanup = unmount

    await locatorA.click()
    selectRange(editorA, 'b1', 'b1-span', 0, 8)
    editorA.send({
      type: 'annotation.add',
      annotation: {name: 'link', value: {href: 'https://example.com'}},
    })
    await locatorB.click()
    selectRange(editorB, 'b1', 'b1-span', 4, 11)
    editorB.send({type: 'decorator.add', decorator: 'strong'})

    await vi.waitFor(() => {
      expect(server.storeA.pushPatches).toHaveBeenCalled()
      expect(server.storeB.pushPatches).toHaveBeenCalled()
    })

    await settleAndAssertConvergence({server, editorA, editorB})
  })

  test('formatting conflict during concurrent typing converges', async () => {
    // The hardest mix: one client types while the other formats the range
    // being typed into.
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const server = createTwoClientServer([makeBlock('b1', 'Hello world')])
    const {editorA, editorB, locatorA, locatorB, unmount} =
      await renderTwoClients(server)
    cleanup = unmount

    await locatorA.click()
    selectRange(editorA, 'b1', 'b1-span', 11, 11)
    editorA.send({type: 'insert.text', text: ' and more'})
    await locatorB.click()
    selectRange(editorB, 'b1', 'b1-span', 0, 11)
    editorB.send({type: 'decorator.add', decorator: 'strong'})

    await vi.waitFor(() => {
      expect(server.storeA.pushPatches).toHaveBeenCalled()
      expect(server.storeB.pushPatches).toHaveBeenCalled()
    })

    await settleAndAssertConvergence({server, editorA, editorB})
  })

  test('deleting one of two exact duplicates while the peer types at the end', async () => {
    // Field report: deleting text that exists as an exact duplicate during
    // concurrent editing corrupts. The deletion travels as a
    // `diffMatchPatch` whose context anchors are identical at both copies,
    // so against a base shifted by the peer's typing it can anchor at the
    // wrong copy and swallow the peer's text.
    const copy = "I'm feeling pretty good honestly. "
    const server = createTwoClientServer([makeBlock('b1', copy + copy)])
    const {editorA, editorB, locatorA, locatorB, unmount} =
      await renderTwoClients(server)
    cleanup = unmount

    // B types at the very end; A deletes the second copy. B's insert
    // reaches the server first, so A's delete applies against a base
    // shifted by text A never saw.
    await locatorB.click()
    selectRange(editorB, 'b1', 'b1-span', copy.length * 2, copy.length * 2)
    editorB.send({type: 'insert.text', text: 'hi'})
    await locatorA.click()
    selectRange(editorA, 'b1', 'b1-span', copy.length, copy.length * 2)
    editorA.send({type: 'delete'})

    await vi.waitFor(() => {
      expect(server.storeA.pushPatches).toHaveBeenCalled()
      expect(server.storeB.pushPatches).toHaveBeenCalled()
    })

    await settleAndAssertConvergence({server, editorA, editorB})

    // One copy deleted, the peer's text kept.
    const texts = server
      .getServerValue()
      .map((block) =>
        ((block as {children?: Array<{text?: string}>}).children ?? [])
          .map((child) => child.text ?? '')
          .join(''),
      )
    expect(texts).toEqual([`${copy}hi`])
  })

  test('deleting one of two exact duplicates while the peer types inside the deleted copy', async () => {
    const copy = "I'm feeling pretty good honestly. "
    const server = createTwoClientServer([makeBlock('b1', copy + copy)])
    const {editorA, editorB, locatorA, locatorB, unmount} =
      await renderTwoClients(server)
    cleanup = unmount

    // B types twelve characters into the second copy; A deletes it. B's
    // insert reaches the server first, so A's delete applies against a
    // base shifted by text A never saw.
    await locatorB.click()
    selectRange(editorB, 'b1', 'b1-span', copy.length + 12, copy.length + 12)
    editorB.send({type: 'insert.text', text: 'hi'})
    await locatorA.click()
    selectRange(editorA, 'b1', 'b1-span', copy.length, copy.length * 2)
    editorA.send({type: 'delete'})

    await vi.waitFor(() => {
      expect(server.storeA.pushPatches).toHaveBeenCalled()
      expect(server.storeB.pushPatches).toHaveBeenCalled()
    })

    await settleAndAssertConvergence({server, editorA, editorB})

    // The delete wins the region, but the peer's text typed inside it
    // should survive somewhere; at minimum nothing beyond the two intended
    // edits may change. Pin the correct merge: one copy gone, "hi" kept.
    const texts = server
      .getServerValue()
      .map((block) =>
        ((block as {children?: Array<{text?: string}>}).children ?? [])
          .map((child) => child.text ?? '')
          .join(''),
      )
    expect(texts).toEqual([`${copy.slice(0, 12)}hi${copy.slice(12)}`])
  })
})
