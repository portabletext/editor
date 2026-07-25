import type {
  Editor,
  EditorSelection,
  Patch as PtePatch,
} from '@portabletext/editor'
import {EditorProvider, PortableTextEditable} from '@portabletext/editor'
import {EditorRefPlugin} from '@portabletext/editor/plugins'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {diffValue, type SanityPatchOperations} from '@sanity/diff-patch'
import {createRef} from 'react'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {page} from 'vitest/browser'
import {
  convertPatchesToSanity,
  scopeRemotePatches,
  ValueSyncPlugin,
} from './plugin.sdk-value'
import {
  applyPatchOperations,
  type SanityPatchOperationRecord,
} from './test/apply-sanity-patch-operations'

/**
 * Deterministic collision matrix: two live editors connected through a mock
 * server that applies real Sanity patch operations with Content Lake
 * semantics. Each scenario fires one concurrent edit per client, then the
 * server delivers the colliding transactions in both orders (A first, B
 * first).
 *
 * Every scenario asserts the hard safety invariants:
 * - both editors converge on the server value (no frozen/diverged tabs)
 * - the server value is valid Portable Text (no orphan marks, no spans
 *   with children, no inline link objects)
 * - `kind: 'type'` scenarios also assert both clients' typed markers
 *   survive (the silent-loss axis)
 *
 * The scenarios mirror the Playwright concurrency harness
 * (sanity-labs/pte-sdk-concurrent-repro) so regressions the harness would
 * catch fail here first, deterministically and offline.
 */

const FIELD = 'content'

// ---------------------------------------------------------------------------
// Mock server with Content Lake patch semantics
// ---------------------------------------------------------------------------

function createContentLakeServer(initialBlocks: PortableTextBlock[]) {
  let serverDocument: unknown = {[FIELD]: initialBlocks}

  type Transaction = {ops: SanityPatchOperations[]}

  type ClientChannels = {
    pending: Transaction[]
    valueSubscriber: (() => void) | null
    patchSubscriber: ((patches: PtePatch[]) => void) | null
  }

  const clients: [ClientChannels, ClientChannels] = [
    {pending: [], valueSubscriber: null, patchSubscriber: null},
    {pending: [], valueSubscriber: null, patchSubscriber: null},
  ]

  const deliveries: Array<{client: 0 | 1; run: () => void}> = []

  function applyTransaction(doc: unknown, transaction: Transaction): unknown {
    return transaction.ops.reduce(
      (acc, ops) =>
        applyPatchOperations(acc, ops as SanityPatchOperationRecord),
      doc,
    )
  }

  // A client's local document is the server truth with its own
  // unacknowledged transactions rebased on top, like the SDK's optimistic
  // document store. Transactions that fail to apply revert.
  function localDocument(client: ClientChannels): unknown {
    return client.pending.reduce((doc, transaction) => {
      try {
        return applyTransaction(doc, transaction)
      } catch {
        return doc
      }
    }, serverDocument)
  }

  function fieldValue(doc: unknown): PortableTextBlock[] {
    return (doc as {[key: string]: PortableTextBlock[]})[FIELD]
  }

  function queueTransaction(index: 0 | 1, ops: SanityPatchOperations[]) {
    const client = clients[index]
    const other = clients[index === 0 ? 1 : 0]
    const transaction: Transaction = {ops}
    client.pending.push(transaction)
    client.valueSubscriber?.()

    deliveries.push({
      client: index,
      run: () => {
        let applied: unknown
        try {
          applied = applyTransaction(serverDocument, transaction)
        } catch {
          // content lake rejects the whole transaction; the SDK reverts it
          client.pending.splice(client.pending.indexOf(transaction), 1)
          client.valueSubscriber?.()
          return
        }
        serverDocument = applied
        client.pending.splice(client.pending.indexOf(transaction), 1)

        // the listener echoes the transaction to the other client: the SDK
        // extracts the patch operations into a `remote-patches` event (which
        // the plugin scopes to the field) and updates its document state
        let ptePatches: PtePatch[] | null
        try {
          ptePatches = scopeRemotePatches(transaction.ops, FIELD)
        } catch {
          ptePatches = null
        }
        if (ptePatches && ptePatches.length > 0) {
          other.patchSubscriber?.(ptePatches)
        }
        other.valueSubscriber?.()
        client.valueSubscriber?.()
      },
    })
  }

  function createStore(index: 0 | 1) {
    const client = clients[index]
    return {
      getRemoteValue: () => fieldValue(localDocument(client)),
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
      // the whole-value fallback: the SDK diffs the new field value against
      // the client's local document, producing granular operations
      pushValue: vi.fn((newValue: PortableTextBlock[]) => {
        const doc = localDocument(client)
        const ops = diffValue(doc, {
          ...(doc as {[key: string]: unknown}),
          [FIELD]: newValue,
        })
        if (ops.length > 0) {
          queueTransaction(index, ops)
        }
      }),
      // the patch channel: editor patches convert to Sanity operations
      // rooted at the field; a conversion error propagates so the plugin
      // falls back to pushing the whole value
      pushPatches: vi.fn((patches: PtePatch[]) => {
        queueTransaction(
          index,
          convertPatchesToSanity(patches, {
            prefix: FIELD,
          }) as SanityPatchOperations[],
        )
      }),
    }
  }

  return {
    storeA: createStore(0),
    storeB: createStore(1),
    getServerValue: () => fieldValue(serverDocument),
    hasPendingDeliveries: () => deliveries.length > 0,
    deliverClient: (index: 0 | 1) => {
      // deliver the transactions this client has queued so far, in order
      const queued = deliveries.filter((entry) => entry.client === index)
      for (const entry of queued) {
        deliveries.splice(deliveries.indexOf(entry), 1)
        entry.run()
      }
    },
    deliverAll: () => {
      while (deliveries.length > 0) {
        deliveries.shift()!.run()
      }
    },
  }
}

