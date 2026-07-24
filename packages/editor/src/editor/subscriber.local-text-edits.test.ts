import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import type {
  OperationEvent,
  OperationOrigin,
} from '../engine/core/operation-channel'
import type {EngineOperation} from '../engine/interfaces/operation'
import {
  getPendingLocalTextEditsKey,
  PENDING_LOCAL_TEXT_EDIT_MAX_AGE_MS,
} from '../internal-utils/pending-local-text-edits'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {EditorActor} from './editor-machine'
import {subscribeLocalTextEdits} from './subscriber.local-text-edits'

const spanPath = [{_key: 'block'}, 'children', {_key: 'span'}] as const

describe(subscribeLocalTextEdits.name, () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test.each([
    'local',
    'normalization',
    'undo',
    'redo',
  ] satisfies Array<OperationOrigin>)(
    'captures the first base for %s text operations',
    (origin) => {
      const harness = createHarness()

      harness.emitOperation(
        {
          type: 'insert.text',
          path: [...spanPath],
          offset: 1,
          text: 'X',
        },
        origin,
        createValue('abc'),
      )
      vi.setSystemTime(50)
      harness.emitOperation(
        {
          type: 'insert.text',
          path: [...spanPath],
          offset: 2,
          text: 'Y',
        },
        origin,
        createValue('aXbc'),
      )

      expect(
        harness.editor.pendingLocalTextEdits.get(
          getPendingLocalTextEditsKey(spanPath),
        ),
      ).toEqual({
        path: [...spanPath],
        baseText: 'abc',
        lastEditTime: 50,
      })

      harness.unsubscribe()
    },
  )

  test('ignores remote text operations', () => {
    const harness = createHarness()

    harness.emitOperation(
      {
        type: 'insert.text',
        path: [...spanPath],
        offset: 1,
        text: 'X',
      },
      'remote',
      createValue('abc'),
    )

    expect(harness.editor.pendingLocalTextEdits.size).toBe(0)
    harness.unsubscribe()
  })

  test('invalidates a base when its span is replaced', () => {
    const harness = createHarness()
    harness.emitLocalTextOperation()

    harness.emitOperation(
      {type: 'set', path: [...spanPath], value: createSpan('replacement')},
      'remote',
      createValue('abc'),
    )

    expect(harness.editor.pendingLocalTextEdits.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    harness.unsubscribe()
  })

  test('keeps a base when an unrelated span changes', () => {
    const harness = createHarness()
    harness.emitLocalTextOperation()

    harness.emitOperation(
      {
        type: 'unset',
        path: [{_key: 'block'}, 'children', {_key: 'other-span'}],
      },
      'remote',
      createValue('abc'),
    )

    expect(harness.editor.pendingLocalTextEdits.size).toBe(1)
    harness.unsubscribe()
  })

  test('clears all bases for a root replacement patch', () => {
    const harness = createHarness()
    harness.emitLocalTextOperation()

    harness.emitPatches([{type: 'set', path: [], value: [], origin: 'remote'}])

    expect(harness.editor.pendingLocalTextEdits.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    harness.unsubscribe()
  })

  test('expires bases and releases its cleanup timer', () => {
    const harness = createHarness()
    harness.emitLocalTextOperation()

    expect(vi.getTimerCount()).toBe(1)

    vi.advanceTimersByTime(PENDING_LOCAL_TEXT_EDIT_MAX_AGE_MS + 1)

    expect(harness.editor.pendingLocalTextEdits.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    harness.unsubscribe()
  })

  test('releases its cleanup timer when unsubscribed', () => {
    const harness = createHarness()
    harness.emitLocalTextOperation()

    harness.unsubscribe()

    expect(vi.getTimerCount()).toBe(0)
    expect(harness.editor.operationListeners.after).toHaveLength(0)
  })
})

function createHarness() {
  const editor = {
    operationListeners: {before: [], after: []},
    pendingLocalTextEdits: new Map(),
  } as unknown as PortableTextEditorEngine
  let patchListener: ((event: {patches: Array<Patch>}) => void) | undefined
  const editorActor = {
    on: (
      _type: 'patches',
      listener: (event: {patches: Array<Patch>}) => void,
    ) => {
      patchListener = listener
      return {unsubscribe: () => {}}
    },
  } as unknown as EditorActor
  const subscriptions: Array<() => () => void> = []

  subscribeLocalTextEdits({editor, editorActor, subscriptions})
  const unsubscribe = subscriptions[0]!()

  return {
    editor,
    emitLocalTextOperation: () => {
      emitOperation(
        editor,
        {
          type: 'insert.text',
          path: [...spanPath],
          offset: 1,
          text: 'X',
        },
        'local',
        createValue('abc'),
      )
    },
    emitOperation: (
      operation: EngineOperation,
      origin: OperationOrigin,
      beforeValue: Array<PortableTextBlock>,
    ) => {
      emitOperation(editor, operation, origin, beforeValue)
    },
    emitPatches: (patches: Array<Patch>) => {
      patchListener?.({patches})
    },
    unsubscribe,
  }
}

function emitOperation(
  editor: PortableTextEditorEngine,
  operation: EngineOperation,
  origin: OperationOrigin,
  beforeValue: Array<PortableTextBlock>,
): void {
  const event = {
    operation,
    beforeValue,
    beforeSelection: null,
    operationsInProgress: false,
    isNormalizingNode: origin === 'normalization',
    isPatching: false,
    isProcessingRemoteChanges: origin === 'remote',
    isUndoing: origin === 'undo',
    isRedoing: origin === 'redo',
    withHistory: true,
    undoStepId: undefined,
    origin,
  } satisfies OperationEvent

  for (const listener of editor.operationListeners.after) {
    listener(event)
  }
}

function createValue(text: string): Array<PortableTextBlock> {
  return [
    {
      _key: 'block',
      _type: 'block',
      children: [createSpan(text)],
      markDefs: [],
      style: 'normal',
    },
  ]
}

function createSpan(text: string) {
  return {_key: 'span', _type: 'span', text, marks: []}
}
