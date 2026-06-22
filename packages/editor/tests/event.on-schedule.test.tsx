import {describe, expect, test, vi} from 'vitest'
import {createTestEditor} from '../src/test/vitest'

describe('editor.on schedule option', () => {
  test("'microtask' coalesces a burst of events into one call; 'sync' does not", async () => {
    const {editor} = await createTestEditor()

    const blockCount = 200
    editor.send({
      type: 'insert.blocks',
      blocks: Array.from({length: blockCount}, (_, i) => ({
        _type: 'block',
        _key: `b${i}`,
        children: [{_type: 'span', _key: `s${i}`, text: `b${i}`, marks: []}],
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

    let syncCalls = 0
    let microtaskCalls = 0
    const syncSubscription = editor.on('*', () => {
      syncCalls++
    })
    const microtaskSubscription = editor.on(
      '*',
      () => {
        microtaskCalls++
      },
      {schedule: 'microtask'},
    )

    editor.send({type: 'delete'})

    // Synchronously after the delete: the sync listener has already fired
    // once per emitted event, the microtask listener has not fired yet.
    const syncCallsRightAfterDelete = syncCalls
    expect(microtaskCalls).toBe(0)

    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value.length).toBe(1),
    )
    await Promise.resolve()

    syncSubscription.unsubscribe()
    microtaskSubscription.unsubscribe()

    // The delete emits many events while removing the selection's blocks.
    expect(syncCallsRightAfterDelete).toBeGreaterThan(10)
    // The microtask listener collapses that burst to a single trailing call.
    expect(microtaskCalls).toBe(1)
  })

  test("'microtask' with 'buffer' delivers the whole burst as one array; plain 'microtask' delivers only the last event", async () => {
    const {editor} = await createTestEditor()

    const blockCount = 200
    editor.send({
      type: 'insert.blocks',
      blocks: Array.from({length: blockCount}, (_, i) => ({
        _type: 'block',
        _key: `b${i}`,
        children: [{_type: 'span', _key: `s${i}`, text: `b${i}`, marks: []}],
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

    let syncEventCount = 0
    const deliverLastEvents: Array<{type: 'operation'}> = []
    const bufferedBatches: Array<Array<{type: 'operation'}>> = []
    const syncSubscription = editor.on('operation', () => {
      syncEventCount++
    })
    const deliverLastSubscription = editor.on(
      'operation',
      (event) => {
        deliverLastEvents.push(event)
      },
      {schedule: 'microtask'},
    )
    const bufferedSubscription = editor.on(
      'operation',
      (events) => {
        bufferedBatches.push(events)
      },
      {schedule: 'microtask', buffer: true},
    )

    editor.send({type: 'delete'})

    // Synchronously after the delete: neither microtask listener has fired.
    const syncCountRightAfterDelete = syncEventCount
    expect(deliverLastEvents).toHaveLength(0)
    expect(bufferedBatches).toHaveLength(0)

    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value.length).toBe(1),
    )
    await Promise.resolve()

    syncSubscription.unsubscribe()
    deliverLastSubscription.unsubscribe()
    bufferedSubscription.unsubscribe()

    // The delete emits many operation events.
    expect(syncCountRightAfterDelete).toBeGreaterThan(10)
    // Both microtask listeners fire once for the burst.
    expect(deliverLastEvents).toHaveLength(1)
    expect(bufferedBatches).toHaveLength(1)
    // The buffered listener receives every operation event of the burst, in
    // delivery order; deliver-last receives only the final one.
    const batch = bufferedBatches[0]!
    expect(batch).toHaveLength(syncCountRightAfterDelete)
    expect(batch.every((event) => event.type === 'operation')).toBe(true)
    expect(batch.at(-1)).toBe(deliverLastEvents[0])
  })

  test("'microtask' with 'buffer' does not deliver when unsubscribed before the microtask", async () => {
    const {editor} = await createTestEditor()

    const bufferedBatches: Array<Array<{type: 'operation'}>> = []
    const subscription = editor.on(
      'operation',
      (events) => {
        bufferedBatches.push(events)
      },
      {schedule: 'microtask', buffer: true},
    )

    editor.send({
      type: 'insert.blocks',
      blocks: [
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'b0', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      placement: 'auto',
    })

    // Unsubscribe synchronously, before the trailing microtask runs.
    subscription.unsubscribe()
    await Promise.resolve()
    await Promise.resolve()

    expect(bufferedBatches).toHaveLength(0)
  })
})
