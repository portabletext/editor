import type {Patch} from '@portabletext/patches'
import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import {createActor} from 'xstate'
import {
  emitOperationEvent,
  type OperationEvent,
} from '../engine/core/operation-channel'
import {createEditor} from '../engine/create-editor'
import type {Node} from '../engine/interfaces/node'
import type {EngineOperation} from '../engine/interfaces/operation'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {EditorActor} from './editor-machine'
import {createMutationBatcher} from './mutation-batcher'
import {createRelay} from './relay'
import {syncMachine} from './sync-machine'

const FLUSH_INTERVAL = 500
const TYPE_DEBOUNCE = 250

function createTestHarness({readOnly = false}: {readOnly?: boolean} = {}) {
  const editorEngine = createEditor() as PortableTextEditorEngine
  editorEngine.isDeferringMutations = false
  // `flush` reads `editorEngine.snapshot.context.value`; the bare engine `createEditor`
  // returns has no `snapshot` (only `editor/create-editor.ts` wires one up).
  editorEngine.snapshot = {
    blockIndexMap: new Map(),
    context: {value: []},
    decoratorState: {},
  } as unknown as PortableTextEditorEngine['snapshot']

  let isReadOnly = readOnly
  let patchListener:
    | ((event: {
        patch: Patch
        operationId?: string
        value: Array<never>
        intakeRepair: boolean
      }) => void)
    | undefined
  const mutationSends: Array<{patches: Array<Patch>}> = []
  const mutationValues: Array<unknown> = []

  const editorActor = {
    getSnapshot: () => ({
      matches: (stateValue: unknown) => {
        const isReadOnlySelector =
          typeof stateValue === 'object' &&
          stateValue !== null &&
          'edit mode' in stateValue &&
          (stateValue as Record<string, unknown>)['edit mode'] === 'read only'

        if (!isReadOnlySelector) {
          // Only answer for the selector the batcher is expected to read,
          // so a change to the batcher's read-only lookup fails these
          // tests.
          throw new Error('Unexpected state selector passed to `matches`')
        }
        return isReadOnly
      },
    }),
    on: (
      _type: 'internal.patch',
      listener: (event: {
        patch: Patch
        operationId?: string
        value: Array<never>
        intakeRepair: boolean
      }) => void,
    ) => {
      patchListener = listener
      return {unsubscribe: () => {}}
    },
    send: (event: {
      type: 'mutation'
      patches: Array<Patch>
      value: unknown
    }) => {
      mutationSends.push({patches: event.patches})
      mutationValues.push(event.value)
    },
  } as unknown as EditorActor

  const relay = createRelay()
  relay.start()
  const relayedPatches: Array<Patch> = []
  relay.on('patch', (event) => {
    relayedPatches.push(event.patch)
  })

  const batcher = createMutationBatcher({editorActor, editorEngine, relay})
  const unsubscribe = batcher.subscribe()

  return {
    editorEngine,
    mutationSends,
    mutationValues,
    relayedPatches,
    unsubscribe,
    sendPatch: (
      patch: Patch,
      operationId?: string,
      {intakeRepair = false}: {intakeRepair?: boolean} = {},
    ) => {
      patchListener?.({patch, operationId, value: [], intakeRepair})
    },
    setReadOnly: (value: boolean) => {
      isReadOnly = value
    },
    sendOperation: (operation: EngineOperation) => {
      emitOperationEvent(
        editorEngine.operationListeners.before,
        createOperationEvent(operation),
      )
    },
  }
}

function createPatch(path: string): Patch {
  return {type: 'set', path: [{_key: path}], value: path, origin: 'local'}
}

// A numeric first path segment resolves to a block key only by indexing into
// the bulk's own snapshot `value`. The test harness always sends `value: []`,
// so this patch's block key is unresolvable, the same way a repair targeting
// a still-keyless block is unresolvable before the arm that mints its key
// has run.
function createUnkeyedPatch(index: number): Patch {
  return {type: 'set', path: [index], value: index, origin: 'local'}
}

function createOperationEvent(operation: EngineOperation): OperationEvent {
  return {
    operation,
    beforeValue: [],
    beforeSelection: null,
    operationsInProgress: false,
    isPatching: false,
    withHistory: false,
    undoStepId: undefined,
    origin: 'local',
    context: [],
  }
}

