import type {Patch} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'
import {getTextSelection} from '../test-utils/text-selection'

describe('event.patch markDefs', () => {
  test('Scenario: Adding an annotation emits a keyed insert instead of a whole-array set', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const patches: Array<Patch> = []

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'annotation.add',
      at: getTextSelection(editor.getSnapshot().context, 'foo'),
      annotation: {
        name: 'link',
        value: {href: 'https://example.com'},
      },
    })

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'setIfMissing',
          path: [{_key: blockKey}, 'markDefs'],
          value: [],
        },
        {
          origin: 'local',
          type: 'insert',
          position: 'before',
          path: [{_key: blockKey}, 'markDefs', 0],
          items: [{_key: 'k4', _type: 'link', href: 'https://example.com'}],
        },
        {
          origin: 'local',
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'marks'],
          value: ['k4'],
        },
      ])
    })
  })

  test('Scenario: Adding a second annotation inserts only the new definition', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const linkedSpanKey = keyGenerator()
    const plainSpanKey = keyGenerator()
    const existingDefKey = keyGenerator()
    const patches: Array<Patch> = []

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {
              _key: linkedSpanKey,
              _type: 'span',
              text: 'foo',
              marks: [existingDefKey],
            },
            {_key: plainSpanKey, _type: 'span', text: ' bar', marks: []},
          ],
          markDefs: [
            {_key: existingDefKey, _type: 'link', href: 'https://example.com'},
          ],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'annotation.add',
      at: getTextSelection(editor.getSnapshot().context, ' bar'),
      annotation: {
        name: 'link',
        value: {href: 'https://other.example.com'},
      },
    })

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'setIfMissing',
          path: [{_key: blockKey}, 'markDefs'],
          value: [],
        },
        {
          origin: 'local',
          type: 'insert',
          position: 'before',
          path: [{_key: blockKey}, 'markDefs', 0],
          items: [
            {_key: 'k6', _type: 'link', href: 'https://other.example.com'},
          ],
        },
        {
          origin: 'local',
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: plainSpanKey}, 'marks'],
          value: ['k6'],
        },
      ])
    })
  })

  test('Scenario: Emitted patches converge another editor on the same value', async () => {
    const keyGeneratorA = createTestKeyGenerator()
    const blockKey = keyGeneratorA()
    const spanKey = keyGeneratorA()
    const patches: Array<Patch> = []

    const initialValue = [
      {
        _key: blockKey,
        _type: 'block',
        children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]
    const schemaDefinition = defineSchema({
      annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
    })

    const {editor: editorA} = await createTestEditor({
      keyGenerator: keyGeneratorA,
      schemaDefinition,
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
      initialValue,
    })
    const {editor: editorB} = await createTestEditor({
      keyGenerator: createTestKeyGenerator('b'),
      schemaDefinition,
      initialValue,
    })

    editorA.send({
      type: 'annotation.add',
      at: getTextSelection(editorA.getSnapshot().context, 'foo'),
      annotation: {
        name: 'link',
        value: {href: 'https://example.com'},
      },
    })

    await vi.waitFor(() => {
      expect(patches.length).toEqual(3)
    })

    editorB.send({
      type: 'patches',
      patches: patches.map((patch) => ({...patch, origin: 'remote'})),
      snapshot: editorB.getSnapshot().context.value,
    })

    await vi.waitFor(() => {
      expect(editorB.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'foo', marks: ['k4']},
          ],
          markDefs: [{_key: 'k4', _type: 'link', href: 'https://example.com'}],
          style: 'normal',
        },
      ])
    })
  })
})