type Server = ReturnType<typeof createContentLakeServer>
type Store = Server['storeA']

// ---------------------------------------------------------------------------
// Portable Text validity (the corruption signal)
// ---------------------------------------------------------------------------

const DECORATORS = ['strong', 'em']

function validatePortableText(blocks: unknown): string[] {
  const problems: string[] = []
  if (!Array.isArray(blocks)) {
    return ['value is not an array']
  }
  for (const block of blocks as Array<{
    _type?: string
    markDefs?: Array<{_key?: string; _type?: string}>
    children?: Array<{
      _type?: string
      children?: unknown
      marks?: string[]
    }>
  }>) {
    if (!block || typeof block !== 'object') {
      problems.push('non-object block')
      continue
    }
    if (block._type !== 'block') {
      continue
    }
    const markDefKeys = new Set(
      (block.markDefs ?? []).map((def) => def && def._key),
    )
    for (const def of block.markDefs ?? []) {
      if (def && def._type && def._type !== 'link') {
        problems.push(`markDef _type "${def._type}" (expected link)`)
      }
    }
    for (const child of block.children ?? []) {
      if (!child || typeof child !== 'object') {
        problems.push('non-object child')
        continue
      }
      if (child._type === 'link') {
        problems.push('inline _type:"link" child')
      }
      if (child._type === 'span') {
        if (Array.isArray(child.children)) {
          problems.push('span has children[]')
        }
        for (const mark of child.marks ?? []) {
          if (!DECORATORS.includes(mark) && !markDefKeys.has(mark)) {
            problems.push(`orphan mark "${mark}" (no markDef)`)
          }
        }
      }
    }
  }
  return [...new Set(problems)]
}

function textOf(blocks: PortableTextBlock[] | undefined): string {
  return (blocks ?? [])
    .map((block) =>
      Array.isArray((block as {children?: unknown}).children)
        ? (block as {children: Array<{text?: string}>}).children
            .map((child) => child.text ?? '')
            .join('')
        : '',
    )
    .join('\n')
}

// ---------------------------------------------------------------------------
// Selection helpers (offsets survive span splits by walking children)
// ---------------------------------------------------------------------------

