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
})
