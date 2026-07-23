import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {makeDiff, makePatches, stringifyPatches} from '@sanity/diff-match-patch'
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
    const {editor} = await createTestEditor({
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
        // value consumed `k0`-`k2`) and inserts the valid first block as-is
        // (missing `markDefs`/`style` are filled in on the first local
        // edit). The second, invalid block is never inserted.
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

    const eventsBeforeEdit = events.length
    // Provoke the deferred healing: a local edit touching the block
    // fills in and emits its missing defaults as part of that edit.
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    // The full stream of the healing edit: the user's insert, then the
    // block's deferred defaults, then the patches and the mutation that
    // carries them all.
    await vi.waitFor(() => {
      expect(events.slice(eventsBeforeEdit)).toEqual([
        {
          type: 'selection',
          selection: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
            backward: false,
          },
        },
        {
          type: 'operation',
          operation: {
            type: 'insert.text',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
            offset: 3,
            text: '!',
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
          type: 'patch',
          patch: {
            type: 'diffMatchPatch',
            origin: 'local',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: stringifyPatches(makePatches(makeDiff('foo', 'foo!'))),
          },
        },
        {
          type: 'patch',
          patch: {
            type: 'set',
            origin: 'local',
            path: [{_key: 'k0'}, 'markDefs'],
            value: [],
          },
        },
        {
          type: 'patch',
          patch: {
            type: 'set',
            origin: 'local',
            path: [{_key: 'k0'}, 'style'],
            value: 'normal',
          },
        },
        {
          type: 'selection',
          selection: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 4},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 4},
            backward: false,
          },
        },
        {
          type: 'mutation',
          patches: [
            {
              type: 'diffMatchPatch',
              origin: 'local',
              path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
              value: stringifyPatches(makePatches(makeDiff('foo', 'foo!'))),
            },
            {
              type: 'set',
              origin: 'local',
              path: [{_key: 'k0'}, 'markDefs'],
              value: [],
            },
            {
              type: 'set',
              origin: 'local',
              path: [{_key: 'k0'}, 'style'],
              value: 'normal',
            },
          ],
          value: [
            {
              _key: 'k0',
              _type: 'block',
              children: [{_key: 'k1', _type: 'span', text: 'foo!', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    // The engine's own document agrees with the emitted patches: the
    // healed defaults are present in the value, not just on the wire.
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [{_key: 'k1', _type: 'span', text: 'foo!', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
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

    const eventsBeforeEdit = events.length
    // Provoke the deferred healing: a local edit touching the block fills
    // in and emits its missing defaults as part of that edit.
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    // The full stream of the healing edit: the user's insert, then the
    // block's deferred defaults, then the patches and the mutation that
    // carries them all.
    await vi.waitFor(() => {
      expect(events.slice(eventsBeforeEdit)).toEqual([
        {
          type: 'selection',
          selection: {
            anchor: {
              path: [{_key: blockKey}, 'children', {_key: fooKey}],
              offset: 3,
            },
            focus: {
              path: [{_key: blockKey}, 'children', {_key: fooKey}],
              offset: 3,
            },
            backward: false,
          },
        },
        {
          type: 'operation',
          operation: {
            type: 'insert.text',
            path: [{_key: blockKey}, 'children', {_key: fooKey}],
            offset: 3,
            text: '!',
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
        {
          type: 'patch',
          patch: {
            type: 'diffMatchPatch',
            origin: 'local',
            path: [{_key: blockKey}, 'children', {_key: fooKey}, 'text'],
            value: stringifyPatches(makePatches(makeDiff('foo', 'foo!'))),
          },
        },
        {
          type: 'patch',
          patch: {
            type: 'set',
            origin: 'local',
            path: [{_key: blockKey}, 'markDefs'],
            value: [],
          },
        },
        {
          type: 'patch',
          patch: {
            type: 'set',
            origin: 'local',
            path: [{_key: blockKey}, 'style'],
            value: 'normal',
          },
        },
        {
          type: 'selection',
          selection: {
            anchor: {
              path: [{_key: blockKey}, 'children', {_key: fooKey}],
              offset: 4,
            },
            focus: {
              path: [{_key: blockKey}, 'children', {_key: fooKey}],
              offset: 4,
            },
            backward: false,
          },
        },
        {
          type: 'mutation',
          patches: [
            {
              type: 'diffMatchPatch',
              origin: 'local',
              path: [{_key: blockKey}, 'children', {_key: fooKey}, 'text'],
              value: stringifyPatches(makePatches(makeDiff('foo', 'foo!'))),
            },
            {
              type: 'set',
              origin: 'local',
              path: [{_key: blockKey}, 'markDefs'],
              value: [],
            },
            {
              type: 'set',
              origin: 'local',
              path: [{_key: blockKey}, 'style'],
              value: 'normal',
            },
          ],
          value: [
            {
              _key: blockKey,
              _type: 'block',
              children: [
                {_key: fooKey, _type: 'span', text: 'foo!', marks: []},
                {_key: barKey, _type: 'span', text: 'bar', marks: ['strong']},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    // The engine's own document agrees with the emitted patches: the
    // healed defaults are present in the value, not just on the wire.
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: blockKey,
        _type: 'block',
        children: [
          {_key: fooKey, _type: 'span', text: 'foo!', marks: []},
          {_key: barKey, _type: 'span', text: 'bar', marks: ['strong']},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
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
    const eventsBeforeEdit = events.length
    // Provoke the deferred healing: a local edit touching the block fills
    // in and emits its missing defaults as part of that edit.
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 3},
        focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 3},
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    // The full stream of the healing edit: the user's insert, then the
    // block's deferred defaults, then the patches and the mutation that
    // carries them all.
    await vi.waitFor(() => {
      expect(events.slice(eventsBeforeEdit)).toEqual([
        {
          type: 'selection',
          selection: {
            anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 3},
            focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 3},
            backward: false,
          },
        },
        {
          type: 'operation',
          operation: {
            type: 'insert.text',
            path: [{_key: 'k2'}, 'children', {_key: 'k3'}],
            offset: 3,
            text: '!',
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
          type: 'patch',
          patch: {
            type: 'diffMatchPatch',
            origin: 'local',
            path: [{_key: 'k2'}, 'children', {_key: 'k3'}, 'text'],
            value: stringifyPatches(makePatches(makeDiff('foo', 'foo!'))),
          },
        },
        {
          type: 'patch',
          patch: {
            type: 'set',
            origin: 'local',
            path: [{_key: 'k2'}, 'markDefs'],
            value: [],
          },
        },
        {
          type: 'patch',
          patch: {
            type: 'set',
            origin: 'local',
            path: [{_key: 'k2'}, 'style'],
            value: 'normal',
          },
        },
        {
          type: 'selection',
          selection: {
            anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 4},
            focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 4},
            backward: false,
          },
        },
        {
          type: 'mutation',
          patches: [
            {
              type: 'diffMatchPatch',
              origin: 'local',
              path: [{_key: 'k2'}, 'children', {_key: 'k3'}, 'text'],
              value: stringifyPatches(makePatches(makeDiff('foo', 'foo!'))),
            },
            {
              type: 'set',
              origin: 'local',
              path: [{_key: 'k2'}, 'markDefs'],
              value: [],
            },
            {
              type: 'set',
              origin: 'local',
              path: [{_key: 'k2'}, 'style'],
              value: 'normal',
            },
          ],
          value: [
            {
              _key: 'k2',
              _type: 'block',
              children: [{_key: 'k3', _type: 'span', text: 'foo!', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    // The engine's own document agrees with the emitted patches: the
    // healed defaults are present in the value, not just on the wire.
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k2',
        _type: 'block',
        children: [{_key: 'k3', _type: 'span', text: 'foo!', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})