function blockAt(
  editor: Editor,
  index: number,
): {_key: string; children: Array<{_key: string; text?: string}>} | undefined {
  const value = editor.getSnapshot().context.value
  if (!Array.isArray(value) || value.length <= index) {
    return undefined
  }
  const block = value[index] as unknown as {
    _key: string
    children?: Array<{_key: string; text?: string}>
  }
  if (!block || !Array.isArray(block.children) || block.children.length === 0) {
    return undefined
  }
  return block as {_key: string; children: Array<{_key: string; text?: string}>}
}

function pointInBlock(
  block: {children: Array<{_key: string; text?: string}>},
  globalOffset: number,
): {key: string; offset: number} {
  let acc = 0
  for (const child of block.children) {
    const length = (child.text ?? '').length
    if (globalOffset <= acc + length) {
      return {key: child._key, offset: globalOffset - acc}
    }
    acc += length
  }
  const last = block.children[block.children.length - 1]
  return {key: last._key, offset: (last.text ?? '').length}
}

function rangeInBlock(
  editor: Editor,
  blockIndex: number,
  from: number,
  to: number,
): EditorSelection {
  const block = blockAt(editor, blockIndex)
  if (!block) {
    return null
  }
  const anchor = pointInBlock(block, from)
  const focus = pointInBlock(block, to)
  return {
    anchor: {
      path: [{_key: block._key}, 'children', {_key: anchor.key}],
      offset: anchor.offset,
    },
    focus: {
      path: [{_key: block._key}, 'children', {_key: focus.key}],
      offset: focus.offset,
    },
  }
}

function caretInBlock(
  editor: Editor,
  blockIndex: number,
  offset: number,
): EditorSelection {
  return rangeInBlock(editor, blockIndex, offset, offset)
}

function caretAtBlockEnd(editor: Editor, blockIndex: number): EditorSelection {
  const block = blockAt(editor, blockIndex)
  if (!block) {
    return null
  }
  const length = block.children.reduce(
    (sum, child) => sum + (child.text ?? '').length,
    0,
  )
  return caretInBlock(editor, blockIndex, length)
}

function typeAt(editor: Editor, at: EditorSelection, text: string) {
  if (!at) {
    return
  }
  editor.send({type: 'select', at})
  editor.send({type: 'insert.text', text})
}

// ---------------------------------------------------------------------------
// Seeds
// ---------------------------------------------------------------------------

const seedSingle = (): PortableTextBlock[] => [
  {
    _type: 'block',
    _key: 'b1',
    style: 'normal',
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: 's1',
        text: 'The quick brown fox jumps over the lazy dog',
        marks: [],
      },
    ],
  },
]

const seedTwoBlocks = (): PortableTextBlock[] => [
  ...seedSingle(),
  {
    _type: 'block',
    _key: 'b2',
    style: 'normal',
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: 's3',
        text: 'Pack my box with five dozen liquor jugs',
        marks: [],
      },
    ],
  },
]

