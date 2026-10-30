import {
  applyAll,
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
} from '@portabletext/patches'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {useEffect} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import type {
  ChangeEvent,
  Editor,
  EditorEmittedEvent,
  MutationEvent,
} from '../src'
import {effect, execute} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {useEditor} from '../src/editor/use-editor'
import {subscribeToChanges, type ChangeCause} from '../src/engine/core/change'
import {useEngineStatic} from '../src/engine/react/hooks/use-engine-static'
import {safeStringify} from '../src/internal-utils/safe-json'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

describe('event.change', () => {
  test('Scenario: Typing emits one local `change` per keystroke with its operations and patches', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, '')],
    })
    const changes = collectChanges(editor)
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    await userEvent.type(locator, 'foo')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        block(blockKey, spanKey, 'foo'),
      ])
    })

    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 0, text: 'f'},
        ],
        patches: [
          {...diffMatchPatch('', 'f', [...spanPath, 'text']), origin: 'local'},
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 1, text: 'o'},
        ],
        patches: [
          {
            ...diffMatchPatch('f', 'fo', [...spanPath, 'text']),
            origin: 'local',
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 2, text: 'o'},
        ],
        patches: [
          {
            ...diffMatchPatch('fo', 'foo', [...spanPath, 'text']),
            origin: 'local',
          },
        ],
      },
    ])
  })

  test('Scenario: A local `change` is emitted synchronously, before the mutation batcher flushes', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 3},
        focus: {path: spanPath, offset: 3},
      },
    })
    const changes = collectChanges(editor)
    const mutations = collectMutations(editor)

    editor.send({type: 'insert.text', text: '!'})

    expect(mutations).toEqual([])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 3, text: '!'},
        ],
        patches: [
          {
            ...diffMatchPatch('foo', 'foo!', [...spanPath, 'text']),
            origin: 'local',
          },
        ],
      },
    ])
  })

  test('Scenario: Pasting blocks emits one local `change`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, '')],
    })
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 0},
        focus: {path: spanPath, offset: 0},
      },
    })
    const barBlock = block(keyGenerator(), keyGenerator(), 'bar')
    const bazBlock = block(keyGenerator(), keyGenerator(), 'baz')
    const changes = collectChanges(editor)

    const dataTransfer = new DataTransfer()
    dataTransfer.setData(
      'application/x-portable-text',
      safeStringify([barBlock, bazBlock]),
    )
    editor.send({
      type: 'clipboard.paste',
      originEvent: {dataTransfer},
      position: {selection: editor.getSnapshot().context.selection!},
    })

    expect(editor.getSnapshot().context.value).toEqual([barBlock, bazBlock])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'insert',
            path: [{_key: blockKey}],
            position: 'before',
            node: barBlock,
            inverse: {type: 'unset', path: [{_key: barBlock._key}]},
          },
          {
            type: 'unset',
            path: [{_key: blockKey}],
            inverse: {
              type: 'insert',
              path: [{_key: barBlock._key}],
              position: 'after',
              node: block(blockKey, spanKey, ''),
            },
          },
          {
            type: 'insert',
            path: [{_key: barBlock._key}],
            position: 'after',
            node: bazBlock,
            inverse: {type: 'unset', path: [{_key: bazBlock._key}]},
          },
        ],
        patches: [
          {
            ...insert([barBlock], 'before', [{_key: blockKey}]),
            origin: 'local',
          },
          {...unset([{_key: blockKey}]), origin: 'local'},
          {
            ...insert([bazBlock], 'after', [{_key: barBlock._key}]),
            origin: 'local',
          },
        ],
      },
    ])
  })

  test('Scenario: Pasting text into a span emits the paste, then a `correction` merging the pasted span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 3},
        focus: {path: spanPath, offset: 3},
      },
    })
    const changes = collectChanges(editor)
    const pastedSpanPath = [{_key: blockKey}, 'children', {_key: 'k6'}]
    const pastedSpan = {_type: 'span', _key: 'k6', text: 'bar', marks: []}

    const dataTransfer = new DataTransfer()
    dataTransfer.setData('text/plain', 'bar')
    editor.send({
      type: 'clipboard.paste',
      originEvent: {dataTransfer},
      position: {selection: editor.getSnapshot().context.selection!},
    })

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'foobar'),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'markDefs'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: blockKey}, 'markDefs'],
              value: [],
            },
          },
          {
            type: 'insert',
            path: spanPath,
            position: 'after',
            node: pastedSpan,
            inverse: {type: 'unset', path: pastedSpanPath},
          },
        ],
        patches: [
          {...set([], [{_key: blockKey}, 'markDefs']), origin: 'local'},
          {
            ...setIfMissing([], [{_key: blockKey}, 'children']),
            origin: 'local',
          },
          {...insert([pastedSpan], 'after', spanPath), origin: 'local'},
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 3, text: 'bar'},
          {
            type: 'unset',
            path: pastedSpanPath,
            inverse: {
              type: 'insert',
              path: spanPath,
              position: 'after',
              node: pastedSpan,
            },
          },
        ],
        patches: [
          {
            ...diffMatchPatch('foo', 'foobar', [...spanPath, 'text']),
            origin: 'local',
          },
          {...unset(pastedSpanPath), origin: 'local'},
        ],
        correction: true,
      },
    ])
  })

  test('Scenario: Undo and redo each emit one local `change`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    await userEvent.type(locator, 'bar')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        block(blockKey, spanKey, 'barfoo'),
      ])
    })

    const changes = collectChanges(editor)

    editor.send({type: 'history.undo'})

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'foo'),
    ])

    editor.send({type: 'history.redo'})

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'barfoo'),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'remove.text', path: spanPath, offset: 2, text: 'r'},
          {type: 'remove.text', path: spanPath, offset: 1, text: 'a'},
          {type: 'remove.text', path: spanPath, offset: 0, text: 'b'},
        ],
        patches: [
          {
            ...diffMatchPatch('barfoo', 'bafoo', [...spanPath, 'text']),
            origin: 'local',
          },
          {
            ...diffMatchPatch('bafoo', 'bfoo', [...spanPath, 'text']),
            origin: 'local',
          },
          {
            ...diffMatchPatch('bfoo', 'foo', [...spanPath, 'text']),
            origin: 'local',
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 0, text: 'b'},
          {type: 'insert.text', path: spanPath, offset: 1, text: 'a'},
          {type: 'insert.text', path: spanPath, offset: 2, text: 'r'},
        ],
        patches: [
          {
            ...diffMatchPatch('foo', 'bfoo', [...spanPath, 'text']),
            origin: 'local',
          },
          {
            ...diffMatchPatch('bfoo', 'bafoo', [...spanPath, 'text']),
            origin: 'local',
          },
          {
            ...diffMatchPatch('bafoo', 'barfoo', [...spanPath, 'text']),
            origin: 'local',
          },
        ],
      },
    ])
  })

  test('Scenario: An edit whose normalization merges spans emits the edit, then a `correction` with the fix', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const initialBlock = {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: fooSpanKey, text: 'foo', marks: ['strong']},
        {_type: 'span', _key: barSpanKey, text: 'bar', marks: ['strong']},
        {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
      ],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [initialBlock],
    })
    const fooSpanPath = [{_key: blockKey}, 'children', {_key: fooSpanKey}]
    const barSpanPath = [{_key: blockKey}, 'children', {_key: barSpanKey}]
    const bazSpanPath = [{_key: blockKey}, 'children', {_key: bazSpanKey}]
    editor.send({
      type: 'select',
      at: {
        anchor: {path: bazSpanPath, offset: 3},
        focus: {path: bazSpanPath, offset: 3},
      },
    })
    const changes = collectChanges(editor)

    editor.send({type: 'insert.text', text: '!'})

    expect(editor.getSnapshot().context.value).toEqual([
      {
        ...initialBlock,
        children: [
          {_type: 'span', _key: fooSpanKey, text: 'foobar', marks: ['strong']},
          {_type: 'span', _key: bazSpanKey, text: 'baz!', marks: []},
        ],
      },
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: bazSpanPath, offset: 3, text: '!'},
        ],
        patches: [
          {
            ...diffMatchPatch('baz', 'baz!', [...bazSpanPath, 'text']),
            origin: 'local',
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: fooSpanPath, offset: 3, text: 'bar'},
          {
            type: 'unset',
            path: barSpanPath,
            inverse: {
              type: 'insert',
              path: fooSpanPath,
              position: 'after',
              node: {
                _type: 'span',
                _key: barSpanKey,
                text: 'bar',
                marks: ['strong'],
              },
            },
          },
        ],
        patches: [
          {
            ...diffMatchPatch('foo', 'foobar', [...fooSpanPath, 'text']),
            origin: 'local',
          },
          {...unset(barSpanPath), origin: 'local'},
        ],
        correction: true,
      },
    ])
  })

  test('Scenario: A fix between two action groups of one Behavior event emits the edit, the correction and the next edit in application order', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const initialBlock = {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: fooSpanKey, text: 'foo', marks: ['strong']},
        {_type: 'span', _key: barSpanKey, text: 'bar', marks: ['strong']},
        {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
      ],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [initialBlock],
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'custom.punctuate',
              actions: [
                () => [execute({type: 'insert.text', text: '!'})],
                () => [execute({type: 'insert.text', text: '?'})],
              ],
            }),
          ]}
        />
      ),
    })
    const fooSpanPath = [{_key: blockKey}, 'children', {_key: fooSpanKey}]
    const barSpanPath = [{_key: blockKey}, 'children', {_key: barSpanKey}]
    const bazSpanPath = [{_key: blockKey}, 'children', {_key: bazSpanKey}]
    editor.send({
      type: 'select',
      at: {
        anchor: {path: bazSpanPath, offset: 3},
        focus: {path: bazSpanPath, offset: 3},
      },
    })
    const changes = collectChanges(editor)

    editor.send({type: 'custom.punctuate'})

    expect(editor.getSnapshot().context.value).toEqual([
      {
        ...initialBlock,
        children: [
          {_type: 'span', _key: fooSpanKey, text: 'foobar', marks: ['strong']},
          {_type: 'span', _key: bazSpanKey, text: 'baz!?', marks: []},
        ],
      },
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: bazSpanPath, offset: 3, text: '!'},
        ],
        patches: [
          {
            ...diffMatchPatch('baz', 'baz!', [...bazSpanPath, 'text']),
            origin: 'local',
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: fooSpanPath, offset: 3, text: 'bar'},
          {
            type: 'unset',
            path: barSpanPath,
            inverse: {
              type: 'insert',
              path: fooSpanPath,
              position: 'after',
              node: {
                _type: 'span',
                _key: barSpanKey,
                text: 'bar',
                marks: ['strong'],
              },
            },
          },
        ],
        patches: [
          {
            ...diffMatchPatch('foo', 'foobar', [...fooSpanPath, 'text']),
            origin: 'local',
          },
          {...unset(barSpanPath), origin: 'local'},
        ],
        correction: true,
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: bazSpanPath, offset: 4, text: '?'},
        ],
        patches: [
          {
            ...diffMatchPatch('baz!', 'baz!?', [...bazSpanPath, 'text']),
            origin: 'local',
          },
        ],
      },
    ])
    expect(
      applyAll(
        [initialBlock],
        changes.flatMap((change) =>
          change.origin === 'local' ? change.patches : [],
        ),
      ),
    ).toEqual(editor.getSnapshot().context.value)
  })

  test('Scenario: Remote patches emit a remote `change` with the applied operations and no patches', async () => {
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
      type: 'patches',
      patches: [{...set('bar', textPath), origin: 'remote'}],
      snapshot: [block(blockKey, spanKey, 'bar')],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'bar'),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [{type: 'set', path: textPath, value: 'bar'}],
      },
    ])
  })

  test('Scenario: A remote patch that triggers a fix emits the remote `change`, then a local `correction` with the fix', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const changes = collectChanges(editor)
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const duplicateKeyPath = [{_key: blockKey}, 'children', 1, '_key']
    const duplicateSpan = {
      _type: 'span',
      _key: spanKey,
      text: 'bar',
      marks: ['strong'],
    }

    editor.send({
      type: 'patches',
      patches: [
        {...insert([duplicateSpan], 'after', spanPath), origin: 'remote'},
      ],
      snapshot: undefined,
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        ...block(blockKey, spanKey, 'foo'),
        children: [
          {_type: 'span', _key: spanKey, text: 'foo', marks: []},
          {...duplicateSpan, _key: 'k4'},
        ],
      },
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'insert',
            path: spanPath,
            position: 'after',
            node: duplicateSpan,
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'set',
            path: duplicateKeyPath,
            value: 'k4',
            inverse: {type: 'set', path: duplicateKeyPath, value: spanKey},
          },
        ],
        patches: [{...set('k4', duplicateKeyPath), origin: 'local'}],
        correction: true,
      },
    ])
  })

  test('Scenario: `update value` emits one remote `change` for the whole update', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        block(fooBlockKey, fooSpanKey, 'foo'),
        block(bazBlockKey, bazSpanKey, 'baz'),
        block(barBlockKey, barSpanKey, 'bar'),
      ],
    })
    const changes = collectChanges(editor)
    const fooSpanPath = [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}]
    const bazSpanPath = [{_key: bazBlockKey}, 'children', {_key: bazSpanKey}]

    editor.send({
      type: 'update value',
      value: [
        block(fooBlockKey, fooSpanKey, 'foo!'),
        block(bazBlockKey, bazSpanKey, 'baz!'),
      ],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      block(fooBlockKey, fooSpanKey, 'foo!'),
      block(bazBlockKey, bazSpanKey, 'baz!'),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {type: 'unset', path: [{_key: barBlockKey}]},
          {
            type: 'set',
            path: [{_key: fooBlockKey}, 'markDefs'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: fooBlockKey}, 'markDefs'],
              value: [],
            },
          },
          {
            type: 'set',
            path: [...fooSpanPath, 'marks'],
            value: [],
            inverse: {type: 'set', path: [...fooSpanPath, 'marks'], value: []},
          },
          {type: 'remove.text', path: fooSpanPath, offset: 0, text: 'foo'},
          {type: 'insert.text', path: fooSpanPath, offset: 0, text: 'foo!'},
          {
            type: 'set',
            path: [{_key: bazBlockKey}, 'markDefs'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: bazBlockKey}, 'markDefs'],
              value: [],
            },
          },
          {
            type: 'set',
            path: [...bazSpanPath, 'marks'],
            value: [],
            inverse: {type: 'set', path: [...bazSpanPath, 'marks'], value: []},
          },
          {type: 'remove.text', path: bazSpanPath, offset: 0, text: 'baz'},
          {type: 'insert.text', path: bazSpanPath, offset: 0, text: 'baz!'},
        ],
      },
    ])
  })

  test('Scenario: A remote patch that leaves the content as it was emits no `change`', async () => {
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
      type: 'patches',
      patches: [{...set('foo', textPath), origin: 'remote'}],
      snapshot: [block(blockKey, spanKey, 'foo')],
    })
    editor.send({
      type: 'patches',
      patches: [{...set('bar', textPath), origin: 'remote'}],
      snapshot: [block(blockKey, spanKey, 'bar')],
    })

    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [{type: 'set', path: textPath, value: 'bar'}],
      },
    ])
  })

  test('Scenario: `update value` that needs a fix emits the remote `change`, then a local `correction` with the fix', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const duplicateKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const changes = collectChanges(editor)
    const duplicateKeyChildren = [
      {_type: 'span', _key: duplicateKey, text: 'foo', marks: []},
      {_type: 'span', _key: duplicateKey, text: 'bar', marks: ['strong']},
    ]
    const duplicateKeyPath = [{_key: blockKey}, 'children', 1, '_key']

    editor.send({
      type: 'update value',
      value: [
        {
          ...block(blockKey, spanKey, ''),
          children: duplicateKeyChildren,
        },
      ],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        ...block(blockKey, spanKey, ''),
        children: [
          duplicateKeyChildren[0],
          {...duplicateKeyChildren[1], _key: 'k5'},
        ],
      },
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'markDefs'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: blockKey}, 'markDefs'],
              value: [],
            },
          },
          {
            type: 'set',
            path: [{_key: blockKey}, 'children'],
            value: duplicateKeyChildren,
            inverse: {
              type: 'set',
              path: [{_key: blockKey}, 'children'],
              value: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
            },
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'set',
            path: duplicateKeyPath,
            value: 'k5',
            inverse: {type: 'set', path: duplicateKeyPath, value: duplicateKey},
          },
        ],
        patches: [{...set('k5', duplicateKeyPath), origin: 'local'}],
        correction: true,
      },
    ])
  })

  test('Scenario: A remote patch that fails to apply does not stop later `change` events', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const changes = collectChanges(editor)
    const textPath = [{_key: blockKey}, 'children', {_key: spanKey}, 'text']
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    editor.send({
      type: 'patches',
      patches: [
        {
          ...set('bar', [{_key: blockKey}, 'children', 5, 'text']),
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    })
    editor.send({
      type: 'patches',
      patches: [{...set('bar', textPath), origin: 'remote'}],
      snapshot: undefined,
    })
    consoleError.mockRestore()

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'bar'),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [{type: 'set', path: textPath, value: 'bar'}],
      },
    ])
  })

  test('Scenario: The first load of a value that needs no fix emits no `change`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const events: Array<EditorEmittedEvent> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
      children: (
        <EventListenerPlugin
          on={(event) => {
            events.push(event)
          }}
        />
      ),
    })
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    await vi.waitFor(() => {
      expect(events.some((event) => event.type === 'ready')).toBe(true)
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 3},
        focus: {path: spanPath, offset: 3},
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    expect(events).toEqual([
      {
        type: 'operation',
        operation: {type: 'unset', path: [{_key: 'k2'}]},
        origin: 'remote',
      },
      {
        type: 'operation',
        operation: {
          type: 'insert',
          path: [0],
          position: 'before',
          node: block(blockKey, spanKey, 'foo'),
        },
        origin: 'remote',
      },
      {type: 'value changed', value: [block(blockKey, spanKey, 'foo')]},
      {type: 'ready'},
      {
        type: 'selection',
        selection: {
          anchor: {path: spanPath, offset: 3},
          focus: {path: spanPath, offset: 3},
          backward: false,
        },
      },
      {
        type: 'operation',
        operation: {type: 'insert.text', path: spanPath, offset: 3, text: '!'},
        origin: 'local',
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 3, text: '!'},
        ],
        patches: [
          {
            ...diffMatchPatch('foo', 'foo!', [...spanPath, 'text']),
            origin: 'local',
          },
        ],
      },
      {
        type: 'patch',
        patch: {
          ...diffMatchPatch('foo', 'foo!', [...spanPath, 'text']),
          origin: 'local',
        },
      },
      {
        type: 'selection',
        selection: {
          anchor: {path: spanPath, offset: 4},
          focus: {path: spanPath, offset: 4},
          backward: false,
        },
      },
    ])
  })

  test('Scenario: A first load the editor has to fix emits only a `correction` with the fix', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const duplicateKey = keyGenerator()
    const loadedBlock = {
      ...block(blockKey, duplicateKey, ''),
      children: [
        {_type: 'span', _key: duplicateKey, text: 'foo', marks: []},
        {_type: 'span', _key: duplicateKey, text: 'bar', marks: ['strong']},
      ],
    }
    const events: Array<EditorEmittedEvent> = []
    await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [loadedBlock],
      children: (
        <EventListenerPlugin
          on={(event) => {
            events.push(event)
          }}
        />
      ),
    })
    const duplicateKeyPath = [{_key: blockKey}, 'children', 1, '_key']

    await vi.waitFor(() => {
      expect(events.some((event) => event.type === 'ready')).toBe(true)
    })

    expect(events).toEqual([
      {
        type: 'operation',
        operation: {type: 'unset', path: [{_key: 'k2'}]},
        origin: 'remote',
      },
      {
        type: 'operation',
        operation: {
          type: 'insert',
          path: [0],
          position: 'before',
          node: loadedBlock,
        },
        origin: 'remote',
      },
      {
        type: 'operation',
        operation: {
          type: 'set',
          path: duplicateKeyPath,
          value: 'k4',
          inverse: {type: 'set', path: duplicateKeyPath, value: duplicateKey},
        },
        origin: 'remote',
      },
      {type: 'value changed', value: [loadedBlock]},
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'set',
            path: duplicateKeyPath,
            value: 'k4',
            inverse: {type: 'set', path: duplicateKeyPath, value: duplicateKey},
          },
        ],
        patches: [{...set('k4', duplicateKeyPath), origin: 'local'}],
        correction: true,
      },
      {type: 'ready'},
    ])
  })

  test('Scenario: A container registered with `editor.registerNode` after load that fills existing content emits a `correction` with the fix', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
      initialValue: [
        block(blockKey, spanKey, 'foo'),
        {_type: 'callout', _key: calloutKey},
      ],
    })
    const changes = collectChanges(editor)
    const contentPath = [{_key: calloutKey}, 'content']

    editor.registerNode({
      node: defineContainer({type: 'callout', arrayField: 'content'}),
    })

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'foo'),
      {_type: 'callout', _key: calloutKey, content: [block('k5', 'k6', '')]},
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'set',
            path: contentPath,
            value: [block('k5', 'k6', '')],
            inverse: {type: 'unset', path: contentPath},
          },
        ],
        patches: [
          {...set([block('k5', 'k6', '')], contentPath), origin: 'local'},
        ],
        correction: true,
      },
    ])
  })

  test('Scenario: A container registered with `editor.registerNode` after load that fills an empty array field emits a `correction` with the fix', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
      initialValue: [
        block(blockKey, spanKey, 'foo'),
        {_type: 'callout', _key: calloutKey, content: []},
      ],
    })
    const changes = collectChanges(editor)
    const contentPath = [{_key: calloutKey}, 'content']

    editor.registerNode({
      node: defineContainer({type: 'callout', arrayField: 'content'}),
    })

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'foo'),
      {_type: 'callout', _key: calloutKey, content: [block('k5', 'k6', '')]},
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'insert',
            path: [...contentPath, 0],
            position: 'before',
            node: block('k5', 'k6', ''),
            inverse: {type: 'unset', path: [...contentPath, {_key: 'k5'}]},
          },
        ],
        patches: [
          {...setIfMissing([], contentPath), origin: 'local'},
          {
            ...insert([block('k5', 'k6', '')], 'before', [...contentPath, 0]),
            origin: 'local',
          },
        ],
        correction: true,
      },
    ])
  })

  test('Scenario: Unregistering a node after load emits a `correction` with the fix the editor makes to existing content', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const secondSpanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const unregister = editor.registerNode({
      node: defineContainer({type: 'callout', arrayField: 'content'}),
    })
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const secondSpanPath = [{_key: blockKey}, 'children', {_key: secondSpanKey}]
    const secondSpan = {
      _type: 'span',
      _key: secondSpanKey,
      text: 'bar',
      marks: [],
    }
    editor.send({
      type: 'patches',
      patches: [{...insert([secondSpan], 'after', spanPath), origin: 'remote'}],
      snapshot: undefined,
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        ...block(blockKey, spanKey, 'foo'),
        children: [
          {_type: 'span', _key: spanKey, text: 'foo', marks: []},
          secondSpan,
        ],
      },
    ])
    const changes = collectChanges(editor)

    unregister()

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'foobar'),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 3, text: 'bar'},
          {
            type: 'unset',
            path: secondSpanPath,
            inverse: {
              type: 'insert',
              path: spanPath,
              position: 'after',
              node: secondSpan,
            },
          },
        ],
        patches: [
          {
            ...diffMatchPatch('foo', 'foobar', [...spanPath, 'text']),
            origin: 'local',
          },
          {...unset(secondSpanPath), origin: 'local'},
        ],
        correction: true,
      },
    ])
  })

  test('Scenario: Actions that change nothing emit no `change`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const changes = collectChanges(editor)
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    editor.send({
      type: 'update value',
      value: [block(blockKey, spanKey, 'foo')],
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 3},
        focus: {path: spanPath, offset: 3},
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 3, text: '!'},
        ],
        patches: [
          {
            ...diffMatchPatch('foo', 'foo!', [...spanPath, 'text']),
            origin: 'local',
          },
        ],
      },
    ])
  })

  test('Scenario: The local `change` patches of a session equal the patches of its `mutation` events', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({keyGenerator})
    const changes = collectChanges(editor)
    const mutations = collectMutations(editor)
    const fooSpanPath = [{_key: 'k0'}, 'children', {_key: 'k1'}]
    const barSpanPath = [{_key: 'k2'}, 'children', {_key: 'k3'}]

    // No intake repairs here: the batcher may drop a superseded one from
    // `mutation`, while `change` always carries its patches.
    await userEvent.type(locator, 'foo')
    await userEvent.keyboard('{Enter}')
    await userEvent.type(locator, 'bar')
    editor.send({type: 'history.undo'})

    const sessionPatches = [
      {...setIfMissing([], []), origin: 'local'},
      {...insert([block('k0', 'k1', '')], 'before', [0]), origin: 'local'},
      {...diffMatchPatch('', 'f', [...fooSpanPath, 'text']), origin: 'local'},
      {...diffMatchPatch('f', 'fo', [...fooSpanPath, 'text']), origin: 'local'},
      {
        ...diffMatchPatch('fo', 'foo', [...fooSpanPath, 'text']),
        origin: 'local',
      },
      {
        ...insert([block('k2', 'k3', '')], 'after', [{_key: 'k0'}]),
        origin: 'local',
      },
      {...diffMatchPatch('', 'b', [...barSpanPath, 'text']), origin: 'local'},
      {...diffMatchPatch('b', 'ba', [...barSpanPath, 'text']), origin: 'local'},
      {
        ...diffMatchPatch('ba', 'bar', [...barSpanPath, 'text']),
        origin: 'local',
      },
      {
        ...diffMatchPatch('bar', 'ba', [...barSpanPath, 'text']),
        origin: 'local',
      },
      {...diffMatchPatch('ba', 'b', [...barSpanPath, 'text']), origin: 'local'},
      {...diffMatchPatch('b', '', [...barSpanPath, 'text']), origin: 'local'},
    ]

    await vi.waitFor(() => {
      expect(mutations.flatMap((mutation) => mutation.patches)).toEqual(
        sessionPatches,
      )
    })
    expect(
      changes.flatMap((change) =>
        change.origin === 'local' ? change.patches : [],
      ),
    ).toEqual(sessionPatches)
  })

  test('Scenario: A `change` listener that edits on a remote `change` gets the correction of the remote `change` before its own edit', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const changes: Array<ChangeEvent> = []
    editor.on('change', (event) => {
      changes.push(event)
      if (event.origin === 'remote') {
        editor.send({type: 'delete.block', at: [{_key: blockKey}]})
      }
    })
    const fooSpan = {_type: 'span', _key: spanKey, text: 'foo', marks: []}
    const barSpan = {
      _type: 'span',
      _key: spanKey,
      text: 'bar',
      marks: ['strong'],
    }
    const duplicateKeyPath = [{_key: blockKey}, 'children', 1, '_key']

    editor.send({
      type: 'update value',
      value: [{...block(blockKey, spanKey, ''), children: [fooSpan, barSpan]}],
    })

    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'markDefs'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: blockKey}, 'markDefs'],
              value: [],
            },
          },
          {
            type: 'insert',
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            position: 'after',
            node: barSpan,
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'set',
            path: duplicateKeyPath,
            value: 'k4',
            inverse: {type: 'set', path: duplicateKeyPath, value: spanKey},
          },
        ],
        patches: [{...set('k4', duplicateKeyPath), origin: 'local'}],
        correction: true,
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'unset',
            path: [{_key: blockKey}],
            inverse: {
              type: 'insert',
              path: [0],
              position: 'before',
              node: {
                ...block(blockKey, spanKey, ''),
                children: [fooSpan, {...barSpan, _key: 'k4'}],
              },
            },
          },
        ],
        patches: [
          {...unset([{_key: blockKey}]), origin: 'local'},
          {...unset([]), origin: 'local'},
        ],
      },
    ])
  })

  test('Scenario: A first load that streams its blocks across ticks commits one change', async () => {
    const keyGenerator = createTestKeyGenerator()
    // `updateValue` yields a tick every 10 blocks, so 25 blocks span three.
    const initialValue = Array.from({length: 25}, () =>
      block(keyGenerator(), keyGenerator(), 'foo'),
    )
    const committedCauses: Array<ChangeCause> = []
    function ChangeProbe() {
      const engine = useEngineStatic()
      useEffect(
        () =>
          subscribeToChanges(engine, (change) => {
            committedCauses.push(change.cause)
          }),
        [engine],
      )
      return null
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue,
      children: <ChangeProbe />,
    })

    await vi.waitFor(() => {
      expect(committedCauses).toEqual([{type: 'value sync', initial: true}])
    })
    expect(editor.getSnapshot().context.value).toEqual(initialValue)
  })

  test('Scenario: A remote patch sent before a streamed first load finishes arrives after the correction of the load', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const duplicateKey = keyGenerator()
    const fooSpan = {_type: 'span', _key: duplicateKey, text: 'foo', marks: []}
    const barSpan = {
      _type: 'span',
      _key: duplicateKey,
      text: 'bar',
      marks: ['strong'],
    }
    const events: Array<EditorEmittedEvent> = []
    const firstSpanPath = [{_key: blockKey}, 'children', {_key: duplicateKey}]
    const duplicateKeyPath = [{_key: blockKey}, 'children', 1, '_key']
    const loadedBlock = {
      ...block(blockKey, duplicateKey, ''),
      children: [fooSpan, barSpan],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [loadedBlock],
      children: (
        <>
          <EventListenerPlugin
            on={(event) => {
              events.push(event)
            }}
          />
          <SendOnMount
            event={{
              type: 'patches',
              patches: [{...unset(firstSpanPath), origin: 'remote'}],
              snapshot: undefined,
            }}
          />
        </>
      ),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          ...block(blockKey, duplicateKey, ''),
          children: [{...barSpan, _key: 'k4'}],
        },
      ])
    })
    expect(events).toEqual([
      {
        type: 'operation',
        operation: {type: 'unset', path: [{_key: 'k2'}]},
        origin: 'remote',
      },
      {
        type: 'operation',
        operation: {
          type: 'insert',
          path: [0],
          position: 'before',
          node: loadedBlock,
        },
        origin: 'remote',
      },
      {
        type: 'operation',
        operation: {
          type: 'set',
          path: duplicateKeyPath,
          value: 'k4',
          inverse: {type: 'set', path: duplicateKeyPath, value: duplicateKey},
        },
        origin: 'remote',
      },
      {type: 'value changed', value: [loadedBlock]},
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'set',
            path: duplicateKeyPath,
            value: 'k4',
            inverse: {type: 'set', path: duplicateKeyPath, value: duplicateKey},
          },
        ],
        patches: [{...set('k4', duplicateKeyPath), origin: 'local'}],
        correction: true,
      },
      {type: 'ready'},
      {
        type: 'operation',
        operation: {type: 'unset', path: firstSpanPath},
        origin: 'remote',
      },
      {
        type: 'change',
        origin: 'remote',
        operations: [{type: 'unset', path: firstSpanPath}],
      },
    ])
  })

  test('Scenario: A value sent before a streamed first load finishes syncs after the correction of the load', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const duplicateKey = keyGenerator()
    const fooSpan = {_type: 'span', _key: duplicateKey, text: 'foo', marks: []}
    const barSpan = {
      _type: 'span',
      _key: duplicateKey,
      text: 'bar',
      marks: ['strong'],
    }
    const duplicateKeyPath = [{_key: blockKey}, 'children', 1, '_key']
    const firstSpanPath = [{_key: blockKey}, 'children', {_key: duplicateKey}]
    const events: Array<EditorEmittedEvent> = []
    const loadedBlock = {
      ...block(blockKey, duplicateKey, ''),
      children: [fooSpan, barSpan],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [loadedBlock],
      children: (
        <>
          <EventListenerPlugin
            on={(event) => {
              events.push(event)
            }}
          />
          <SendOnMount
            event={{
              type: 'update value',
              value: [block(blockKey, duplicateKey, 'baz')],
            }}
          />
        </>
      ),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        block(blockKey, duplicateKey, 'baz'),
      ])
    })
    expect(events).toEqual([
      {
        type: 'operation',
        operation: {type: 'unset', path: [{_key: 'k2'}]},
        origin: 'remote',
      },
      {
        type: 'operation',
        operation: {
          type: 'insert',
          path: [0],
          position: 'before',
          node: loadedBlock,
        },
        origin: 'remote',
      },
      {
        type: 'operation',
        operation: {
          type: 'set',
          path: duplicateKeyPath,
          value: 'k4',
          inverse: {type: 'set', path: duplicateKeyPath, value: duplicateKey},
        },
        origin: 'remote',
      },
      {type: 'value changed', value: [loadedBlock]},
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'set',
            path: duplicateKeyPath,
            value: 'k4',
            inverse: {type: 'set', path: duplicateKeyPath, value: duplicateKey},
          },
        ],
        patches: [{...set('k4', duplicateKeyPath), origin: 'local'}],
        correction: true,
      },
      {type: 'ready'},
      {
        type: 'operation',
        operation: {
          type: 'set',
          path: [{_key: blockKey}, 'markDefs'],
          value: [],
          inverse: {
            type: 'set',
            path: [{_key: blockKey}, 'markDefs'],
            value: [],
          },
        },
        origin: 'remote',
      },
      {
        type: 'operation',
        operation: {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: 'k4'}],
        },
        origin: 'remote',
      },
      {
        type: 'operation',
        operation: {
          type: 'set',
          path: [...firstSpanPath, 'marks'],
          value: [],
          inverse: {type: 'set', path: [...firstSpanPath, 'marks'], value: []},
        },
        origin: 'remote',
      },
      {
        type: 'operation',
        operation: {
          type: 'remove.text',
          path: firstSpanPath,
          offset: 0,
          text: 'foo',
        },
        origin: 'remote',
      },
      {
        type: 'operation',
        operation: {
          type: 'insert.text',
          path: firstSpanPath,
          offset: 0,
          text: 'baz',
        },
        origin: 'remote',
      },
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: blockKey}, 'markDefs'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: blockKey}, 'markDefs'],
              value: [],
            },
          },
          {type: 'unset', path: [{_key: blockKey}, 'children', {_key: 'k4'}]},
          {
            type: 'set',
            path: [...firstSpanPath, 'marks'],
            value: [],
            inverse: {
              type: 'set',
              path: [...firstSpanPath, 'marks'],
              value: [],
            },
          },
          {type: 'remove.text', path: firstSpanPath, offset: 0, text: 'foo'},
          {type: 'insert.text', path: firstSpanPath, offset: 0, text: 'baz'},
        ],
      },
      {type: 'value changed', value: [block(blockKey, duplicateKey, 'baz')]},
    ])
  })

  test('Scenario: `update value` sent by a Behavior effect emits its own remote `change` and keeps the value in sync', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'custom.sync',
              actions: [
                () => [
                  effect(() => {
                    editor.send({
                      type: 'update value',
                      value: [block(fooBlockKey, fooSpanKey, 'foo')],
                    })
                  }),
                ],
              ],
            }),
          ]}
        />
      ),
    })
    const fooSpanPath = [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}]
    const changes = collectChanges(editor)

    editor.send({type: 'custom.sync'})

    expect(editor.getSnapshot().context.value).toEqual([
      block(fooBlockKey, fooSpanKey, 'foo'),
    ])

    editor.send({
      type: 'update value',
      value: [block(fooBlockKey, fooSpanKey, 'bar')],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      block(fooBlockKey, fooSpanKey, 'bar'),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {type: 'unset', path: [{_key: 'k2'}]},
          {
            type: 'insert',
            path: [0],
            position: 'before',
            node: block(fooBlockKey, fooSpanKey, 'foo'),
          },
        ],
      },
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: fooBlockKey}, 'markDefs'],
            value: [],
            inverse: {
              type: 'set',
              path: [{_key: fooBlockKey}, 'markDefs'],
              value: [],
            },
          },
          {
            type: 'set',
            path: [...fooSpanPath, 'marks'],
            value: [],
            inverse: {type: 'set', path: [...fooSpanPath, 'marks'], value: []},
          },
          {type: 'remove.text', path: fooSpanPath, offset: 0, text: 'foo'},
          {type: 'insert.text', path: fooSpanPath, offset: 0, text: 'bar'},
        ],
      },
    ])
  })

  test('Scenario: `update value` sent by a Behavior effect after an `await` emits its own remote `change`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'custom.sync',
              actions: [
                () => [
                  effect(async () => {
                    await Promise.resolve()
                    editor.send({
                      type: 'update value',
                      value: [block(fooBlockKey, fooSpanKey, 'foo')],
                    })
                  }),
                ],
              ],
            }),
          ]}
        />
      ),
    })
    const changes = collectChanges(editor)

    editor.send({type: 'custom.sync'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        block(fooBlockKey, fooSpanKey, 'foo'),
      ])
    })
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {type: 'unset', path: [{_key: 'k2'}]},
          {
            type: 'insert',
            path: [0],
            position: 'before',
            node: block(fooBlockKey, fooSpanKey, 'foo'),
          },
        ],
      },
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

function SendOnMount({event}: {event: Parameters<Editor['send']>[0]}) {
  const editor = useEditor()
  useEffect(() => {
    editor.send(event)
  }, [editor, event])
  return null
}

function collectMutations(editor: Editor): Array<MutationEvent> {
  const mutations: Array<MutationEvent> = []
  editor.on('mutation', (event) => {
    mutations.push(event)
  })
  return mutations
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
