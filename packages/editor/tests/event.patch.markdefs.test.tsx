import type {Patch} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'
import {
  getSelectionAfterText,
  getTextSelection,
} from '../test-utils/text-selection'

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

  test('Scenario: Adding an annotation to a block without `markDefs` keeps the definition', async () => {
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
      expect(editor.getSnapshot().context.value).toEqual([
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

  test('Scenario: Undoing and redoing an annotation on a block without `markDefs` emits keyed patches', async () => {
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
      expect(editor.getSnapshot().context.value).toEqual([
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

    patches.length = 0

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'marks'],
          value: [],
        },
        {
          origin: 'local',
          type: 'unset',
          path: [{_key: blockKey}, 'markDefs', {_key: 'k4'}],
        },
      ])
    })

    patches.length = 0

    editor.send({type: 'history.redo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
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

  test('Scenario: Undoing an annotation keeps a definition another client added meanwhile', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const remoteDefKey = keyGenerator()
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
            {_key: fooSpanKey, _type: 'span', text: 'foo', marks: []},
            {_key: barSpanKey, _type: 'span', text: 'bar', marks: []},
          ],
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
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: fooSpanKey, _type: 'span', text: 'foo', marks: ['k6']},
            {_key: barSpanKey, _type: 'span', text: 'bar', marks: []},
          ],
          markDefs: [{_key: 'k6', _type: 'link', href: 'https://example.com'}],
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          origin: 'remote',
          type: 'setIfMissing',
          path: [{_key: blockKey}, 'markDefs'],
          value: [],
        },
        {
          origin: 'remote',
          type: 'insert',
          position: 'before',
          path: [{_key: blockKey}, 'markDefs', 0],
          items: [
            {_key: remoteDefKey, _type: 'link', href: 'https://remote.com'},
          ],
        },
        {
          origin: 'remote',
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: barSpanKey}, 'marks'],
          value: [remoteDefKey],
        },
      ],
      snapshot: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: fooSpanKey, _type: 'span', text: 'foo', marks: ['k6']},
            {
              _key: barSpanKey,
              _type: 'span',
              text: 'bar',
              marks: [remoteDefKey],
            },
          ],
          markDefs: [
            {_key: remoteDefKey, _type: 'link', href: 'https://remote.com'},
            {_key: 'k6', _type: 'link', href: 'https://example.com'},
          ],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: fooSpanKey, _type: 'span', text: 'foo', marks: ['k6']},
            {
              _key: barSpanKey,
              _type: 'span',
              text: 'bar',
              marks: [remoteDefKey],
            },
          ],
          markDefs: [
            {_key: remoteDefKey, _type: 'link', href: 'https://remote.com'},
            {_key: 'k6', _type: 'link', href: 'https://example.com'},
          ],
          style: 'normal',
        },
      ])
    })

    patches.length = 0

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: fooSpanKey, _type: 'span', text: 'foo', marks: []},
            {
              _key: barSpanKey,
              _type: 'span',
              text: 'bar',
              marks: [remoteDefKey],
            },
          ],
          markDefs: [
            {_key: remoteDefKey, _type: 'link', href: 'https://remote.com'},
          ],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: fooSpanKey}, 'marks'],
          value: [],
        },
        {
          origin: 'local',
          type: 'unset',
          path: [{_key: blockKey}, 'markDefs', {_key: 'k6'}],
        },
      ])
    })

    patches.length = 0

    editor.send({type: 'history.redo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: fooSpanKey, _type: 'span', text: 'foo', marks: ['k6']},
            {
              _key: barSpanKey,
              _type: 'span',
              text: 'bar',
              marks: [remoteDefKey],
            },
          ],
          markDefs: [
            {_key: 'k6', _type: 'link', href: 'https://example.com'},
            {_key: remoteDefKey, _type: 'link', href: 'https://remote.com'},
          ],
          style: 'normal',
        },
      ])
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
          items: [{_key: 'k6', _type: 'link', href: 'https://example.com'}],
        },
        {
          origin: 'local',
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: fooSpanKey}, 'marks'],
          value: ['k6'],
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

  test('Scenario: Merging an annotated block into a block without `markDefs` keeps the definition', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const fragmentBlockKey = keyGenerator()
    const fragmentSpanKey = keyGenerator()
    const fragmentDefKey = keyGenerator()
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
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'select',
      at: getSelectionAfterText(editor.getSnapshot().context, 'foo'),
    })

    editor.send({
      type: 'insert.block',
      block: {
        _key: fragmentBlockKey,
        _type: 'block',
        children: [
          {
            _key: fragmentSpanKey,
            _type: 'span',
            text: 'bar',
            marks: [fragmentDefKey],
          },
        ],
        markDefs: [
          {_key: fragmentDefKey, _type: 'link', href: 'https://example.com'},
        ],
        style: 'normal',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'foo', marks: []},
            {
              _key: fragmentSpanKey,
              _type: 'span',
              text: 'bar',
              marks: [fragmentDefKey],
            },
          ],
          markDefs: [
            {_key: fragmentDefKey, _type: 'link', href: 'https://example.com'},
          ],
          style: 'normal',
        },
      ])
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
            {_key: fragmentDefKey, _type: 'link', href: 'https://example.com'},
          ],
        },
        {
          origin: 'local',
          type: 'setIfMissing',
          path: [{_key: blockKey}, 'children'],
          value: [],
        },
        {
          origin: 'local',
          type: 'insert',
          position: 'after',
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          items: [{_key: 'k7', _type: 'span', text: '', marks: []}],
        },
        {
          origin: 'local',
          type: 'setIfMissing',
          path: [{_key: blockKey}, 'children'],
          value: [],
        },
        {
          origin: 'local',
          type: 'insert',
          position: 'after',
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          items: [
            {
              _key: fragmentSpanKey,
              _type: 'span',
              text: 'bar',
              marks: [fragmentDefKey],
            },
          ],
        },
        {
          origin: 'local',
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: 'k7'}],
        },
      ])
    })
  })

  test("Scenario: Deleting across blocks inserts only the merged block's definitions", async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const fooDefKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const barDefKey = keyGenerator()
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
          _key: fooBlockKey,
          _type: 'block',
          children: [
            {_key: fooSpanKey, _type: 'span', text: 'foo', marks: [fooDefKey]},
          ],
          markDefs: [{_key: fooDefKey, _type: 'link', href: 'https://foo.com'}],
          style: 'normal',
        },
        {
          _key: barBlockKey,
          _type: 'block',
          children: [
            {_key: barSpanKey, _type: 'span', text: 'bar', marks: [barDefKey]},
          ],
          markDefs: [{_key: barDefKey, _type: 'link', href: 'https://bar.com'}],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
          offset: 2,
        },
        focus: {
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
          offset: 1,
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: fooBlockKey,
          _type: 'block',
          children: [
            {_key: fooSpanKey, _type: 'span', text: 'fo', marks: [fooDefKey]},
            {_key: barSpanKey, _type: 'span', text: 'ar', marks: [barDefKey]},
          ],
          markDefs: [
            {_key: barDefKey, _type: 'link', href: 'https://bar.com'},
            {_key: fooDefKey, _type: 'link', href: 'https://foo.com'},
          ],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'diffMatchPatch',
          path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}, 'text'],
          value: '@@ -1,3 +1,2 @@\n fo\n-o\n',
        },
        {
          origin: 'local',
          type: 'diffMatchPatch',
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}, 'text'],
          value: '@@ -1,3 +1,2 @@\n-b\n ar\n',
        },
        {
          origin: 'local',
          type: 'setIfMissing',
          path: [{_key: fooBlockKey}, 'markDefs'],
          value: [],
        },
        {
          origin: 'local',
          type: 'insert',
          position: 'before',
          path: [{_key: fooBlockKey}, 'markDefs', 0],
          items: [{_key: barDefKey, _type: 'link', href: 'https://bar.com'}],
        },
        {
          origin: 'local',
          type: 'setIfMissing',
          path: [{_key: fooBlockKey}, 'children'],
          value: [],
        },
        {
          origin: 'local',
          type: 'insert',
          position: 'after',
          path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
          items: [
            {_key: barSpanKey, _type: 'span', text: 'ar', marks: [barDefKey]},
          ],
        },
        {
          origin: 'local',
          type: 'unset',
          path: [{_key: barBlockKey}],
        },
      ])
    })
  })

  test('Scenario: Inserting a span with an annotation inserts only the new definition', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
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
              _key: spanKey,
              _type: 'span',
              text: 'foo',
              marks: [existingDefKey],
            },
          ],
          markDefs: [
            {_key: existingDefKey, _type: 'link', href: 'https://foo.com'},
          ],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'select',
      at: getSelectionAfterText(editor.getSnapshot().context, 'foo'),
    })

    editor.send({
      type: 'insert.span',
      text: 'bar',
      annotations: [{name: 'link', value: {href: 'https://bar.com'}}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {
              _key: spanKey,
              _type: 'span',
              text: 'foo',
              marks: [existingDefKey],
            },
            {_key: 'k6', _type: 'span', text: 'bar', marks: ['k5']},
          ],
          markDefs: [
            {_key: 'k5', _type: 'link', href: 'https://bar.com'},
            {_key: existingDefKey, _type: 'link', href: 'https://foo.com'},
          ],
          style: 'normal',
        },
      ])
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
          items: [{_key: 'k5', _type: 'link', href: 'https://bar.com'}],
        },
        {
          origin: 'local',
          type: 'setIfMissing',
          path: [{_key: blockKey}, 'children'],
          value: [],
        },
        {
          origin: 'local',
          type: 'insert',
          position: 'after',
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          items: [{_key: 'k6', _type: 'span', text: 'bar', marks: ['k5']}],
        },
      ])
    })
  })

  test('Scenario: Inserting a span without annotations leaves `markDefs` alone', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
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
              _key: spanKey,
              _type: 'span',
              text: 'foo',
              marks: [existingDefKey],
            },
          ],
          markDefs: [
            {_key: existingDefKey, _type: 'link', href: 'https://foo.com'},
          ],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'select',
      at: getSelectionAfterText(editor.getSnapshot().context, 'foo'),
    })

    editor.send({
      type: 'insert.span',
      text: 'bar',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {
              _key: spanKey,
              _type: 'span',
              text: 'foo',
              marks: [existingDefKey],
            },
            {_key: 'k5', _type: 'span', text: 'bar', marks: []},
          ],
          markDefs: [
            {_key: existingDefKey, _type: 'link', href: 'https://foo.com'},
          ],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'setIfMissing',
          path: [{_key: blockKey}, 'children'],
          value: [],
        },
        {
          origin: 'local',
          type: 'insert',
          position: 'after',
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          items: [{_key: 'k5', _type: 'span', text: 'bar', marks: []}],
        },
      ])
    })
  })

  test('Scenario: Setting annotation props emits a keyed set of the definition', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const fooDefKey = keyGenerator()
    const barDefKey = keyGenerator()
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
            {_key: fooSpanKey, _type: 'span', text: 'foo', marks: [fooDefKey]},
            {_key: barSpanKey, _type: 'span', text: 'bar', marks: [barDefKey]},
          ],
          markDefs: [
            {_key: fooDefKey, _type: 'link', href: 'https://foo.com'},
            {_key: barDefKey, _type: 'link', href: 'https://bar.com'},
          ],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'annotation.set',
      at: [{_key: blockKey}, 'markDefs', {_key: barDefKey}],
      props: {href: 'https://baz.com'},
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: fooSpanKey, _type: 'span', text: 'foo', marks: [fooDefKey]},
            {_key: barSpanKey, _type: 'span', text: 'bar', marks: [barDefKey]},
          ],
          markDefs: [
            {_key: fooDefKey, _type: 'link', href: 'https://foo.com'},
            {_key: barDefKey, _type: 'link', href: 'https://baz.com'},
          ],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'set',
          path: [{_key: blockKey}, 'markDefs', {_key: barDefKey}],
          value: {_key: barDefKey, _type: 'link', href: 'https://baz.com'},
        },
      ])
    })
  })

  test('Scenario: Setting annotation props ignores `_key` and undo restores the fields', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const defKey = keyGenerator()
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
            {_key: spanKey, _type: 'span', text: 'foo', marks: [defKey]},
          ],
          markDefs: [{_key: defKey, _type: 'link', href: 'https://foo.com'}],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'annotation.set',
      at: [{_key: blockKey}, 'markDefs', {_key: defKey}],
      props: {_key: 'other', href: 'https://bar.com'},
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'foo', marks: [defKey]},
          ],
          markDefs: [{_key: defKey, _type: 'link', href: 'https://bar.com'}],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'set',
          path: [{_key: blockKey}, 'markDefs', {_key: defKey}],
          value: {_key: defKey, _type: 'link', href: 'https://bar.com'},
        },
      ])
    })

    patches.length = 0

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'foo', marks: [defKey]},
          ],
          markDefs: [{_key: defKey, _type: 'link', href: 'https://foo.com'}],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'set',
          path: [{_key: blockKey}, 'markDefs', {_key: defKey}],
          value: {_key: defKey, _type: 'link', href: 'https://foo.com'},
        },
      ])
    })
  })

  test('Scenario: Setting annotation props to an invalid definition unsets it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const defKey = keyGenerator()
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
            {_key: spanKey, _type: 'span', text: 'foo', marks: [defKey]},
          ],
          markDefs: [{_key: defKey, _type: 'link', href: 'https://foo.com'}],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'annotation.set',
      at: [{_key: blockKey}, 'markDefs', {_key: defKey}],
      props: {_type: 'comment'},
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'foo', marks: [defKey]},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'unset',
          path: [{_key: blockKey}, 'markDefs', {_key: defKey}],
        },
      ])
    })
  })

  test('Scenario: Setting annotation props filters out undeclared fields', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const defKey = keyGenerator()
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
            {_key: spanKey, _type: 'span', text: 'foo', marks: [defKey]},
          ],
          markDefs: [{_key: defKey, _type: 'link', href: 'https://foo.com'}],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'annotation.set',
      at: [{_key: blockKey}, 'markDefs', {_key: defKey}],
      props: {href: 'https://bar.com', title: 'bar'},
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'foo', marks: [defKey]},
          ],
          markDefs: [{_key: defKey, _type: 'link', href: 'https://bar.com'}],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'set',
          path: [{_key: blockKey}, 'markDefs', {_key: defKey}],
          value: {_key: defKey, _type: 'link', href: 'https://bar.com'},
        },
      ])
    })
  })

  test('Scenario: Setting annotation props leaves a sibling definition with undeclared fields alone', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const fooDefKey = keyGenerator()
    const barDefKey = keyGenerator()
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
            {_key: fooSpanKey, _type: 'span', text: 'foo', marks: [fooDefKey]},
            {_key: barSpanKey, _type: 'span', text: 'bar', marks: [barDefKey]},
          ],
          markDefs: [
            {
              _key: fooDefKey,
              _type: 'link',
              href: 'https://foo.com',
              title: 'foo',
            },
            {_key: barDefKey, _type: 'link', href: 'https://bar.com'},
          ],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'annotation.set',
      at: [{_key: blockKey}, 'markDefs', {_key: barDefKey}],
      props: {href: 'https://baz.com'},
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: fooSpanKey, _type: 'span', text: 'foo', marks: [fooDefKey]},
            {_key: barSpanKey, _type: 'span', text: 'bar', marks: [barDefKey]},
          ],
          markDefs: [
            {
              _key: fooDefKey,
              _type: 'link',
              href: 'https://foo.com',
              title: 'foo',
            },
            {_key: barDefKey, _type: 'link', href: 'https://baz.com'},
          ],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'set',
          path: [{_key: blockKey}, 'markDefs', {_key: barDefKey}],
          value: {_key: barDefKey, _type: 'link', href: 'https://baz.com'},
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
