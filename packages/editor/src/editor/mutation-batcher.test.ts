import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
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
import {createRelay, type MutationEvent} from './relay'

const FLUSH_INTERVAL = 500
const TYPE_DEBOUNCE = 250

function createTestHarness({readOnly = false}: {readOnly?: boolean} = {}) {
  const editorEngine = createEditor() as PortableTextEditorEngine
  editorEngine.isDeferringMutations = false
  editorEngine.snapshot = {
    context: {value: []},
  } as unknown as PortableTextEditorEngine['snapshot']

  let isReadOnly = readOnly
  let patchListener:
    | ((event: {patch: Patch; operationId?: string}) => void)
    | undefined
  const mutationSends: Array<{patches: Array<Patch>}> = []
  const mutationValues: Array<Array<PortableTextBlock> | undefined> = []

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
      listener: (event: {patch: Patch; operationId?: string}) => void,
    ) => {
      patchListener = listener
      return {unsubscribe: () => {}}
    },
    send: (event: MutationEvent) => {
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
    sendPatch: (patch: Patch, operationId?: string) => {
      patchListener?.({patch, operationId})
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

  test('every mutation of a flush carries the engine value at flush time', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const harness = createTestHarness()

    harness.sendPatch(createPatch('a'), 'op-1')
    harness.sendPatch(createPatch('b'), 'op-2')

    const flushTimeValue: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]
    harness.editorEngine.snapshot.context.value = flushTimeValue

    vi.advanceTimersByTime(FLUSH_INTERVAL)

    expect(harness.mutationValues).toEqual([flushTimeValue, flushTimeValue])
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
