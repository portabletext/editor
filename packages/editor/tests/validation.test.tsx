import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import type {EditorEmittedEvent} from '../src/editor/relay-machine'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

describe('Value validation', () => {
  test('Initial value with `null` child results in a validation error', async () => {
    const keyGenerator = createTestKeyGenerator()
    const events: Array<EditorEmittedEvent> = []
    await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [null],
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            events.push(event)
          }}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        expect.objectContaining({
          type: 'invalid value',
        }),
        {type: 'ready'},
      ])
    })
  })

  test('Scenario: Initial value with `null` child in second block results in a validation error', async () => {
    const keyGenerator = createTestKeyGenerator()
    const events: Array<EditorEmittedEvent> = []
    await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []},
          ],
        },
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [null],
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            events.push(event)
          }}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        expect.objectContaining({
          type: 'invalid value',
        }),
        {type: 'ready'},
      ])
    })
  })

  test('Scenario: Setting child to `null` results in a validation error', async () => {
    const keyGenerator = createTestKeyGenerator()
    const events: Array<EditorEmittedEvent> = []
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: fooKey, text: 'foo', marks: []},
            {_type: 'span', _key: barKey, text: 'bar', marks: ['strong']},
          ],
        },
      ],
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
      children: (
        <EventListenerPlugin
          on={(event) => {
            events.push(event)
          }}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo,bar'])
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        expect.objectContaining({
          type: 'value changed',
        }),
        {type: 'ready'},
      ])
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: fooKey, text: 'foo', marks: []},
            null,
          ],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(events.slice(2)).toEqual([
        expect.objectContaining({
          type: 'invalid value',
        }),
      ])
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo,bar'])
    })
  })

  test('Scenario: New block with `null` child results in a validation error', async () => {
    const keyGenerator = createTestKeyGenerator()
    const events: Array<EditorEmittedEvent> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      children: (
        <EventListenerPlugin
          on={(event) => {
            events.push(event)
          }}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(events).toEqual([{type: 'ready'}])
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []},
          ],
        },
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [null],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(events.slice(1)).toEqual([
        expect.objectContaining({
          type: 'invalid value',
        }),
      ])
    })
  })
})
