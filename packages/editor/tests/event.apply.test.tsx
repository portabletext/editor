import {diffMatchPatch, set, unset, type Patch} from '@portabletext/patches'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import type {ChangeEvent, Editor} from '../src'
import {createTestEditor} from '../src/test/vitest'

describe('event.apply', () => {
  test('Scenario: A collaborator’s text change emits one remote `change` and no local change', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const changes = collectChanges(editor)
    const textPath = [{_key: blockKey}, 'children', {_key: spanKey}, 'text']

    editor.send({
      type: 'apply',
      patches: [diffMatchPatch('foo', 'fool', textPath)],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'fool'),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'insert.text',
            path: textPath.slice(0, 3),
            offset: 3,
            text: 'l',
          },
        ],
      },
    ])
  })

  test('Scenario: An `apply` with no patches emits no `change` and keeps the value and undo stack', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })

    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const end = {path: spanPath, offset: 3}

    editor.send({type: 'focus'})
    editor.send({type: 'select', at: {anchor: end, focus: end}})
    editor.send({type: 'insert.text', text: 'x'})
    const changes = collectChanges(editor)

    editor.send({type: 'apply', patches: []})

    expect(changes).toEqual([])
    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'foox'),
    ])

    editor.send({type: 'history.undo'})

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'foo'),
    ])
  })

  test('Scenario: Undo after a remote patch that fails to apply undoes the local edit', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foobar')],
    })
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const textPath = [...spanPath, 'text']
    const end = {path: spanPath, offset: 6}

    editor.send({type: 'focus'})
    editor.send({type: 'select', at: {anchor: end, focus: end}})
    editor.send({type: 'insert.text', text: 'x'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        block(blockKey, spanKey, 'foobarx'),
      ])
    })

    editor.send({
      type: 'apply',
      patches: [diffMatchPatch('bazbazbaz', 'qbazbazbaz', textPath)],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'foobarx'),
    ])

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        block(blockKey, spanKey, 'foobar'),
      ])
    })
  })

  test('Scenario: A remote whole-value `unset` clears the undo stack', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const end = {path: spanPath, offset: 3}

    editor.send({type: 'focus'})
    editor.send({type: 'select', at: {anchor: end, focus: end}})
    editor.send({type: 'insert.text', text: 'x'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        block(blockKey, spanKey, 'foox'),
      ])
    })

    editor.send({
      type: 'apply',
      patches: [unset([]), set([block(blockKey, spanKey, 'foox')], [])],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'foox'),
    ])

    editor.send({type: 'history.undo'})

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'foox'),
    ])
  })

  test('Scenario: A remote `inc` increments a number field on a block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    const before: Array<PortableTextBlock> = [
      {_type: 'image', _key: imageKey, count: 1},
    ]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'count', type: 'number'}]},
        ],
      }),
      initialValue: structuredClone(before),
    })
    const patches: Array<Patch> = [
      {type: 'inc', path: [{_key: imageKey}, 'count'], value: 2},
    ]

    editor.send({type: 'apply', patches})

    expect(editor.getSnapshot().context.value).toEqual([
      {_type: 'image', _key: imageKey, count: 3},
    ])
  })

  test('Scenario: A remote `dec` decrements a number field on a block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    const before: Array<PortableTextBlock> = [
      {_type: 'image', _key: imageKey, count: 3},
    ]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'count', type: 'number'}]},
        ],
      }),
      initialValue: structuredClone(before),
    })
    const patches: Array<Patch> = [
      {type: 'dec', path: [{_key: imageKey}, 'count'], value: 1},
    ]

    editor.send({type: 'apply', patches})

    expect(editor.getSnapshot().context.value).toEqual([
      {_type: 'image', _key: imageKey, count: 2},
    ])
  })

  test('Scenario: A remote `inc` on a field that is not a number or is absent changes nothing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    const before: Array<PortableTextBlock> = [
      {_type: 'image', _key: imageKey, title: 'foo'},
    ]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'image',
            fields: [
              {name: 'title', type: 'string'},
              {name: 'count', type: 'number'},
            ],
          },
        ],
      }),
      initialValue: structuredClone(before),
    })

    editor.send({
      type: 'apply',
      patches: [
        {type: 'inc', path: [{_key: imageKey}, 'title'], value: 2},
        {type: 'inc', path: [{_key: imageKey}, 'count'], value: 2},
      ],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {_type: 'image', _key: imageKey, title: 'foo'},
    ])
  })
})

function collectChanges(editor: Editor): Array<ChangeEvent> {
  const changes: Array<ChangeEvent> = []
  editor.on('change', (event) => {
    changes.push(event)
  })
  return changes
}

function block(
  blockKey: string,
  spanKey: string,
  text: string,
): PortableTextBlock {
  return {
    _type: 'block',
    _key: blockKey,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
  }
}
