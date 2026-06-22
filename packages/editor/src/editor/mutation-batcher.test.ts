import type {Patch} from '@portabletext/patches'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import {createEditor} from '../engine/create-editor'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {EditorActor} from './editor-machine'
import {createMutationBatcher} from './mutation-batcher'
import {createRelay} from './relay'

const FLUSH_INTERVAL = 500

function createTestHarness({readOnly = false}: {readOnly?: boolean} = {}) {
  const editorEngine = createEditor() as PortableTextEditorEngine
  editorEngine.isDeferringMutations = false

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
  }
}

function createPatch(path: string): Patch {
  return {type: 'set', path: [{_key: path}], value: path, origin: 'local'}
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
})
