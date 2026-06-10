import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import type {EditorEmittedEvent} from '../src/editor/relay'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'
import {toTextspec} from '../test-utils/to-textspec'

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
        // Value sync removes the editor's seed block (`k3`: the initial
        // value consumed `k0`-`k2`), inserts the valid first block, and
        // parse fix-ups set the missing `markDefs`/`style`. The second,
        // invalid block is never inserted.
        {
          type: 'operation',
          operation: {type: 'unset', path: [{_key: 'k3'}]},
        },
        {
          type: 'operation',
          operation: {
            type: 'insert',
            path: [0],
            position: 'before',
            node: {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            },
          },
        },
        {
          type: 'operation',
          operation: {
            type: 'set',
            path: [{_key: 'k0'}, 'markDefs'],
            value: [],
            inverse: {type: 'unset', path: [{_key: 'k0'}, 'markDefs']},
          },
        },
        {
          type: 'operation',
          operation: {
            type: 'set',
            path: [{_key: 'k0'}, 'style'],
            value: 'normal',
            inverse: {type: 'unset', path: [{_key: 'k0'}, 'style']},
          },
        },
        {
          type: 'invalid value',
          resolution: {
            action: 'Remove the item',
            description:
              "Child at index '0' in block with key 'k2' is not an object.",
            i18n: {
              action:
                'inputs.portable-text.invalid-value.non-object-child.action',
              description:
                'inputs.portable-text.invalid-value.non-object-child.description',
              values: {index: 0, key: 'k2'},
            },
            item: {_type: 'block', _key: 'k2', children: [null]},
            patches: [{type: 'unset', path: [{_key: 'k2'}, 'children', 0]}],
          },
          value: [
            {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            },
            {_type: 'block', _key: 'k2', children: [null]},
          ],
        },
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo[strong:bar]',
      )
    })

    const syncedBlock = {
      _type: 'block',
      _key: blockKey,
      children: [
        {_type: 'span', _key: fooKey, text: 'foo', marks: []},
        {_type: 'span', _key: barKey, text: 'bar', marks: ['strong']},
      ],
    }

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'operation',
          operation: {type: 'unset', path: [{_key: 'k3'}]},
        },
        {
          type: 'operation',
          operation: {
            type: 'insert',
            path: [0],
            position: 'before',
            node: syncedBlock,
          },
        },
        {
          type: 'operation',
          operation: {
            type: 'set',
            path: [{_key: blockKey}, 'markDefs'],
            value: [],
            inverse: {type: 'unset', path: [{_key: blockKey}, 'markDefs']},
          },
        },
        {
          type: 'operation',
          operation: {
            type: 'set',
            path: [{_key: blockKey}, 'style'],
            value: 'normal',
            inverse: {type: 'unset', path: [{_key: blockKey}, 'style']},
          },
        },
        {type: 'value changed', value: [syncedBlock]},
        {type: 'ready'},
      ])
    })

    const eventCountBeforeInvalidUpdate = events.length

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

    // The invalid value is rejected before any operation applies, so the
    // only new event is `invalid value`.
    await vi.waitFor(() => {
      expect(events.slice(eventCountBeforeInvalidUpdate)).toEqual([
        {
          type: 'invalid value',
          resolution: {
            action: 'Remove the item',
            description: `Child at index '1' in block with key '${blockKey}' is not an object.`,
            i18n: {
              action:
                'inputs.portable-text.invalid-value.non-object-child.action',
              description:
                'inputs.portable-text.invalid-value.non-object-child.description',
              values: {index: 1, key: blockKey},
            },
            item: {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: fooKey, text: 'foo', marks: []},
                null,
              ],
            },
            patches: [{type: 'unset', path: [{_key: blockKey}, 'children', 1]}],
          },
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
        },
      ])
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo[strong:bar]',
      )
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
        // The empty editor's seed block (`k0`) is replaced by the valid
        // first block; the invalid second block is never inserted.
        {
          type: 'operation',
          operation: {type: 'unset', path: [{_key: 'k0'}]},
        },
        {
          type: 'operation',
          operation: {
            type: 'insert',
            path: [0],
            position: 'before',
            node: {
              _type: 'block',
              _key: 'k2',
              children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
            },
          },
        },
        {
          type: 'operation',
          operation: {
            type: 'set',
            path: [{_key: 'k2'}, 'markDefs'],
            value: [],
            inverse: {type: 'unset', path: [{_key: 'k2'}, 'markDefs']},
          },
        },
        {
          type: 'operation',
          operation: {
            type: 'set',
            path: [{_key: 'k2'}, 'style'],
            value: 'normal',
            inverse: {type: 'unset', path: [{_key: 'k2'}, 'style']},
          },
        },
        {
          type: 'invalid value',
          resolution: {
            action: 'Remove the item',
            description:
              "Child at index '0' in block with key 'k4' is not an object.",
            i18n: {
              action:
                'inputs.portable-text.invalid-value.non-object-child.action',
              description:
                'inputs.portable-text.invalid-value.non-object-child.description',
              values: {index: 0, key: 'k4'},
            },
            item: {_type: 'block', _key: 'k4', children: [null]},
            patches: [{type: 'unset', path: [{_key: 'k4'}, 'children', 0]}],
          },
          value: [
            {
              _type: 'block',
              _key: 'k2',
              children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
            },
            {_type: 'block', _key: 'k4', children: [null]},
          ],
        },
      ])
    })
  })
})
