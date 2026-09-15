import type {Patch} from '@portabletext/patches'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import {
  emitOperationEvent,
  type OperationEvent,
} from '../engine/core/operation-channel'
import {createEditor} from '../engine/create-editor'
import type {EngineOperation} from '../engine/interfaces/operation'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {EditorActor} from './editor-machine'
import {createMutationBatcher} from './mutation-batcher'
import {createMutationLedger} from './mutation-ledger'
import {createRelay} from './relay'

const FLUSH_INTERVAL = 500
const TYPE_DEBOUNCE = 250
const ACK_TIMEOUT = 3000

function createTestHarness({readOnly = false}: {readOnly?: boolean} = {}) {
  const editorEngine = createEditor() as PortableTextEditorEngine
  editorEngine.isDeferringMutations = false
  editorEngine.mutationLedger = createMutationLedger()

  let isReadOnly = readOnly
  let patchListener:
    | ((event: {
        patch: Patch
        operationId?: string
        value: Array<never>
      }) => void)
    | undefined
  const mutationSends: Array<{patches: Array<Patch>}> = []

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
      }) => void,
    ) => {
      patchListener = listener
      return {unsubscribe: () => {}}
    },
    send: (event: {type: 'mutation'; patches: Array<Patch>}) => {
      mutationSends.push({patches: event.patches})
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
    relayedPatches,
    unsubscribe,
    sendPatch: (patch: Patch, operationId?: string) => {
      patchListener?.({patch, operationId, value: []})
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

  test('keeps the fire-and-forget cadence for a host that never echoes', () => {
    const harness = createTestHarness()

    harness.sendPatch(createPatch('a'), 'op-1')
    vi.advanceTimersByTime(FLUSH_INTERVAL)

    harness.sendPatch(createPatch('b'), 'op-2')
    vi.advanceTimersByTime(FLUSH_INTERVAL)

    // `a` was never acknowledged, but without a proven echo channel the
    // gate stays inactive.
    expect(harness.mutationSends).toEqual([
      {patches: [createPatch('a')]},
      {patches: [createPatch('b')]},
    ])
  })

  test('holds the next batch until the previous one is echoed, once the host has echoed', () => {
    const harness = createTestHarness()

    harness.sendPatch(createPatch('a'), 'op-1')
    vi.advanceTimersByTime(FLUSH_INTERVAL)
    expect(
      harness.editorEngine.mutationLedger.acknowledge(createPatch('a')),
    ).toBe(true)

    harness.sendPatch(createPatch('b'), 'op-2')
    vi.advanceTimersByTime(FLUSH_INTERVAL)

    harness.sendPatch(createPatch('c'), 'op-3')
    vi.advanceTimersByTime(FLUSH_INTERVAL)

    // `b` is in flight and unacknowledged, so `c` holds.
    expect(harness.mutationSends).toEqual([
      {patches: [createPatch('a')]},
      {patches: [createPatch('b')]},
    ])

    // The echo drains the backlog and flushes the gated batch eagerly,
    // without waiting for the next interval tick.
    harness.editorEngine.mutationLedger.acknowledge(createPatch('b'))

    expect(harness.mutationSends).toEqual([
      {patches: [createPatch('a')]},
      {patches: [createPatch('b')]},
      {patches: [createPatch('c')]},
    ])
  })

  test('a gated batch degrades to send-anyway after the ack timeout', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const harness = createTestHarness()

    harness.sendPatch(createPatch('a'), 'op-1')
    vi.advanceTimersByTime(FLUSH_INTERVAL)
    harness.editorEngine.mutationLedger.acknowledge(createPatch('a'))

    harness.sendPatch(createPatch('b'), 'op-2')
    vi.advanceTimersByTime(FLUSH_INTERVAL)

    harness.sendPatch(createPatch('c'), 'op-3')
    vi.advanceTimersByTime(FLUSH_INTERVAL)
    expect(harness.mutationSends).toHaveLength(2)

    vi.advanceTimersByTime(ACK_TIMEOUT)

    expect(harness.mutationSends).toEqual([
      {patches: [createPatch('a')]},
      {patches: [createPatch('b')]},
      {patches: [createPatch('c')]},
    ])
    // The timed-out batch's records are dropped: those echoes are not
    // coming, and only the freshly flushed batch remains in flight.
    expect(harness.editorEngine.mutationLedger.unacknowledged()).toEqual([
      createPatch('c'),
    ])
    // The degrade is loud: a broken echo loop must show up in the field.
    expect(consoleWarn).toHaveBeenCalledWith(
      'Mutation patches were not echoed back within the acknowledgment window. The host may have dropped or rewritten them; sending the next mutation without confirmation.',
      [createPatch('b')],
    )
    consoleWarn.mockRestore()
  })

  test('a host that starts echoing mid-session activates the gate without stalling on the pre-echo backlog', () => {
    const harness = createTestHarness()

    harness.sendPatch(createPatch('a'), 'op-1')
    vi.advanceTimersByTime(FLUSH_INTERVAL)

    harness.sendPatch(createPatch('b'), 'op-2')
    vi.advanceTimersByTime(FLUSH_INTERVAL)

    // The first echo ever arrives, for the newest batch: it activates the
    // gate and drops the never-echoed `a` record along the way.
    harness.editorEngine.mutationLedger.acknowledge(createPatch('b'))

    harness.sendPatch(createPatch('c'), 'op-3')
    vi.advanceTimersByTime(FLUSH_INTERVAL)

    expect(harness.mutationSends).toEqual([
      {patches: [createPatch('a')]},
      {patches: [createPatch('b')]},
      {patches: [createPatch('c')]},
    ])
  })

  test('read-only-deferred patch events relay ahead of the ack gate', () => {
    const harness = createTestHarness()

    harness.sendPatch(createPatch('a'), 'op-1')
    vi.advanceTimersByTime(FLUSH_INTERVAL)
    harness.editorEngine.mutationLedger.acknowledge(createPatch('a'))

    harness.sendPatch(createPatch('b'), 'op-2')
    vi.advanceTimersByTime(FLUSH_INTERVAL)

    harness.setReadOnly(true)
    harness.sendPatch(createPatch('c'), 'op-3')
    harness.setReadOnly(false)
    vi.advanceTimersByTime(FLUSH_INTERVAL)

    // The unacknowledged `b` batch holds mutation `c`, but the deferred
    // patch event is informational and must not wait with it.
    expect(harness.relayedPatches).toEqual([
      createPatch('a'),
      createPatch('b'),
      createPatch('c'),
    ])
    expect(harness.mutationSends).toEqual([
      {patches: [createPatch('a')]},
      {patches: [createPatch('b')]},
    ])

    harness.editorEngine.mutationLedger.acknowledge(createPatch('b'))

    expect(harness.mutationSends).toEqual([
      {patches: [createPatch('a')]},
      {patches: [createPatch('b')]},
      {patches: [createPatch('c')]},
    ])
  })

  test('the unsubscribe flush ignores the ack gate', () => {
    const harness = createTestHarness()

    harness.sendPatch(createPatch('a'), 'op-1')
    vi.advanceTimersByTime(FLUSH_INTERVAL)
    harness.editorEngine.mutationLedger.acknowledge(createPatch('a'))

    harness.sendPatch(createPatch('b'), 'op-2')
    vi.advanceTimersByTime(FLUSH_INTERVAL)

    harness.sendPatch(createPatch('c'), 'op-3')
    vi.advanceTimersByTime(FLUSH_INTERVAL)
    expect(harness.mutationSends).toHaveLength(2)

    harness.unsubscribe()

    expect(harness.mutationSends).toEqual([
      {patches: [createPatch('a')]},
      {patches: [createPatch('b')]},
      {patches: [createPatch('c')]},
    ])
  })

  test('records flushed mutation patches in the ledger', () => {
    const harness = createTestHarness()

    harness.sendPatch(createPatch('a'), 'op-1')
    harness.sendPatch(createPatch('b'), 'op-1')

    expect(harness.editorEngine.mutationLedger.unacknowledged()).toEqual([])

    vi.advanceTimersByTime(FLUSH_INTERVAL)

    expect(harness.editorEngine.mutationLedger.unacknowledged()).toEqual([
      createPatch('a'),
      createPatch('b'),
    ])
  })

  test('relays individual patch events immediately while batching mutations', () => {
    const harness = createTestHarness()

    harness.sendPatch(createPatch('a'), 'op-1')

    expect(harness.relayedPatches).toEqual([createPatch('a')])
    expect(harness.mutationSends).toHaveLength(0)
  })

  test('defers patch events and mutations while read-only, flushing once editable', () => {
    const harness = createTestHarness({readOnly: true})

    harness.sendPatch(createPatch('a'), 'op-1')

    expect(harness.relayedPatches).toEqual([])

    vi.advanceTimersByTime(FLUSH_INTERVAL * 3)

    expect(harness.relayedPatches).toEqual([])
    expect(harness.mutationSends).toHaveLength(0)

    harness.setReadOnly(false)
    vi.advanceTimersByTime(FLUSH_INTERVAL)

    expect(harness.relayedPatches).toEqual([createPatch('a')])
    expect(harness.mutationSends).toEqual([{patches: [createPatch('a')]}])
  })

  test('flushes pending mutations on unsubscribe', () => {
    const harness = createTestHarness()

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
