import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {stopActor} from '../internal-utils/stop-actor'
import {createInternalEditor} from './create-editor'
import type {EditorEmittedEvent} from './relay'

/**
 * Pins the `mutation`-`change` pairing for edits applied while the editor
 * actor is idle: `editorEngine.apply` is the same direct-engine call
 * `Editable.tsx`'s focus handler uses, bypassing `editorActor.send` and
 * with it the actor's mailbox deferral.
 */
describe('createInternalEditor: local `change` joins a `mutation` applied outside actor processing', () => {
  test('a `set` operation applied directly on the engine still reports a `change`', async () => {
    const internalEditor = createInternalEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'b1-span', text: 'foo', marks: []}],
        },
      ],
    })

    const unsubscribers = internalEditor.subscriptions.map((subscribe) =>
      subscribe(),
    )
    internalEditor.actors.editorActor.start()
    internalEditor.actors.editorActor.send({
      type: 'add editor engine',
      editor: internalEditor.editorEngine,
    })
    internalEditor.relay.start()
    internalEditor.actors.syncActor.start()

    const events: Array<EditorEmittedEvent> = []
    internalEditor.editor.on('*', (event) => {
      events.push(event)
    })

    // The initial value reaches the engine through the sync machine's own
    // (async) reconciliation: `apply` must wait for it, or it targets the
    // placeholder block the engine starts with instead of `b1`.
    await vi.waitFor(() => {
      expect(internalEditor.editorEngine.snapshot.context.value).toEqual([
        expect.objectContaining({_key: 'b1'}),
      ])
    })

    internalEditor.editorEngine.apply({
      type: 'set',
      path: [{_key: 'b1'}, 'style'],
      value: 'h1',
    })

    await vi.waitFor(() => {
      expect(events.some((event) => event.type === 'mutation')).toBe(true)
    })

    expect(
      events.some(
        (event) => event.type === 'change' && event.origin === 'local',
      ),
    ).toBe(true)

    for (const unsubscribe of unsubscribers) {
      unsubscribe()
    }
    stopActor(internalEditor.actors.editorActor)
    internalEditor.relay.stop()
    stopActor(internalEditor.actors.syncActor)
  })
})
