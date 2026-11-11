import {createTestKeyGenerator} from '@portabletext/test'
import {makeDiff, makePatches, stringifyPatches} from '@sanity/diff-match-patch'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema, type MutationEvent, type Patch} from '../src'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

describe('initial value key corrections', () => {
  test('Scenario: a startup value with a keyless child gets its missing key through a correction', async () => {
    const patches: Array<Patch> = []
    const mutations: Array<MutationEvent> = []
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_type: 'span', text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 'k2', _type: 'span', text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'b0'}, 'children', {_key: 'k2'}], offset: 5},
        focus: {path: [{_key: 'b0'}, 'children', {_key: 'k2'}], offset: 5},
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          origin: 'local',
          path: [
            {
              _key: 'b0',
            },
            'children',
            0,
            '_key',
          ],
          type: 'set',
          value: 'k2',
        },
        {
          origin: 'local',
          path: [
            {
              _key: 'b0',
            },
            'children',
            {
              _key: 'k2',
            },
            'text',
          ],
          type: 'diffMatchPatch',
          value: '@@ -1,5 +1,6 @@\n hello\n+!\n',
        },
      ])
      expect(mutations.map((mutation) => mutation.patches)).toEqual([
        [
          {
            type: 'set',
            path: [{_key: 'b0'}, 'children', 0, '_key'],
            value: 'k2',
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [{_key: 'b0'}, 'children', {_key: 'k2'}, 'text'],
            value: stringifyPatches(makePatches(makeDiff('hello', 'hello!'))),
            origin: 'local',
          },
        ],
      ])
    })
  })

  test('Scenario: a startup value with an empty keyless child before another keyless child emits the key corrections before the local edit', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const patches: Array<Patch> = []
    const mutations: Array<MutationEvent> = []
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {_type: 'span', text: '', marks: []},
            {_type: 'span', text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {
              _key: 'k3',
              _type: 'span',
              marks: [],
              text: '',
            },
            {
              _key: 'k2',
              _type: 'span',
              marks: [],
              text: 'bar',
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    // Causal sentinel: the edit makes a pristine editor flush its pending
    // patches, so the `mutation` shows every patch the sync emitted.
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'b0'}, 'children', {_key: 'k2'}], offset: 0},
        focus: {path: [{_key: 'b0'}, 'children', {_key: 'k2'}], offset: 0},
      },
    })
    editor.send({type: 'insert.text', text: 'baz'})

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: 'b0'}, 'children', 1, '_key'],
          value: 'k2',
          origin: 'local',
        },
        {
          type: 'set',
          path: [{_key: 'b0'}, 'children', 0, '_key'],
          value: 'k3',
          origin: 'local',
        },
        {
          type: 'setIfMissing',
          path: [{_key: 'b0'}, 'children'],
          value: [],
          origin: 'local',
        },
        {
          type: 'insert',
          path: [{_key: 'b0'}, 'children', {_key: 'k2'}],
          position: 'before',
          items: [{_key: 'k4', _type: 'span', text: 'baz', marks: []}],
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [{_key: 'b0'}, 'children', {_key: 'k3'}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('', 'baz'))),
          origin: 'local',
        },
        {
          type: 'unset',
          path: [{_key: 'b0'}, 'children', {_key: 'k4'}],
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [{_key: 'b0'}, 'children', {_key: 'k3'}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('baz', 'bazbar'))),
          origin: 'local',
        },
        {
          type: 'unset',
          path: [{_key: 'b0'}, 'children', {_key: 'k2'}],
          origin: 'local',
        },
      ])
      expect(mutations.map((mutation) => mutation.patches)).toEqual([
        [
          {
            type: 'set',
            path: [{_key: 'b0'}, 'children', 1, '_key'],
            value: 'k2',
            origin: 'local',
          },
          {
            type: 'set',
            path: [{_key: 'b0'}, 'children', 0, '_key'],
            value: 'k3',
            origin: 'local',
          },
        ],
        [
          {
            type: 'setIfMissing',
            path: [{_key: 'b0'}, 'children'],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [{_key: 'b0'}, 'children', {_key: 'k2'}],
            position: 'before',
            items: [{_key: 'k4', _type: 'span', text: 'baz', marks: []}],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [{_key: 'b0'}, 'children', {_key: 'k3'}, 'text'],
            value: stringifyPatches(makePatches(makeDiff('', 'baz'))),
            origin: 'local',
          },
          {
            type: 'unset',
            path: [{_key: 'b0'}, 'children', {_key: 'k4'}],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [{_key: 'b0'}, 'children', {_key: 'k3'}, 'text'],
            value: stringifyPatches(makePatches(makeDiff('baz', 'bazbar'))),
            origin: 'local',
          },
          {
            type: 'unset',
            path: [{_key: 'b0'}, 'children', {_key: 'k2'}],
            origin: 'local',
          },
        ],
      ])
    })
    consoleWarn.mockRestore()
  })
})