// two spans with different marks so normalization keeps them separate
const seedTwoSpans = (): PortableTextBlock[] => [
  {
    _type: 'block',
    _key: 'b1',
    style: 'normal',
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: 's1',
        text: 'The quick brown fox ',
        marks: ['strong'],
      },
      {
        _type: 'span',
        _key: 's2',
        text: 'jumps over the lazy dog',
        marks: [],
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Scenarios (ported from the Playwright harness)
// ---------------------------------------------------------------------------

const MARK_A = '{A}0'
const MARK_B = '{B}0'

type Role = 'A' | 'B'

interface CollisionScenario {
  id: string
  title: string
  kind: 'type' | 'format'
  seed: () => PortableTextBlock[]
  markers?: Partial<Record<Role, string>>
  run: (editor: Editor, role: Role) => void
}

const SCENARIOS: CollisionScenario[] = [
  {
    id: 'disjoint-blocks',
    title: 'typing in different blocks',
    kind: 'type',
    seed: seedTwoBlocks,
    markers: {A: MARK_A, B: MARK_B},
    run: (editor, role) => {
      const blockIndex = role === 'A' ? 0 : 1
      const marker = role === 'A' ? MARK_A : MARK_B
      typeAt(editor, caretAtBlockEnd(editor, blockIndex), ` ${marker}`)
    },
  },
  {
    id: 'disjoint-spans',
    title: 'typing in different spans of the same block',
    kind: 'type',
    seed: seedTwoSpans,
    markers: {A: MARK_A, B: MARK_B},
    run: (editor, role) => {
      if (role === 'A') {
        typeAt(editor, caretInBlock(editor, 0, 4), MARK_A)
      } else {
        typeAt(editor, caretAtBlockEnd(editor, 0), MARK_B)
      }
    },
  },
  {
    id: 'same-span-ends',
    title: 'typing at both ends of the same span',
    kind: 'type',
    seed: seedSingle,
    markers: {A: MARK_A, B: MARK_B},
    run: (editor, role) => {
      if (role === 'A') {
        typeAt(editor, caretInBlock(editor, 0, 0), MARK_A)
      } else {
        typeAt(editor, caretAtBlockEnd(editor, 0), MARK_B)
      }
    },
  },
  {
    id: 'same-caret',
    title: 'typing at the same caret',
    kind: 'type',
    seed: seedSingle,
    markers: {A: MARK_A, B: MARK_B},
    run: (editor, role) => {
      const marker = role === 'A' ? MARK_A : MARK_B
      typeAt(editor, caretInBlock(editor, 0, 4), marker)
    },
  },
  {
    id: 'bold-same-range',
    title: 'bolding the same range',
    kind: 'format',
    seed: seedSingle,
    run: (editor) => {
      const at = rangeInBlock(editor, 0, 0, 9)
      if (!at) {
        return
      }
      editor.send({type: 'select', at})
      editor.send({type: 'decorator.toggle', decorator: 'strong', at})
    },
  },
  {
    id: 'bold-overlap-range',
    title: 'bolding overlapping ranges',
    kind: 'format',
    seed: seedSingle,
    run: (editor, role) => {
      const at =
        role === 'A'
          ? rangeInBlock(editor, 0, 0, 15)
          : rangeInBlock(editor, 0, 8, 25)
      if (!at) {
        return
      }
      editor.send({type: 'select', at})
      editor.send({type: 'decorator.toggle', decorator: 'strong', at})
    },
  },
  {
    id: 'link-same-range',
    title: 'linking the same range',
    kind: 'format',
    seed: seedSingle,
    run: (editor, role) => {
      const at = rangeInBlock(editor, 0, 0, 9)
      if (!at) {
        return
      }
      editor.send({type: 'select', at})
      editor.send({
        type: 'annotation.toggle',
        annotation: {
          name: 'link',
          value: {href: `https://${role.toLowerCase()}.example/`},
        },
        at,
      })
    },
  },
  {
    id: 'link-overlap-range',
    title: 'linking overlapping ranges',
    kind: 'format',
    seed: seedSingle,
    run: (editor, role) => {
      const at =
        role === 'A'
          ? rangeInBlock(editor, 0, 0, 15)
          : rangeInBlock(editor, 0, 8, 25)
      if (!at) {
        return
      }
      editor.send({type: 'select', at})
      editor.send({
        type: 'annotation.toggle',
        annotation: {
          name: 'link',
          value: {href: `https://${role.toLowerCase()}.example/`},
        },
        at,
      })
    },
  },
  {
    id: 'block-split',
    title: 'concurrent block split (Enter at different offsets)',
    kind: 'format',
    seed: seedSingle,
    run: (editor, role) => {
      const at =
        role === 'A' ? caretInBlock(editor, 0, 10) : caretInBlock(editor, 0, 25)
      if (!at) {
        return
      }
      editor.send({type: 'select', at})
      editor.send({type: 'insert.break'})
    },
  },
  {
    id: 'delete-overlap',
    title: 'deleting overlapping ranges',
    kind: 'format',
    seed: seedSingle,
    run: (editor, role) => {
      const at =
        role === 'A'
          ? rangeInBlock(editor, 0, 0, 15)
          : rangeInBlock(editor, 0, 8, 25)
      if (!at) {
        return
      }
      editor.send({type: 'select', at})
      editor.send({type: 'delete', at})
    },
  },
  {
    id: 'format-vs-type',
    title: 'formatting while the other client types in the same span',
    kind: 'type',
    seed: seedSingle,
    markers: {B: MARK_B},
    run: (editor, role) => {
      if (role === 'A') {
        const at = rangeInBlock(editor, 0, 0, 9)
        if (!at) {
          return
        }
        editor.send({type: 'select', at})
        editor.send({type: 'decorator.toggle', decorator: 'strong', at})
      } else {
        typeAt(editor, caretAtBlockEnd(editor, 0), ` ${MARK_B}`)
      }
    },
  },
  {
    id: 'disjoint-blocks-format',
    title: 'formatting in different blocks',
    kind: 'format',
    seed: seedTwoBlocks,
    run: (editor, role) => {
      const blockIndex = role === 'A' ? 0 : 1
      const at = rangeInBlock(editor, blockIndex, 0, 9)
      if (!at) {
        return
      }
      editor.send({type: 'select', at})
      editor.send({type: 'decorator.toggle', decorator: 'strong', at})
    },
  },
]

// ---------------------------------------------------------------------------
// Rig
// ---------------------------------------------------------------------------

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

async function waitForPush(store: Store) {
  await vi.waitFor(
    () => {
      expect(
        store.pushPatches.mock.calls.length + store.pushValue.mock.calls.length,
      ).toBeGreaterThan(0)
    },
    {timeout: 5000, interval: 50},
  )
}

async function collideAndSettle(options: {
  server: Server
  editorA: Editor
  editorB: Editor
  first: 0 | 1
}) {
  const {server, editorA, editorB, first} = options

  // deliver the colliding transactions in the enumerated order, then let
  // repair pushes drain first-in-first-out until everything converges
  server.deliverClient(first)
  server.deliverClient(first === 0 ? 1 : 0)

  await vi.waitFor(
    () => {
      server.deliverAll()
      expect(server.hasPendingDeliveries()).toBe(false)
      expect(editorA.getSnapshot().context.value).toEqual(
        server.getServerValue(),
      )
      expect(editorB.getSnapshot().context.value).toEqual(
        server.getServerValue(),
      )
    },
    {timeout: 10000, interval: 100},
  )
}

// ---------------------------------------------------------------------------
// The matrix
// ---------------------------------------------------------------------------

/**
 * Known limitation, not a regression gate: when a client's span split
 * (formatting) commits before another client's text append into the same
 * span, the append's diff-match-patch hunk no longer matches either half
 * at the server and is dropped. Recovering the text would need operational
 * rebase of the in-flight patch (what `@sanity/mutate` does in the
 * Studio). The combo must still converge to valid Portable Text; only the
 * marker-survival assertion is relaxed.
 */
const KNOWN_MARKER_LOSS: Array<{
  scenario: string
  first: 0 | 1
  marker: Role
}> = [{scenario: 'format-vs-type', first: 0, marker: 'B'}]

describe('collision matrix', () => {
  let cleanup: (() => void) | undefined
  let consoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // concurrent edits legitimately log caught engine errors during the
    // divergence window; crashes surface as uncaught errors and fail the
    // test regardless
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup?.()
    cleanup = undefined
    consoleError.mockRestore()
  })

  const orderings: Array<{label: string; first: 0 | 1}> = [
    {label: 'A delivered first', first: 0},
    {label: 'B delivered first', first: 1},
  ]

  for (const scenario of SCENARIOS) {
    for (const ordering of orderings) {
      test(`${scenario.id}: ${scenario.title} (${ordering.label})`, async () => {
        const server = createContentLakeServer(scenario.seed())
        const {editorA, editorB, locatorA, locatorB, unmount} =
          await renderTwoClients(server)
        cleanup = unmount

        await locatorA.click()
        scenario.run(editorA, 'A')
        await locatorB.click()
        scenario.run(editorB, 'B')

        await waitForPush(server.storeA)
        await waitForPush(server.storeB)

        await collideAndSettle({
          server,
          editorA,
          editorB,
          first: ordering.first,
        })

        const serverBlocks = server.getServerValue()
        expect(validatePortableText(serverBlocks)).toEqual([])

        const isKnownLoss = (marker: Role) =>
          KNOWN_MARKER_LOSS.some(
            (entry) =>
              entry.scenario === scenario.id &&
              entry.first === ordering.first &&
              entry.marker === marker,
          )

        if (scenario.markers?.A && !isKnownLoss('A')) {
          expect(textOf(serverBlocks)).toContain(scenario.markers.A)
        }
        if (scenario.markers?.B && !isKnownLoss('B')) {
          expect(textOf(serverBlocks)).toContain(scenario.markers.B)
        }
      })
    }
  }
})