function createInsertTextOperation(text: string): EngineOperation {
  return {
    type: 'insert.text',
    path: [{_key: 'b1'}, 'children', {_key: 's1'}],
    offset: 0,
    text,
  }
}

function createSetOperation(): EngineOperation {
  return {type: 'set', path: [{_key: 'b1'}, 'style'], value: 'h1'}
}

describe('mutation batcher', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('merges consecutive patches sharing an operationId into one mutation', () => {
    const harness = createTestHarness()

    harness.sendPatch(createPatch('a'), 'op-1')
    harness.sendPatch(createPatch('b'), 'op-1')
    harness.sendPatch(createPatch('c'), 'op-2')

    expect(harness.editorEngine.isDeferringMutations).toBe(true)
    expect(harness.mutationSends).toHaveLength(0)

    vi.advanceTimersByTime(FLUSH_INTERVAL)

    expect(harness.mutationSends).toEqual([
      {patches: [createPatch('a'), createPatch('b')]},
      {patches: [createPatch('c')]},
    ])
    expect(harness.editorEngine.isDeferringMutations).toBe(false)
  })

  test('a flushed mutation carries the value the engine currently holds, not the value captured when the bulk formed', () => {
    const harness = createTestHarness()

    harness.sendPatch(createPatch('a'), 'op-1')

    const laterValue = [
      {
        _type: 'block',
        _key: 'later',
        style: 'normal',
        markDefs: [],
        children: [],
      },
    ] as unknown as Array<never>
    harness.editorEngine.snapshot.context.value = laterValue

    vi.advanceTimersByTime(FLUSH_INTERVAL)

    expect(harness.mutationValues).toEqual([laterValue])
  })

  test('an intake-repair patch received while editable does not set `isDeferringMutations`', () => {
    const harness = createTestHarness()

    harness.sendPatch(createPatch('a'), 'op-1', {intakeRepair: true})

    expect(harness.editorEngine.isDeferringMutations).toBe(false)

    vi.advanceTimersByTime(FLUSH_INTERVAL)

    expect(harness.mutationSends).toEqual([{patches: [createPatch('a')]}])
  })

  test('an intake-repair bulk is dropped by `dropSupersededRepairs` even though it arrived while editable', () => {
    const harness = createTestHarness()

    harness.editorEngine.notifyInboundSyncStarted?.()
    harness.sendPatch(createPatch('a'), 'op-1', {intakeRepair: true})

    // First inbound settle: the bulk survives its own pass (the
    // current-generation exemption).
    harness.editorEngine.notifyInboundStateApplied?.(new Set())
    // A second pass starts and settles: the bulk is now superseded and
    // dropped.
    harness.editorEngine.notifyInboundSyncStarted?.()
    harness.editorEngine.notifyInboundStateApplied?.(new Set())

    vi.advanceTimersByTime(FLUSH_INTERVAL)

    expect(harness.mutationSends).toEqual([])
  })

  test('a repair bulk minted before a settling pass started is dropped by that pass, not exempted by its generation', () => {
    const harness = createTestHarness()

    // Minted between passes (remote-patch fallout normalization), before
    // any pass has bumped the generation.
    harness.sendPatch(createPatch('a'), undefined, {intakeRepair: true})

    harness.editorEngine.notifyInboundSyncStarted?.()
    // Minted during the pass that's now settling: exempt as the pass's
    // own mint.
    harness.sendPatch(createPatch('b'), undefined, {intakeRepair: true})
    harness.editorEngine.notifyInboundStateApplied?.(new Set())

    vi.advanceTimersByTime(FLUSH_INTERVAL)

    expect(harness.mutationSends).toEqual([{patches: [createPatch('b')]}])
  })

  test('a bulk mixing an intake-repair patch with a real edit still sets `isDeferringMutations` and survives `dropSupersededRepairs`', () => {
    const harness = createTestHarness()

    harness.sendPatch(createPatch('a'), 'op-1', {intakeRepair: true})
    harness.sendPatch(createPatch('b'), 'op-1')

    expect(harness.editorEngine.isDeferringMutations).toBe(true)

    harness.editorEngine.notifyInboundStateApplied?.(new Set())
    harness.editorEngine.notifyInboundStateApplied?.(new Set())

    vi.advanceTimersByTime(FLUSH_INTERVAL)

    expect(harness.mutationSends).toEqual([
      {patches: [createPatch('a'), createPatch('b')]},
    ])
  })

  test('a bulk mixing an intake-repair patch with a real edit survives `dropSupersededRepairs` no matter what the echoed set contains', () => {
    const harness = createTestHarness()

    harness.sendPatch(createPatch('a'), 'op-1', {intakeRepair: true})
    harness.sendPatch(createPatch('b'), 'op-1')

    // Neither settle's echoed set names block `a`: the bulk survives on
    // its user-work patch alone, not on an echo match.
    harness.editorEngine.notifyInboundStateApplied?.(new Set(['unrelated']))
    harness.editorEngine.notifyInboundStateApplied?.(new Set())

    vi.advanceTimersByTime(FLUSH_INTERVAL)

    expect(harness.mutationSends).toEqual([
      {patches: [createPatch('a'), createPatch('b')]},
    ])
  })

  test('intake-repair patches for two different blocks form two separate bulks', () => {
    const harness = createTestHarness()

    harness.sendPatch(createPatch('a'), undefined, {intakeRepair: true})
    harness.sendPatch(createPatch('b'), undefined, {intakeRepair: true})

    vi.advanceTimersByTime(FLUSH_INTERVAL)

    expect(harness.mutationSends).toEqual([
      {patches: [createPatch('a')]},
      {patches: [createPatch('b')]},
    ])
  })

  test('an unresolved-key intake-repair patch followed by a resolved-key one forms two separate bulks', () => {
    const harness = createTestHarness()

    harness.sendPatch(createUnkeyedPatch(0), undefined, {intakeRepair: true})
    harness.sendPatch(createPatch('b'), undefined, {intakeRepair: true})

    vi.advanceTimersByTime(FLUSH_INTERVAL)

    expect(harness.mutationSends).toEqual([
      {patches: [createUnkeyedPatch(0)]},
      {patches: [createPatch('b')]},
    ])
  })

  test('`dropSupersededRepairs` drops a stale keyed bulk while keeping an unresolved-key bulk', () => {
    const harness = createTestHarness()

    harness.sendPatch(createPatch('a'), undefined, {intakeRepair: true})
    harness.sendPatch(createUnkeyedPatch(0), undefined, {intakeRepair: true})

    // A pass starts and settles without echoing block `a`: the keyed bulk
    // is superseded and dropped. The unresolved-key bulk can't be matched
    // against any block in the echoed set, so it survives regardless.
    harness.editorEngine.notifyInboundSyncStarted?.()
    harness.editorEngine.notifyInboundStateApplied?.(new Set())

    vi.advanceTimersByTime(FLUSH_INTERVAL)

    expect(harness.mutationSends).toEqual([{patches: [createUnkeyedPatch(0)]}])
  })

  test('`dropSupersededRepairs` keeps an intake-repair bulk whose block key is in the echoed set and drops the others', () => {
    const harness = createTestHarness()

    harness.editorEngine.notifyInboundSyncStarted?.()
    harness.sendPatch(createPatch('a'), undefined, {intakeRepair: true})
    harness.sendPatch(createPatch('b'), undefined, {intakeRepair: true})

    // First settle: both bulks survive on the current-generation exemption.
    harness.editorEngine.notifyInboundStateApplied?.(new Set())
    // A second pass starts and settles: only `a` is still echoing.
    harness.editorEngine.notifyInboundSyncStarted?.()
    harness.editorEngine.notifyInboundStateApplied?.(new Set(['a']))

    vi.advanceTimersByTime(FLUSH_INTERVAL)

    expect(harness.mutationSends).toEqual([{patches: [createPatch('a')]}])
  })

  test('relays individual patch events immediately while batching mutations', () => {
    const harness = createTestHarness()

    harness.sendPatch(createPatch('a'), 'op-1')

    expect(harness.relayedPatches).toEqual([createPatch('a')])
    expect(harness.mutationSends).toHaveLength(0)
  })

  test('relays patch events immediately even while read-only, holding the mutation until editable', () => {
    const harness = createTestHarness({readOnly: true})

    harness.sendPatch(createPatch('a'), 'op-1')

    expect(harness.relayedPatches).toEqual([createPatch('a')])

    vi.advanceTimersByTime(FLUSH_INTERVAL * 3)

    expect(harness.mutationSends).toHaveLength(0)

    harness.setReadOnly(false)
    vi.advanceTimersByTime(FLUSH_INTERVAL)

    expect(harness.mutationSends).toEqual([{patches: [createPatch('a')]}])
  })

  test('flushes pending mutations on unsubscribe', () => {
    const harness = createTestHarness()

    harness.sendPatch(createPatch('a'), 'op-1')
    harness.unsubscribe()

    expect(harness.mutationSends).toEqual([{patches: [createPatch('a')]}])
  })

  test('flushes pending mutations on unsubscribe even while read-only', () => {
    const harness = createTestHarness({readOnly: true})

    harness.sendPatch(createPatch('a'), 'op-1')
    harness.unsubscribe()

    expect(harness.mutationSends).toEqual([{patches: [createPatch('a')]}])
  })

  test('defers mutations while normalization is suspended, flushing once it resumes', () => {
    const harness = createTestHarness()

    harness.editorEngine.normalizing = false
    harness.sendPatch(createPatch('a'), 'op-1')

    vi.advanceTimersByTime(FLUSH_INTERVAL * 3)

    expect(harness.mutationSends).toHaveLength(0)
    expect(harness.editorEngine.isDeferringMutations).toBe(true)

    harness.editorEngine.normalizing = true
    vi.advanceTimersByTime(FLUSH_INTERVAL)

    expect(harness.mutationSends).toEqual([{patches: [createPatch('a')]}])
    expect(harness.editorEngine.isDeferringMutations).toBe(false)
  })

  test('merges a typing burst into one mutation and flushes at the last op plus the type debounce', () => {
    const harness = createTestHarness()

    harness.sendOperation(createInsertTextOperation('a'))
    harness.sendPatch(createPatch('a'), 'op-1')

    vi.advanceTimersByTime(100)

    harness.sendOperation(createInsertTextOperation('b'))
    harness.sendPatch(createPatch('b'), 'op-1')

    // The first op's debounce would have fired here had the second op not
    // reset it: still nothing flushed, so the burst didn't split per-op.
    vi.advanceTimersByTime(TYPE_DEBOUNCE - 100)
    expect(harness.mutationSends).toHaveLength(0)

    // The second op's own debounce fires 250ms after it, not the interval
    // (500ms, not yet reached).
    vi.advanceTimersByTime(100)
    expect(harness.mutationSends).toEqual([
      {patches: [createPatch('a'), createPatch('b')]},
    ])
  })

  test('clears the flush interval once dropping superseded repairs empties the queue', () => {
    const harness = createTestHarness({readOnly: true})

    harness.editorEngine.notifyInboundSyncStarted?.()
    harness.sendPatch(createPatch('a'), 'op-1', {intakeRepair: true})

    // First inbound settle: the bulk survives its own pass (the
    // current-generation exemption).
    harness.editorEngine.notifyInboundStateApplied?.(new Set())
    // A second pass starts and settles: the bulk is now superseded and
    // dropped, leaving the queue empty.
    harness.editorEngine.notifyInboundSyncStarted?.()
    harness.editorEngine.notifyInboundStateApplied?.(new Set())

    vi.advanceTimersByTime(FLUSH_INTERVAL)

    expect(vi.getTimerCount()).toBe(0)
    expect(harness.mutationSends).toEqual([])
  })

  test('a non-repair patch received while read-only is never dropped by the cull', () => {
    const harness = createTestHarness({readOnly: true})

    harness.sendPatch(createPatch('a'), 'op-1')

    // A settled value-sync pass starting and ending after the read-only
    // patch was received: under the old read-only-at-receipt
    // classification this would look exactly like a superseded repair
    // (no generation match, no echoed block key) and get dropped.
    harness.editorEngine.notifyInboundSyncStarted?.()
    harness.editorEngine.notifyInboundStateApplied?.(new Set())

    harness.setReadOnly(false)
    vi.advanceTimersByTime(FLUSH_INTERVAL)

    expect(harness.mutationSends).toEqual([{patches: [createPatch('a')]}])
  })

  test('an intake-repair bulk for a block that keeps echoing survives repeated `dropSupersededRepairs` calls and flushes once editable', () => {
    const harness = createTestHarness({readOnly: true})
    const keyGenerator = createTestKeyGenerator()
    const schema = compileSchema(defineSchema({}))
    const blockKey = keyGenerator()

    const beforeShape: Node = {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', text: '', marks: []} as unknown as Node],
    }
    const afterShape: Node = {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k2', text: '', marks: []}],
    }

    harness.editorEngine.containers = new Map()
    harness.editorEngine.blockIndexMap = new Map()
    harness.editorEngine.verifiedUniqueChildGroups = new Set()
    harness.editorEngine.repairJournal = new Map([
      [blockKey, {beforeShape, afterShape}],
    ])
    harness.editorEngine.snapshot = {
      blockIndexMap: harness.editorEngine.blockIndexMap,
      context: {
        containers: new Map(),
        converters: [],
        keyGenerator,
        readOnly: true,
        schema,
        selection: null,
        value: [afterShape as unknown as never],
      },
      decoratorState: {},
    } as PortableTextEditorEngine['snapshot']

    // The intake repair itself, held because the editor is read-only.
    // Its path targets `blockKey` directly, the same block the journal
    // below keeps echoing.
    harness.sendPatch(createPatch(blockKey), 'op-1', {intakeRepair: true})

    // Wired exactly like `create-editor.ts`'s one-line glue: every pass
    // start bumps the batcher's generation, and every settle tells the
    // batcher an inbound state applied, carrying the pass's
    // echoed-block-keys set.
    const syncActor = createActor(syncMachine, {
      input: {
        initialValue: undefined,
        keyGenerator,
        schema,
        editorEngine: harness.editorEngine,
      },
    })
    syncActor.on('inbound sync started', () => {
      harness.editorEngine.notifyInboundSyncStarted?.()
    })
    syncActor.on('inbound state applied', (event) => {
      harness.editorEngine.notifyInboundStateApplied?.(event.echoedBlockKeys)
    })
    syncActor.start()

    // Two stale echoes of the pre-repair shape, each paired with a
    // different well-formed control block so the machine treats every
    // send as a new value instead of no-opping. The journal recognizes
    // `blockKey`'s echo both times, so both settles report it in their
    // echoed-block-keys set and `dropSupersededRepairs` keeps the bulk on
    // that echo match: the repair was minted before this test's first
    // pass even started, so it never qualifies for the current-generation
    // exemption at all.
    syncActor.send({
      type: 'update value',
      value: [
        beforeShape as unknown as never,
        {
          _type: 'block',
          _key: 'control-a',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'ca0', text: 'a', marks: []}],
        } as unknown as never,
      ],
    })
    syncActor.send({
      type: 'update value',
      value: [
        beforeShape as unknown as never,
        {
          _type: 'block',
          _key: 'control-b',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'cb0', text: 'b', marks: []}],
        } as unknown as never,
      ],
    })

    vi.advanceTimersByTime(FLUSH_INTERVAL * 3)

    expect(harness.mutationSends).toHaveLength(0)

    harness.setReadOnly(false)
    vi.advanceTimersByTime(FLUSH_INTERVAL)

    expect(harness.mutationSends).toEqual([{patches: [createPatch(blockKey)]}])
  })

  test('a non-typing operation flushes eagerly, ending an in-progress typing session', () => {
    const harness = createTestHarness()

    harness.sendOperation(createInsertTextOperation('a'))
    harness.sendPatch(createPatch('a'), 'op-1')

    vi.advanceTimersByTime(50)

    harness.sendOperation(createSetOperation())

    // Flushed synchronously by the non-typing operation, well before the
    // type debounce (250ms) or the flush interval (500ms) would fire.
    expect(harness.mutationSends).toEqual([{patches: [createPatch('a')]}])
  })
})
