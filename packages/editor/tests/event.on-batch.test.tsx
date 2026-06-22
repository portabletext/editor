import {describe, expect, test, vi} from 'vitest'
import type {EditorEmittedEvent} from '../src'
import {createTestEditor} from '../src/test/vitest'

const blockCount = 200

async function setupSelectedBlocks() {
  const {editor} = await createTestEditor()
  editor.send({
    type: 'insert.blocks',
    blocks: Array.from({length: blockCount}, (_, index) => ({
      _type: 'block',
      _key: `b${index}`,
      children: [
        {_type: 'span', _key: `s${index}`, text: `b${index}`, marks: []},
      ],
      markDefs: [],
      style: 'normal',
    })),
    placement: 'auto',
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value.length).toBe(blockCount),
  )
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
      focus: {
        path: [
          {_key: `b${blockCount - 1}`},
          'children',
          {_key: `s${blockCount - 1}`},
        ],
        offset: `b${blockCount - 1}`.length,
      },
    },
  })
  return editor
}

// The coalescing, ordering, multi-burst, throw-containment, and
// unsubscribe/stop semantics are pinned deterministically in
// `src/editor/relay.test.ts`; these tests cover the end-to-end wiring through
// `editor.on` (the overload and the `create-editor` bridge) against a real
// operation burst, which the relay unit test cannot exercise.
describe('editor.on batch option (end to end)', () => {
  test('coalesces a real operation burst and delivers every event once, in order', async () => {
    const editor = await setupSelectedBlocks()

    const syncEvents: Array<EditorEmittedEvent> = []
    const batchedEvents: Array<EditorEmittedEvent> = []
    let batchCalls = 0
    const syncSubscription = editor.on('operation', (event) => {
      syncEvents.push(event)
    })
    const batchSubscription = editor.on(
      'operation',
      (events) => {
        batchCalls++
        batchedEvents.push(...events)
      },
      {batch: true},
    )

    editor.send({type: 'delete'})

    // The sync listener has fired per operation; the batch listener has not.
    expect(syncEvents.length).toBeGreaterThan(1)
    expect(batchCalls).toBe(0)

    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value.length).toBe(1),
    )
    await Promise.resolve()
    await Promise.resolve()

    syncSubscription.unsubscribe()
    batchSubscription.unsubscribe()

    // Coalesced: far fewer calls than operations.
    expect(batchCalls).toBeGreaterThanOrEqual(1)
    expect(batchCalls).toBeLessThan(syncEvents.length)
    // Lossless and ordered: the batched listener received exactly the events
    // the sync listener received, in the same order (same object references).
    expect(batchedEvents).toEqual(syncEvents)
  })

  test('does not deliver when unsubscribed before the microtask', async () => {
    const editor = await setupSelectedBlocks()

    let batchCalls = 0
    const subscription = editor.on(
      'operation',
      () => {
        batchCalls++
      },
      {batch: true},
    )

    editor.send({type: 'delete'})
    // Unsubscribe synchronously, before the trailing microtask runs.
    subscription.unsubscribe()
    await Promise.resolve()
    await Promise.resolve()

    expect(batchCalls).toBe(0)
  })
})