/**
 * Regression rig for the `annotation.remove` stack overflow: repeated rounds
 * of overlapping links with remote patches delivered between rounds, without
 * waiting for the editors to converge. Before the guard fix in
 * `preventOverlappingAnnotations`, this class of interleaving could drive an
 * editor into an unbounded remove-then-re-add raise loop that overflowed the
 * call stack and left the editor blank.
 */
describe('multi-round link overlap', () => {
  let cleanup: (() => void) | undefined
  let consoleErrors: Array<string> = []
  let consoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrors = []
    consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation((...args: Array<unknown>) => {
        consoleErrors.push(
          args
            .map((arg) => (arg instanceof Error ? arg.message : String(arg)))
            .join(' '),
        )
      })
  })

  afterEach(() => {
    cleanup?.()
    cleanup = undefined
    consoleError.mockRestore()
  })

  const orderings: Array<{label: string; first: 0 | 1}> = [
    {label: 'A delivered first', first: 0},
    {label: 'B delivered first', first: 1},
  ]

  function pushCount(store: Store) {
    return (
      store.pushPatches.mock.calls.length + store.pushValue.mock.calls.length
    )
  }

  async function waitForNewPush(store: Store, baseline: number) {
    await vi.waitFor(
      () => {
        expect(pushCount(store)).toBeGreaterThan(baseline)
      },
      {timeout: 5000, interval: 25},
    )
  }

  for (const ordering of orderings) {
    test(`three rounds of overlapping links without convergence waits (${ordering.label})`, async () => {
      const server = createContentLakeServer(seedSingle())
      const {editorA, editorB, locatorA, locatorB, unmount} =
        await renderTwoClients(server)
      cleanup = unmount

      const linkRound = (editor: Editor, role: Role) => {
        const at =
          role === 'A'
            ? rangeInBlock(editor, 0, 0, 15)
            : rangeInBlock(editor, 0, 8, 25)
        if (!at) {
          return
        }
        editor.send({type: 'select', at})
        editor.send({
          type: 'annotation.toggle',
          annotation: {
            name: 'link',
            value: {href: `https://${role.toLowerCase()}.example/`},
          },
          at,
        })
      }

      for (let round = 0; round < 3; round++) {
        const baselineA = pushCount(server.storeA)
        const baselineB = pushCount(server.storeB)

        await locatorA.click()
        linkRound(editorA, 'A')
        await locatorB.click()
        linkRound(editorB, 'B')

        await waitForNewPush(server.storeA, baselineA)
        await waitForNewPush(server.storeB, baselineB)

        // Deliver both clients' queued transactions so remote patches reach
        // the other editor mid-flight, then start the next round without
        // waiting for convergence
        server.deliverClient(ordering.first)
        server.deliverClient(ordering.first === 0 ? 1 : 0)
      }

      await vi.waitFor(
        () => {
          server.deliverAll()
          expect(server.hasPendingDeliveries()).toBe(false)

          // Known limitation, not a regression gate: repeated concurrent
          // link toggles can leave duplicate markDef entries (same `_key`,
          // same fields) in the server document. Editors adopt the
          // duplicates as the document has them (dedupe is cosmetic
          // housekeeping that only runs as fallout of local edits), so
          // both editors converge on the server value verbatim.
          const serverValue = server.getServerValue()
          expect(editorA.getSnapshot().context.value).toEqual(serverValue)
          expect(editorB.getSnapshot().context.value).toEqual(serverValue)
        },
        {timeout: 10000, interval: 100},
      )

      expect(
        consoleErrors.filter((message) =>
          message.includes('Maximum call stack'),
        ),
      ).toEqual([])
      expect(validatePortableText(server.getServerValue())).toEqual([])
    })
  }
})
