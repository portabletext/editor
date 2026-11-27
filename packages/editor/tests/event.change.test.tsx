import {
  applyAll,
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
  type JSONValue,
  type Patch,
} from '@portabletext/patches'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {useEffect} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {type ChangeEvent, type Editor, type EditorEmittedEvent} from '../src'
import {execute} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {useEditor} from '../src/editor/use-editor'
import {subscribeToChanges, type ChangeCause} from '../src/engine/core/change'
import {useEngineStatic} from '../src/engine/react/hooks/use-engine-static'
import {safeStringify} from '../src/internal-utils/safe-json'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

describe('event.change', () => {
  test('Scenario: A remote patch applied right after a local edit keeps both at the root', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const fooSpanPath = [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}]
    const barSpanPath = [{_key: barBlockKey}, 'children', {_key: barSpanKey}]
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        block(fooBlockKey, fooSpanKey, 'foo'),
        block(barBlockKey, barSpanKey, 'bar'),
      ],
    })
    const localChanges = collectLocalChanges(editor)

    editor.send({
      type: 'select',
      at: {
        anchor: {path: fooSpanPath, offset: 3},
        focus: {path: fooSpanPath, offset: 3},
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: fooSpanPath, offset: 3},
        focus: {path: fooSpanPath, offset: 3},
        backward: false,
      })
    })

    editor.send({type: 'insert.text', text: 'baz'})
    editor.send({
      type: 'apply',
      patches: [
        {
          ...diffMatchPatch('bar', 'barbaz', [...barSpanPath, 'text']),
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(localChanges.flatMap((event) => event.patches)).toEqual([
        {
          ...diffMatchPatch('foo', 'foobaz', [...fooSpanPath, 'text']),
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.value).toEqual([
        block(fooBlockKey, fooSpanKey, 'foobaz'),
        block(barBlockKey, barSpanKey, 'barbaz'),
      ])
    })
  })

  test('Scenario: A remote patch applied right after a local edit keeps both inside a callout', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const prefix = [{_key: calloutKey}, 'content']
    const fooSpanPath = [
      ...prefix,
      {_key: fooBlockKey},
      'children',
      {_key: fooSpanKey},
    ]
    const barSpanPath = [
      ...prefix,
      {_key: barBlockKey},
      'children',
      {_key: barSpanKey},
    ]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutSchemaDefinition,
      children: (
        <NodePlugin
          nodes={[defineContainer({type: 'callout', arrayField: 'content'})]}
        />
      ),
      initialValue: [
        callout(calloutKey, [
          block(fooBlockKey, fooSpanKey, 'foo'),
          block(barBlockKey, barSpanKey, 'bar'),
        ]),
      ],
    })
    const localChanges = collectLocalChanges(editor)

    editor.send({
      type: 'select',
      at: {
        anchor: {path: fooSpanPath, offset: 3},
        focus: {path: fooSpanPath, offset: 3},
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: fooSpanPath, offset: 3},
        focus: {path: fooSpanPath, offset: 3},
        backward: false,
      })
    })

    editor.send({type: 'insert.text', text: 'baz'})
    editor.send({
      type: 'apply',
      patches: [
        {
          ...diffMatchPatch('bar', 'barbaz', [...barSpanPath, 'text']),
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(localChanges.flatMap((event) => event.patches)).toEqual([
        {
          ...diffMatchPatch('foo', 'foobaz', [...fooSpanPath, 'text']),
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.value).toEqual([
        callout(calloutKey, [
          block(fooBlockKey, fooSpanKey, 'foobaz'),
          block(barBlockKey, barSpanKey, 'barbaz'),
        ]),
      ])
    })
  })

  test('Scenario: A remote patch applied right after a local edit keeps both inside a nested callout', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const outerKey = keyGenerator()
    const innerKey = keyGenerator()
    const prefix = [{_key: outerKey}, 'content', {_key: innerKey}, 'content']
    const fooSpanPath = [
      ...prefix,
      {_key: fooBlockKey},
      'children',
      {_key: fooSpanKey},
    ]
    const barSpanPath = [
      ...prefix,
      {_key: barBlockKey},
      'children',
      {_key: barSpanKey},
    ]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: nestedCalloutSchemaDefinition,
      children: (
        <NodePlugin
          nodes={[defineContainer({type: 'callout', arrayField: 'content'})]}
        />
      ),
      initialValue: [
        callout(outerKey, [
          callout(innerKey, [
            block(fooBlockKey, fooSpanKey, 'foo'),
            block(barBlockKey, barSpanKey, 'bar'),
          ]),
        ]),
      ],
    })
    const localChanges = collectLocalChanges(editor)

    editor.send({
      type: 'select',
      at: {
        anchor: {path: fooSpanPath, offset: 3},
        focus: {path: fooSpanPath, offset: 3},
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: fooSpanPath, offset: 3},
        focus: {path: fooSpanPath, offset: 3},
        backward: false,
      })
    })

    editor.send({type: 'insert.text', text: 'baz'})
    editor.send({
      type: 'apply',
      patches: [
        {
          ...diffMatchPatch('bar', 'barbaz', [...barSpanPath, 'text']),
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(localChanges.flatMap((event) => event.patches)).toEqual([
        {
          ...diffMatchPatch('foo', 'foobaz', [...fooSpanPath, 'text']),
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.value).toEqual([
        callout(outerKey, [
          callout(innerKey, [
            block(fooBlockKey, fooSpanKey, 'foobaz'),
            block(barBlockKey, barSpanKey, 'barbaz'),
          ]),
        ]),
      ])
    })
  })

  test('Scenario: A remote patch applied right after a local edit keeps both inside a note field', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const noteKey = keyGenerator()
    const prefix = [{_key: noteKey}, 'body']
    const fooSpanPath = [
      ...prefix,
      {_key: fooBlockKey},
      'children',
      {_key: fooSpanKey},
    ]
    const barSpanPath = [
      ...prefix,
      {_key: barBlockKey},
      'children',
      {_key: barSpanKey},
    ]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: noteSchemaDefinition,
      children: (
        <NodePlugin
          nodes={[defineContainer({type: 'note', arrayField: 'body'})]}
        />
      ),
      initialValue: [
        note(noteKey, [
          block(fooBlockKey, fooSpanKey, 'foo'),
          block(barBlockKey, barSpanKey, 'bar'),
        ]),
      ],
    })
    const localChanges = collectLocalChanges(editor)

    editor.send({
      type: 'select',
      at: {
        anchor: {path: fooSpanPath, offset: 3},
        focus: {path: fooSpanPath, offset: 3},
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: fooSpanPath, offset: 3},
        focus: {path: fooSpanPath, offset: 3},
        backward: false,
      })
    })

    editor.send({type: 'insert.text', text: 'baz'})
    editor.send({
      type: 'apply',
      patches: [
        {
          ...diffMatchPatch('bar', 'barbaz', [...barSpanPath, 'text']),
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(localChanges.flatMap((event) => event.patches)).toEqual([
        {
          ...diffMatchPatch('foo', 'foobaz', [...fooSpanPath, 'text']),
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.value).toEqual([
        note(noteKey, [
          block(fooBlockKey, fooSpanKey, 'foobaz'),
          block(barBlockKey, barSpanKey, 'barbaz'),
        ]),
      ])
    })
  })

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
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'f', marks: []}],
          },
        ],
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
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'fo', marks: []}],
          },
        ],
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
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
        ],
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

  test('Scenario: A local `change` is emitted synchronously', async () => {
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

    editor.send({type: 'insert.text', text: '!'})

    expect(changes).toEqual([
      {
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo!', marks: []}],
          },
        ],
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
        value: [
          {
            _type: 'block',
            _key: 'k4',
            children: [{_type: 'span', _key: 'k5', text: 'bar', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'k6',
            children: [{_type: 'span', _key: 'k7', text: 'baz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
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

  test('Scenario: Pasting text into a span emits one local change including the pasted span merge', async () => {
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
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foobar', marks: []}],
          },
        ],
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
          {...set([], [{_key: blockKey}, 'markDefs']), origin: 'local'},
          {
            ...setIfMissing([], [{_key: blockKey}, 'children']),
            origin: 'local',
          },
          {...insert([pastedSpan], 'after', spanPath), origin: 'local'},
          {
            ...diffMatchPatch('foo', 'foobar', [...spanPath, 'text']),
            origin: 'local',
          },
          {...unset(pastedSpanPath), origin: 'local'},
        ],
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
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
        ],
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
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'barfoo', marks: []}],
          },
        ],
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

  test('Scenario: An edit whose normalization merges spans emits one local change including the fix', async () => {
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
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: 'k1', text: 'foobar', marks: ['strong']},
              {_type: 'span', _key: 'k3', text: 'baz!', marks: []},
            ],
          },
        ],
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: bazSpanPath, offset: 3, text: '!'},
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
            ...diffMatchPatch('baz', 'baz!', [...bazSpanPath, 'text']),
            origin: 'local',
          },
          {
            ...diffMatchPatch('foo', 'foobar', [...fooSpanPath, 'text']),
            origin: 'local',
          },
          {...unset(barSpanPath), origin: 'local'},
        ],
      },
    ])
  })

  test('Scenario: A fix between two action groups of one Behavior event emits one local change with both edits and the fix in application order', async () => {
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
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: 'k1', text: 'foobar', marks: ['strong']},
              {_type: 'span', _key: 'k3', text: 'baz!?', marks: []},
            ],
          },
        ],
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: bazSpanPath, offset: 3, text: '!'},
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
          {type: 'insert.text', path: bazSpanPath, offset: 4, text: '?'},
        ],
        patches: [
          {
            ...diffMatchPatch('baz', 'baz!', [...bazSpanPath, 'text']),
            origin: 'local',
          },
          {
            ...diffMatchPatch('foo', 'foobar', [...fooSpanPath, 'text']),
            origin: 'local',
          },
          {...unset(barSpanPath), origin: 'local'},
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
      type: 'apply',
      patches: [{...set('bar', textPath), origin: 'remote'}],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'bar'),
    ])
    expect(changes).toEqual([
      {
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
          },
        ],
        type: 'change',
        origin: 'remote',
        operations: [{type: 'set', path: textPath, value: 'bar'}],
      },
    ])
  })

  test('Scenario: A remote patch that triggers a fix emits the remote `change`, then a local change with the fix', async () => {
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
      type: 'apply',
      patches: [
        {...insert([duplicateSpan], 'after', spanPath), origin: 'remote'},
      ],
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
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: 'k1', text: 'foo', marks: []},
              {_type: 'span', _key: 'k1', text: 'bar', marks: ['strong']},
            ],
          },
        ],
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
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: 'k1', text: 'foo', marks: []},
              {_type: 'span', _key: 'k4', text: 'bar', marks: ['strong']},
            ],
          },
        ],
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
      },
    ])
  })

  test('Scenario: A remote patch that removes `markDefs` from a text block emits a remote `change` with the removal', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const initialSnapshotValue = editor.getSnapshot().context.value
    const changes = collectChanges(editor)
    const markDefsPath = [{_key: blockKey}, 'markDefs']

    editor.send({
      type: 'apply',
      patches: [{...unset(markDefsPath), origin: 'remote'}],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        style: 'normal',
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
      },
    ])
    expect(changes).toEqual([
      {
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
        ],
        type: 'change',
        origin: 'remote',
        operations: [{type: 'unset', path: markDefsPath}],
      },
    ])
    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
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
      type: 'apply',
      patches: [{...set('foo', textPath), origin: 'remote'}],
    })
    editor.send({
      type: 'apply',
      patches: [{...set('bar', textPath), origin: 'remote'}],
    })

    expect(changes).toEqual([
      {
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
          },
        ],
        type: 'change',
        origin: 'remote',
        operations: [{type: 'set', path: textPath, value: 'bar'}],
      },
    ])
  })

  test('Scenario: A first load with a keyless child emits only a local change with the minted key', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const changes: Array<ChangeEvent> = []
    const events: Array<EditorEmittedEvent> = []
    await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          ...block(blockKey, '', ''),
          children: [{_type: 'span', text: 'foo', marks: []}],
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            events.push(event)
            if (event.type === 'change') {
              changes.push(event)
            }
          }}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(events.some((event) => event.type === 'ready')).toBe(true)
    })

    expect(changes).toEqual([
      {
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', text: 'foo', marks: [], _key: 'k3'}],
          },
        ],
        operations: [
          {
            inverse: {
              path: [
                {
                  _key: 'k0',
                },
                'children',
                0,
                '_key',
              ],
              type: 'unset',
            },
            path: [
              {
                _key: 'k0',
              },
              'children',
              0,
              '_key',
            ],
            type: 'set',
            value: 'k3',
          },
        ],
        origin: 'local',
        patches: [
          {
            origin: 'local',
            path: [
              {
                _key: 'k0',
              },
              'children',
              0,
              '_key',
            ],
            type: 'set',
            value: 'k3',
          },
        ],
        type: 'change',
      },
    ])
  })

  test('Scenario: A first load with an empty keyless child emits only the repair patches', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const changes: Array<ChangeEvent> = []
    const events: Array<EditorEmittedEvent> = []
    await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          ...block(blockKey, '', ''),
          children: [{_type: 'span', text: '', marks: []}],
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            events.push(event)
            if (event.type === 'change') {
              changes.push(event)
            }
          }}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(events.some((event) => event.type === 'ready')).toBe(true)
    })

    expect(changes).toEqual([
      {
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', text: '', marks: [], _key: 'k3'}],
          },
        ],
        operations: [
          {
            inverse: {
              path: [
                {
                  _key: 'k0',
                },
                'children',
                0,
                '_key',
              ],
              type: 'unset',
            },
            path: [
              {
                _key: 'k0',
              },
              'children',
              0,
              '_key',
            ],
            type: 'set',
            value: 'k3',
          },
        ],
        origin: 'local',
        patches: [
          {
            origin: 'local',
            path: [
              {
                _key: 'k0',
              },
              'children',
              0,
              '_key',
            ],
            type: 'set',
            value: 'k3',
          },
        ],
        type: 'change',
      },
    ])
  })

  test('Scenario: A registered container with an empty keyless child emits only the repair patches', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const calloutKey = keyGenerator()
    const changes: Array<ChangeEvent> = []
    const events: Array<EditorEmittedEvent> = []
    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutSchemaDefinition,
      initialValue: [
        callout(calloutKey, [
          {
            ...block(blockKey, '', ''),
            children: [{_type: 'span', text: '', marks: []}],
          },
        ]),
      ],
      children: (
        <>
          <NodePlugin
            nodes={[defineContainer({type: 'callout', arrayField: 'content'})]}
          />
          <EventListenerPlugin
            on={(event) => {
              events.push(event)
              if (event.type === 'change') {
                changes.push(event)
              }
            }}
          />
        </>
      ),
    })

    await vi.waitFor(() => {
      expect(events.some((event) => event.type === 'ready')).toBe(true)
    })

    expect(changes).toEqual([
      {
        value: [
          {
            _type: 'callout',
            _key: 'k1',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', text: '', marks: [], _key: 'k4'}],
              },
            ],
          },
        ],
        operations: [
          {
            inverse: {
              path: [
                {_key: 'k1'},
                'content',
                {_key: 'k0'},
                'children',
                0,
                '_key',
              ],
              type: 'unset',
            },
            path: [
              {_key: 'k1'},
              'content',
              {_key: 'k0'},
              'children',
              0,
              '_key',
            ],
            type: 'set',
            value: 'k4',
          },
        ],
        origin: 'local',
        patches: [
          {
            origin: 'local',
            path: [
              {_key: 'k1'},
              'content',
              {_key: 'k0'},
              'children',
              0,
              '_key',
            ],
            type: 'set',
            value: 'k4',
          },
        ],
        type: 'change',
      },
    ])
  })

  test('Scenario: Deleting the last block emits one local `change` with the removal, then the placeholder insert, and patches ending with `unset([])`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const changes = collectChanges(editor)

    editor.send({type: 'delete.block', at: [{_key: blockKey}]})

    const placeholderBlock = block('k4', 'k5', '')

    expect(editor.getSnapshot().context.value).toEqual([placeholderBlock])
    expect(changes).toEqual([
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
              node: block(blockKey, spanKey, 'foo'),
              position: 'before',
            },
          },
          {
            type: 'insert',
            path: [0],
            node: placeholderBlock,
            position: 'before',
            inverse: {type: 'unset', path: [{_key: 'k4'}]},
          },
        ],
        patches: [
          {...unset([{_key: blockKey}]), origin: 'local'},
          {...unset([]), origin: 'local'},
        ],
      },
    ])
  })

  test('Scenario: Undo back to empty after typing into an empty editor emits the undo, keeps the original block and ends its patches with `unset([])`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({keyGenerator})
    const changes = collectChanges(editor)
    const spanPath = [{_key: 'k0'}, 'children', {_key: 'k1'}]

    expect(editor.getSnapshot().context.value).toEqual([block('k0', 'k1', '')])

    await userEvent.click(locator)
    await userEvent.type(locator, 'f')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        block('k0', 'k1', 'f'),
      ])
    })
    changes.length = 0

    editor.send({type: 'history.undo'})

    expect(editor.getSnapshot().context.value).toEqual([block('k0', 'k1', '')])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'remove.text', path: spanPath, offset: 0, text: 'f'},
        ],
        patches: [
          {...diffMatchPatch('f', '', [...spanPath, 'text']), origin: 'local'},
          {...unset([]), origin: 'local'},
        ],
      },
    ])
  })

  test('Scenario: Selecting all and pressing Backspace emits the removals, keeps the first block and ends its patches with `unset([])`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        block(fooBlockKey, fooSpanKey, 'foo'),
        block(barBlockKey, barSpanKey, 'bar'),
      ],
    })
    const changes = collectChanges(editor)
    const fooSpanPath = [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}]
    const barSpanPath = [{_key: barBlockKey}, 'children', {_key: barSpanKey}]

    await userEvent.click(locator)
    await userEvent.keyboard('{ControlOrMeta>}a{/ControlOrMeta}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: fooSpanPath, offset: 0},
        focus: {path: barSpanPath, offset: 3},
        backward: false,
      })
    })
    changes.length = 0

    await userEvent.keyboard('{Backspace}')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        block(fooBlockKey, fooSpanKey, ''),
      ])
    })
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'remove.text', path: fooSpanPath, offset: 0, text: 'foo'},
          {type: 'remove.text', path: barSpanPath, offset: 0, text: 'bar'},
          {
            type: 'unset',
            path: [{_key: barBlockKey}],
            inverse: {
              type: 'insert',
              path: [{_key: fooBlockKey}],
              node: block(barBlockKey, barSpanKey, ''),
              position: 'after',
            },
          },
        ],
        patches: [
          {
            ...diffMatchPatch('foo', '', [...fooSpanPath, 'text']),
            origin: 'local',
          },
          {
            ...diffMatchPatch('bar', '', [...barSpanPath, 'text']),
            origin: 'local',
          },
          {...unset([{_key: barBlockKey}]), origin: 'local'},
          {...unset([]), origin: 'local'},
        ],
      },
    ])
  })

  test('Scenario: Another writer unsetting the field emits the remote `change`, then a local change with the placeholder insert and no patches', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const changes = collectChanges(editor)

    editor.send({
      type: 'apply',
      patches: [{...unset([]), origin: 'remote'}],
    })

    const placeholderBlock = block('k4', 'k5', '')

    expect(editor.getSnapshot().context.value).toEqual([placeholderBlock])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [{type: 'unset', path: []}],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'insert',
            path: [0],
            node: placeholderBlock,
            position: 'before',
          },
        ],
        patches: [],
      },
    ])
  })

  test('Scenario: Replaying a session’s `change` events gives the editor’s value, from the snapshot by `operations` and from the host’s value by local `patches`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({keyGenerator})
    const initialSnapshotValue = editor.getSnapshot().context.value
    const changes = collectChanges(editor)

    await userEvent.click(locator)
    await userEvent.type(locator, 'foo')
    await userEvent.keyboard('{Enter}')
    await userEvent.type(locator, 'bar')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        block('k0', 'k1', 'foo'),
        block('k2', 'k3', 'bar'),
      ])
    })
    await userEvent.keyboard('{ControlOrMeta>}a{/ControlOrMeta}')
    await userEvent.keyboard('{Backspace}')
    editor.send({type: 'delete.block', at: [{_key: 'k0'}]})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        block('k4', 'k5', ''),
      ])
    })
    await userEvent.click(locator)
    await userEvent.type(locator, 'baz')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        block('k4', 'k5', 'baz'),
      ])
    })

    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
    expect(replayLocalPatches(undefined, changes)).toEqual(
      editor.getSnapshot().context.value,
    )

    editor.send({type: 'history.undo'})

    expect(editor.getSnapshot().context.value).toEqual([block('k4', 'k5', '')])
    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
    // The undo empties the field again, and an empty field is the
    // placeholder.
    expect(replayLocalPatches(undefined, changes)).toEqual(undefined)
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
      type: 'apply',
      patches: [
        {
          ...set('bar', [{_key: blockKey}, 'children', 5, 'text']),
          origin: 'remote',
        },
      ],
    })
    editor.send({
      type: 'apply',
      patches: [{...set('bar', textPath), origin: 'remote'}],
    })
    consoleError.mockRestore()

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'bar'),
    ])
    expect(changes).toEqual([
      {
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
          },
        ],
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
        operation: {
          path: [],
          type: 'set',
          value: [
            {
              _key: 'k0',
              _type: 'block',
              children: [
                {
                  _key: 'k1',
                  _type: 'span',
                  marks: [],
                  text: 'foo',
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        origin: 'remote',
        type: 'operation',
      },
      {
        type: 'ready',
      },
      {
        selection: {
          anchor: {
            offset: 3,
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
            ],
          },
          backward: false,
          focus: {
            offset: 3,
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
            ],
          },
        },
        type: 'selection',
      },
      {
        operation: {
          offset: 3,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          text: '!',
          type: 'insert.text',
        },
        origin: 'local',
        type: 'operation',
      },
      {
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo!', marks: []}],
          },
        ],
        operations: [
          {
            offset: 3,
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
            ],
            text: '!',
            type: 'insert.text',
          },
        ],
        origin: 'local',
        patches: [
          {
            origin: 'local',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            type: 'diffMatchPatch',
            value: '@@ -1,3 +1,4 @@\n foo\n+!\n',
          },
        ],
        type: 'change',
      },
      {
        selection: {
          anchor: {
            offset: 4,
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
            ],
          },
          backward: false,
          focus: {
            offset: 4,
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
            ],
          },
        },
        type: 'selection',
      },
    ])
  })

  test('Scenario: A first load the editor has to fix emits only a local change with the fix', async () => {
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

    await vi.waitFor(() => {
      expect(events.some((event) => event.type === 'ready')).toBe(true)
    })

    expect(events).toEqual([
      {
        operation: {
          path: [],
          type: 'set',
          value: [
            {
              _key: 'k0',
              _type: 'block',
              children: [
                {
                  _key: 'k1',
                  _type: 'span',
                  marks: [],
                  text: 'foo',
                },
                {
                  _key: 'k1',
                  _type: 'span',
                  marks: ['strong'],
                  text: 'bar',
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        origin: 'remote',
        type: 'operation',
      },
      {
        operation: {
          inverse: {
            path: [
              {
                _key: 'k0',
              },
              'children',
              1,
              '_key',
            ],
            type: 'set',
            value: 'k1',
          },
          path: [
            {
              _key: 'k0',
            },
            'children',
            1,
            '_key',
          ],
          type: 'set',
          value: 'k4',
        },
        origin: 'remote',
        type: 'operation',
      },
      {
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: 'k1', text: 'foo', marks: []},
              {_type: 'span', _key: 'k4', text: 'bar', marks: ['strong']},
            ],
          },
        ],
        operations: [
          {
            inverse: {
              path: [
                {
                  _key: 'k0',
                },
                'children',
                1,
                '_key',
              ],
              type: 'set',
              value: 'k1',
            },
            path: [
              {
                _key: 'k0',
              },
              'children',
              1,
              '_key',
            ],
            type: 'set',
            value: 'k4',
          },
        ],
        origin: 'local',
        patches: [
          {
            origin: 'local',
            path: [
              {
                _key: 'k0',
              },
              'children',
              1,
              '_key',
            ],
            type: 'set',
            value: 'k4',
          },
        ],
        type: 'change',
      },
      {
        type: 'ready',
      },
    ])
  })

  test('Scenario: A container registered with `editor.registerNode` after load that fills existing content emits a local change with the fix', async () => {
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
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
          {
            _type: 'callout',
            _key: 'k2',
            content: [
              {
                _type: 'block',
                _key: 'k5',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k6', text: '', marks: []}],
              },
            ],
          },
        ],
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
      },
    ])
  })

  test('Scenario: A container registered with `editor.registerNode` after load that fills an empty array field emits a local change with the fix', async () => {
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
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
          {
            _type: 'callout',
            _key: 'k2',
            content: [
              {
                _type: 'block',
                _key: 'k5',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k6', text: '', marks: []}],
              },
            ],
          },
        ],
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
      },
    ])
  })

  test('Scenario: Unregistering a node after load emits a local change with the fix the editor makes to existing content', async () => {
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
      type: 'apply',
      patches: [{...insert([secondSpan], 'after', spanPath), origin: 'remote'}],
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
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foobar', marks: []}],
          },
        ],
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
      },
    ])
  })

  test('Scenario: The local `change` patches replay typing, splitting and undo', async () => {
    const keyGenerator = createTestKeyGenerator()
    const initialValue = undefined
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
    })
    const localChanges = collectLocalChanges(editor)
    const fooSpanPath = [{_key: 'k0'}, 'children', {_key: 'k1'}]
    const barSpanPath = [{_key: 'k2'}, 'children', {_key: 'k3'}]

    await userEvent.type(locator, 'foo')
    await userEvent.keyboard('{Enter}')
    await userEvent.type(locator, 'bar')
    editor.send({type: 'history.undo'})

    const sessionPatches: Array<Patch> = [
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
      expect(localChanges.flatMap((change) => change.patches)).toEqual(
        sessionPatches,
      )
    })
    expect(applyAll(initialValue, sessionPatches)).toEqual(
      editor.getSnapshot().context.value,
    )
  })

  test('Scenario: A first load with multiple blocks commits one change', async () => {
    const keyGenerator = createTestKeyGenerator()
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
      expect(committedCauses).toEqual([{type: 'load'}])
    })
    expect(editor.getSnapshot().context.value).toEqual(initialValue)
  })

  test('Scenario: A remote patch sent before the first load finishes arrives after the local fix of the load', async () => {
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
              type: 'apply',
              patches: [{...unset(firstSpanPath), origin: 'remote'}],
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
        operation: {
          path: [],
          type: 'set',
          value: [
            {
              _key: 'k0',
              _type: 'block',
              children: [
                {
                  _key: 'k1',
                  _type: 'span',
                  marks: [],
                  text: 'foo',
                },
                {
                  _key: 'k1',
                  _type: 'span',
                  marks: ['strong'],
                  text: 'bar',
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        origin: 'remote',
        type: 'operation',
      },
      {
        operation: {
          inverse: {
            path: [
              {
                _key: 'k0',
              },
              'children',
              1,
              '_key',
            ],
            type: 'set',
            value: 'k1',
          },
          path: [
            {
              _key: 'k0',
            },
            'children',
            1,
            '_key',
          ],
          type: 'set',
          value: 'k4',
        },
        origin: 'remote',
        type: 'operation',
      },
      {
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: 'k1', text: 'foo', marks: []},
              {_type: 'span', _key: 'k4', text: 'bar', marks: ['strong']},
            ],
          },
        ],
        operations: [
          {
            inverse: {
              path: [
                {
                  _key: 'k0',
                },
                'children',
                1,
                '_key',
              ],
              type: 'set',
              value: 'k1',
            },
            path: [
              {
                _key: 'k0',
              },
              'children',
              1,
              '_key',
            ],
            type: 'set',
            value: 'k4',
          },
        ],
        origin: 'local',
        patches: [
          {
            origin: 'local',
            path: [
              {
                _key: 'k0',
              },
              'children',
              1,
              '_key',
            ],
            type: 'set',
            value: 'k4',
          },
        ],
        type: 'change',
      },
      {
        type: 'ready',
      },
      {
        operation: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          type: 'unset',
        },
        origin: 'remote',
        type: 'operation',
      },
      {
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: 'k4', text: 'bar', marks: ['strong']},
            ],
          },
        ],
        operations: [
          {
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
            ],
            type: 'unset',
          },
        ],
        origin: 'remote',
        type: 'change',
      },
    ])
  })
  test('Scenario: Typing and splitting a text block inside a container emits local `change` events whose `operations` and `patches` replay to the editor’s value', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const initialValue = [
      callout(calloutKey, [block(blockKey, spanKey, 'foo')]),
    ]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutSchemaDefinition,
      initialValue,
    })
    editor.registerNode({
      node: defineContainer({type: 'callout', arrayField: 'content'}),
    })
    const initialSnapshotValue = editor.getSnapshot().context.value
    const contentPath = [{_key: calloutKey}, 'content']
    const spanPath = [
      ...contentPath,
      {_key: blockKey},
      'children',
      {_key: spanKey},
    ]
    const newSpanPath = [...contentPath, {_key: 'k5'}, 'children', {_key: 'k6'}]
    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 3},
        focus: {path: spanPath, offset: 3},
      },
    })
    const changes = collectChanges(editor)

    editor.send({type: 'insert.text', text: '!'})
    editor.send({type: 'insert.break'})
    editor.send({type: 'insert.text', text: 'bar'})

    expect(editor.getSnapshot().context.value).toEqual([
      callout(calloutKey, [
        block(blockKey, spanKey, 'foo!'),
        block('k5', 'k6', 'bar'),
      ]),
    ])
    expect(changes).toEqual([
      {
        value: [
          {
            _type: 'callout',
            _key: 'k0',
            content: [
              {
                _type: 'block',
                _key: 'k1',
                style: 'normal',
                markDefs: [],
                children: [
                  {_type: 'span', _key: 'k2', text: 'foo!', marks: []},
                ],
              },
            ],
          },
        ],
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
        value: [
          {
            _type: 'callout',
            _key: 'k0',
            content: [
              {
                _type: 'block',
                _key: 'k1',
                style: 'normal',
                markDefs: [],
                children: [
                  {_type: 'span', _key: 'k2', text: 'foo!', marks: []},
                ],
              },
              {
                _type: 'block',
                _key: 'k5',
                children: [{_type: 'span', _key: 'k6', text: '', marks: []}],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'insert',
            path: [...contentPath, {_key: blockKey}],
            position: 'after',
            node: block('k5', 'k6', ''),
            inverse: {type: 'unset', path: [...contentPath, {_key: 'k5'}]},
          },
        ],
        patches: [
          {...setIfMissing([], contentPath), origin: 'local'},
          {
            ...insert([block('k5', 'k6', '')], 'after', [
              ...contentPath,
              {_key: blockKey},
            ]),
            origin: 'local',
          },
        ],
      },
      {
        value: [
          {
            _type: 'callout',
            _key: 'k0',
            content: [
              {
                _type: 'block',
                _key: 'k1',
                style: 'normal',
                markDefs: [],
                children: [
                  {_type: 'span', _key: 'k2', text: 'foo!', marks: []},
                ],
              },
              {
                _type: 'block',
                _key: 'k5',
                children: [{_type: 'span', _key: 'k6', text: 'bar', marks: []}],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: newSpanPath, offset: 0, text: 'bar'},
        ],
        patches: [
          {
            ...diffMatchPatch('', 'bar', [...newSpanPath, 'text']),
            origin: 'local',
          },
        ],
      },
    ])
    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
    expect(replayLocalPatches(initialValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
  })

  test('Scenario: Typing and splitting a text block inside a container inside a container emits local `change` events whose `operations` and `patches` replay to the editor’s value', async () => {
    const keyGenerator = createTestKeyGenerator()
    const outerCalloutKey = keyGenerator()
    const innerCalloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const initialValue = [
      callout(outerCalloutKey, [
        callout(innerCalloutKey, [block(blockKey, spanKey, 'foo')]),
      ]),
    ]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: nestedCalloutSchemaDefinition,
      initialValue,
    })
    editor.registerNode({
      node: defineContainer({type: 'callout', arrayField: 'content'}),
    })
    const initialSnapshotValue = editor.getSnapshot().context.value
    const contentPath = [
      {_key: outerCalloutKey},
      'content',
      {_key: innerCalloutKey},
      'content',
    ]
    const spanPath = [
      ...contentPath,
      {_key: blockKey},
      'children',
      {_key: spanKey},
    ]
    const newSpanPath = [...contentPath, {_key: 'k6'}, 'children', {_key: 'k7'}]
    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 3},
        focus: {path: spanPath, offset: 3},
      },
    })
    const changes = collectChanges(editor)

    editor.send({type: 'insert.text', text: '!'})
    editor.send({type: 'insert.break'})
    editor.send({type: 'insert.text', text: 'bar'})

    expect(editor.getSnapshot().context.value).toEqual([
      callout(outerCalloutKey, [
        callout(innerCalloutKey, [
          block(blockKey, spanKey, 'foo!'),
          block('k6', 'k7', 'bar'),
        ]),
      ]),
    ])
    expect(changes).toEqual([
      {
        value: [
          {
            _type: 'callout',
            _key: 'k0',
            content: [
              {
                _type: 'callout',
                _key: 'k1',
                content: [
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: 'foo!', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
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
        value: [
          {
            _type: 'callout',
            _key: 'k0',
            content: [
              {
                _type: 'callout',
                _key: 'k1',
                content: [
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: 'foo!', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: 'k6',
                    children: [
                      {_type: 'span', _key: 'k7', text: '', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                ],
              },
            ],
          },
        ],
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'insert',
            path: [...contentPath, {_key: blockKey}],
            position: 'after',
            node: block('k6', 'k7', ''),
            inverse: {type: 'unset', path: [...contentPath, {_key: 'k6'}]},
          },
        ],
        patches: [
          {...setIfMissing([], contentPath), origin: 'local'},
          {
            ...insert([block('k6', 'k7', '')], 'after', [
              ...contentPath,
              {_key: blockKey},
            ]),
            origin: 'local',
          },
        ],
      },
      {
        value: [
          {
            _type: 'callout',
            _key: 'k0',
            content: [
              {
                _type: 'callout',
                _key: 'k1',
                content: [
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: 'foo!', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: 'k6',
                    children: [
                      {_type: 'span', _key: 'k7', text: 'bar', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                ],
              },
            ],
          },
        ],
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: newSpanPath, offset: 0, text: 'bar'},
        ],
        patches: [
          {
            ...diffMatchPatch('', 'bar', [...newSpanPath, 'text']),
            origin: 'local',
          },
        ],
      },
    ])
    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
    expect(replayLocalPatches(initialValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
  })

  test('Scenario: Typing and splitting a text block in an object field with its own sub-schema emits local `change` events whose `operations` and `patches` replay to the editor’s value', async () => {
    const keyGenerator = createTestKeyGenerator()
    const noteKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const initialValue = [note(noteKey, [emBlock(blockKey, spanKey, 'foo')])]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: noteSchemaDefinition,
      initialValue,
    })
    editor.registerNode({
      node: defineContainer({type: 'note', arrayField: 'body'}),
    })
    const initialSnapshotValue = editor.getSnapshot().context.value
    const bodyPath = [{_key: noteKey}, 'body']
    const spanPath = [
      ...bodyPath,
      {_key: blockKey},
      'children',
      {_key: spanKey},
    ]
    const newSpanPath = [...bodyPath, {_key: 'k5'}, 'children', {_key: 'k6'}]
    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 3},
        focus: {path: spanPath, offset: 3},
      },
    })
    const changes = collectChanges(editor)

    editor.send({type: 'insert.text', text: '!'})
    editor.send({type: 'insert.break'})
    editor.send({type: 'insert.text', text: 'bar'})

    expect(editor.getSnapshot().context.value).toEqual([
      note(noteKey, [
        emBlock(blockKey, spanKey, 'foo!'),
        block('k5', 'k6', 'bar'),
      ]),
    ])
    expect(changes).toEqual([
      {
        value: [
          {
            _type: 'note',
            _key: 'k0',
            body: [
              {
                _type: 'block',
                _key: 'k1',
                style: 'normal',
                markDefs: [],
                children: [
                  {_type: 'span', _key: 'k2', text: 'foo!', marks: ['em']},
                ],
              },
            ],
          },
        ],
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
        value: [
          {
            _type: 'note',
            _key: 'k0',
            body: [
              {
                _type: 'block',
                _key: 'k1',
                style: 'normal',
                markDefs: [],
                children: [
                  {_type: 'span', _key: 'k2', text: 'foo!', marks: ['em']},
                ],
              },
              {
                _type: 'block',
                _key: 'k5',
                children: [{_type: 'span', _key: 'k6', text: '', marks: []}],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'insert',
            path: [...bodyPath, {_key: blockKey}],
            position: 'after',
            node: block('k5', 'k6', ''),
            inverse: {type: 'unset', path: [...bodyPath, {_key: 'k5'}]},
          },
        ],
        patches: [
          {...setIfMissing([], bodyPath), origin: 'local'},
          {
            ...insert([block('k5', 'k6', '')], 'after', [
              ...bodyPath,
              {_key: blockKey},
            ]),
            origin: 'local',
          },
        ],
      },
      {
        value: [
          {
            _type: 'note',
            _key: 'k0',
            body: [
              {
                _type: 'block',
                _key: 'k1',
                style: 'normal',
                markDefs: [],
                children: [
                  {_type: 'span', _key: 'k2', text: 'foo!', marks: ['em']},
                ],
              },
              {
                _type: 'block',
                _key: 'k5',
                children: [{_type: 'span', _key: 'k6', text: 'bar', marks: []}],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: newSpanPath, offset: 0, text: 'bar'},
        ],
        patches: [
          {
            ...diffMatchPatch('', 'bar', [...newSpanPath, 'text']),
            origin: 'local',
          },
        ],
      },
    ])
    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
    expect(replayLocalPatches(initialValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
  })

  test('Scenario: A remote patch that removes `markDefs` from a text block inside a container emits a remote `change` with the removal', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutSchemaDefinition,
      initialValue: [callout(calloutKey, [block(blockKey, spanKey, 'foo')])],
    })
    editor.registerNode({
      node: defineContainer({type: 'callout', arrayField: 'content'}),
    })
    const initialSnapshotValue = editor.getSnapshot().context.value
    const changes = collectChanges(editor)
    const markDefsPath = [
      {_key: calloutKey},
      'content',
      {_key: blockKey},
      'markDefs',
    ]

    editor.send({
      type: 'apply',
      patches: [{...unset(markDefsPath), origin: 'remote'}],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      callout(calloutKey, [
        {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        },
      ]),
    ])
    expect(changes).toEqual([
      {
        value: [
          {
            _type: 'callout',
            _key: 'k0',
            content: [
              {
                _type: 'block',
                _key: 'k1',
                style: 'normal',
                children: [{_type: 'span', _key: 'k2', text: 'foo', marks: []}],
              },
            ],
          },
        ],
        type: 'change',
        origin: 'remote',
        operations: [{type: 'unset', path: markDefsPath}],
      },
    ])
    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
  })

  test('Scenario: A remote patch that removes `markDefs` from a text block inside a container inside a container emits a remote `change` with the removal', async () => {
    const keyGenerator = createTestKeyGenerator()
    const outerKey = keyGenerator()
    const innerKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: nestedCalloutSchemaDefinition,
      initialValue: [
        callout(outerKey, [
          callout(innerKey, [block(blockKey, spanKey, 'foo')]),
        ]),
      ],
    })
    editor.registerNode({
      node: defineContainer({type: 'callout', arrayField: 'content'}),
    })
    const initialSnapshotValue = editor.getSnapshot().context.value
    const changes = collectChanges(editor)
    const markDefsPath = [
      {_key: outerKey},
      'content',
      {_key: innerKey},
      'content',
      {_key: blockKey},
      'markDefs',
    ]

    editor.send({
      type: 'apply',
      patches: [{...unset(markDefsPath), origin: 'remote'}],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      callout(outerKey, [
        callout(innerKey, [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          },
        ]),
      ]),
    ])
    expect(changes).toEqual([
      {
        value: [
          {
            _type: 'callout',
            _key: 'k0',
            content: [
              {
                _type: 'callout',
                _key: 'k1',
                content: [
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    children: [
                      {_type: 'span', _key: 'k3', text: 'foo', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
        type: 'change',
        origin: 'remote',
        operations: [{type: 'unset', path: markDefsPath}],
      },
    ])
    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
  })

  test('Scenario: A remote patch that removes `markDefs` from a text block in an object field with its own sub-schema emits a remote `change` with the removal', async () => {
    const keyGenerator = createTestKeyGenerator()
    const noteKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: noteSchemaDefinition,
      initialValue: [note(noteKey, [emBlock(blockKey, spanKey, 'foo')])],
    })
    editor.registerNode({
      node: defineContainer({type: 'note', arrayField: 'body'}),
    })
    const initialSnapshotValue = editor.getSnapshot().context.value
    const changes = collectChanges(editor)
    const markDefsPath = [{_key: noteKey}, 'body', {_key: blockKey}, 'markDefs']

    editor.send({
      type: 'apply',
      patches: [{...unset(markDefsPath), origin: 'remote'}],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      note(noteKey, [
        {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          children: [
            {_type: 'span', _key: spanKey, text: 'foo', marks: ['em']},
          ],
        },
      ]),
    ])
    expect(changes).toEqual([
      {
        value: [
          {
            _type: 'note',
            _key: 'k0',
            body: [
              {
                _type: 'block',
                _key: 'k1',
                style: 'normal',
                children: [
                  {_type: 'span', _key: 'k2', text: 'foo', marks: ['em']},
                ],
              },
            ],
          },
        ],
        type: 'change',
        origin: 'remote',
        operations: [{type: 'unset', path: markDefsPath}],
      },
    ])
    expect(replayOperations(initialSnapshotValue, changes)).toEqual(
      editor.getSnapshot().context.value,
    )
  })
})

const calloutSchemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
  blockObjects: [
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
  ],
})

const nestedCalloutSchemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
  blockObjects: [
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'callout'}],
        },
      ],
    },
  ],
})

const noteSchemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
  blockObjects: [
    {
      name: 'note',
      fields: [
        {
          name: 'body',
          type: 'array',
          of: [{type: 'block', decorators: [{name: 'em'}]}],
        },
      ],
    },
  ],
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

function collectLocalChanges(
  editor: Editor,
): Array<Extract<ChangeEvent, {origin: 'local'}>> {
  const localChanges: Array<Extract<ChangeEvent, {origin: 'local'}>> = []
  editor.on('change', (event) => {
    if (event.origin !== 'local') {
      return
    }
    localChanges.push(event)
  })
  return localChanges
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

function callout(
  calloutKey: string,
  content: Array<PortableTextBlock>,
): PortableTextBlock {
  return {_type: 'callout', _key: calloutKey, content}
}

function note(
  noteKey: string,
  body: Array<PortableTextBlock>,
): PortableTextBlock {
  return {_type: 'note', _key: noteKey, body}
}

function emBlock(
  blockKey: string,
  spanKey: string,
  text: string,
): PortableTextBlock {
  return {
    ...block(blockKey, spanKey, text),
    children: [{_type: 'span', _key: spanKey, text, marks: ['em']}],
  }
}

function replayOperations(
  snapshotValue: Array<PortableTextBlock>,
  changes: Array<ChangeEvent>,
): Array<PortableTextBlock> {
  return changes
    .flatMap((change) => change.operations)
    .reduce(
      (value, operation) =>
        applyAll(value, [operationToPatch(value, operation)]) ?? [],
      snapshotValue,
    )
}

function replayLocalPatches(
  hostValue: Array<PortableTextBlock> | undefined,
  changes: Array<ChangeEvent>,
): Array<PortableTextBlock> | undefined {
  return changes.reduce(
    (value, change) =>
      change.origin === 'local' ? applyAll(value, change.patches) : value,
    hostValue,
  )
}

/**
 * The patch that applies `operation` to `value`, so a session's operations
 * can be replayed onto a plain copy of the snapshot.
 */
function operationToPatch(
  value: Array<PortableTextBlock>,
  operation: ChangeEvent['operations'][number],
): Patch {
  switch (operation.type) {
    case 'insert': {
      const index = operation.path.at(-1)

      if (
        operation.position === 'before' &&
        typeof index === 'number' &&
        index > 0
      ) {
        // An engine `insert` before the index one past the last node
        // appends, where the same `insert` patch does nothing.
        return insert([operation.node], 'after', [
          ...operation.path.slice(0, -1),
          index - 1,
        ])
      }

      return insert([operation.node], operation.position, operation.path)
    }
    case 'set':
      return set(operation.value, operation.path)
    case 'unset':
      return unset(operation.path)
    case 'insert.text':
    case 'remove.text': {
      const text = getTextAt(value, operation.path)

      return set(
        operation.type === 'insert.text'
          ? text.slice(0, operation.offset) +
              operation.text +
              text.slice(operation.offset)
          : text.slice(0, operation.offset) +
              text.slice(operation.offset + operation.text.length),
        [...operation.path, 'text'],
      )
    }
  }
}

function getTextAt(
  value: Array<PortableTextBlock>,
  path: ChangeEvent['operations'][number]['path'],
): string {
  const span = path.reduce<unknown>((node, segment) => {
    if (typeof segment === 'string' || typeof segment === 'number') {
      return (node as Record<string | number, unknown> | undefined)?.[segment]
    }

    if (Array.isArray(segment) || !Array.isArray(node)) {
      return undefined
    }

    return node.find(
      (candidate: {_key?: string}) => candidate._key === segment._key,
    )
  }, value)

  return (span as {text?: string} | undefined)?.text ?? ''
}

test('Scenario: A `change` listener that edits on a remote `change` gets the local fix of the remote `change` before its own edit', async () => {
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
    type: 'apply',
    patches: [
      insert([barSpan], 'after', [
        {_key: blockKey},
        'children',
        {_key: spanKey},
      ]),
    ],
  })

  expect(changes).toEqual([
    {
      value: [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: 'k1', text: 'foo', marks: []},
            {_type: 'span', _key: 'k1', text: 'bar', marks: ['strong']},
          ],
        },
      ],
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          position: 'after',
          node: barSpan,
        },
      ],
    },
    {
      value: [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: 'k1', text: 'foo', marks: []},
            {_type: 'span', _key: 'k4', text: 'bar', marks: ['strong']},
          ],
        },
      ],
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
    },
    {
      value: undefined,
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
        {
          type: 'insert',
          path: [0],
          position: 'before',
          node: block('k5', 'k6', ''),
          inverse: {type: 'unset', path: [{_key: 'k5'}]},
        },
      ],
      patches: [
        {...unset([{_key: blockKey}]), origin: 'local'},
        {...unset([]), origin: 'local'},
      ],
    },
  ])
})

test('Scenario: A Behavior event sent by an `operation` listener during an `apply` emits its own local `change` after the remote `change` so far', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: [block(blockKey, spanKey, 'foo')],
  })
  const changes = collectChanges(editor)
  const localChanges = collectLocalChanges(editor)
  const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
  const bazBlock = {
    _type: 'block',
    _key: 'k4',
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
  }
  editor.on('operation', (event) => {
    if (event.origin === 'remote' && event.operation.type === 'insert.text') {
      editor.send({
        type: 'insert.block',
        block: {_type: 'block', children: [{_type: 'span', text: 'baz'}]},
        placement: 'after',
        at: {
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 0},
        },
      })
    }
  })

  editor.send({
    type: 'apply',
    patches: [diffMatchPatch('foo', 'bar', [...spanPath, 'text'])],
  })

  expect(editor.getSnapshot().context.value).toEqual([
    block(blockKey, spanKey, 'bar'),
    bazBlock,
  ])

  expect(changes).toEqual([
    {
      value: [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
        },
      ],
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'remove.text',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 0,
          text: 'foo',
        },
        {
          type: 'insert.text',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 0,
          text: 'bar',
        },
      ],
    },
    {
      value: [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
        },
        {
          _type: 'block',
          _key: 'k4',
          children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'insert',
          path: [
            {
              _key: 'k0',
            },
          ],
          node: {
            _type: 'block',
            _key: 'k4',
            children: [
              {
                _type: 'span',
                _key: 'k5',
                text: 'baz',
                marks: [],
              },
            ],
          },
          position: 'after',
          inverse: {
            type: 'unset',
            path: [
              {
                _key: 'k4',
              },
            ],
          },
        },
        {
          type: 'set',
          path: [
            {
              _key: 'k4',
            },
            'markDefs',
          ],
          value: [],
          inverse: {
            type: 'unset',
            path: [
              {
                _key: 'k4',
              },
              'markDefs',
            ],
          },
        },
        {
          type: 'set',
          path: [
            {
              _key: 'k4',
            },
            'style',
          ],
          value: 'normal',
          inverse: {
            type: 'unset',
            path: [
              {
                _key: 'k4',
              },
              'style',
            ],
          },
        },
      ],
      patches: [
        {
          type: 'insert',
          path: [
            {
              _key: 'k0',
            },
          ],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'k4',
              children: [
                {
                  _type: 'span',
                  _key: 'k5',
                  text: 'baz',
                  marks: [],
                },
              ],
            },
          ],
          origin: 'local',
        },
        {
          type: 'set',
          path: [
            {
              _key: 'k4',
            },
            'markDefs',
          ],
          value: [],
          origin: 'local',
        },
        {
          type: 'set',
          path: [
            {
              _key: 'k4',
            },
            'style',
          ],
          value: 'normal',
          origin: 'local',
        },
      ],
    },
  ])

  editor.send({
    type: 'insert.text',
    at: spanPath,
    offset: 3,
    text: '!',
  })

  await vi.waitFor(() => {
    expect(localChanges.flatMap((event) => event.patches)).toEqual([
      {
        type: 'insert',
        path: [
          {
            _key: 'k0',
          },
        ],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: 'k4',
            children: [
              {
                _type: 'span',
                _key: 'k5',
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
        origin: 'local',
      },
      {
        type: 'set',
        path: [
          {
            _key: 'k4',
          },
          'markDefs',
        ],
        value: [],
        origin: 'local',
      },
      {
        type: 'set',
        path: [
          {
            _key: 'k4',
          },
          'style',
        ],
        value: 'normal',
        origin: 'local',
      },
      {
        type: 'diffMatchPatch',
        path: [
          {
            _key: 'k0',
          },
          'children',
          {
            _key: 'k1',
          },
          'text',
        ],
        value: '@@ -1,3 +1,4 @@\n bar\n+!\n',
        origin: 'local',
      },
    ])
    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'bar!'),
      bazBlock,
    ])
  })
})

test('Scenario: A container registered by an `operation` listener during an `apply` is registered and its empty field gets a local change', async () => {
  const calloutSchemaDefinition = defineSchema({
    decorators: [{name: 'strong'}],
    blockObjects: [
      {
        name: 'callout',
        fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
      },
    ],
  })
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const calloutKey = keyGenerator()
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: calloutSchemaDefinition,
    initialValue: [
      block(blockKey, spanKey, 'foo'),
      {_type: 'callout', _key: calloutKey},
    ],
  })
  const changes = collectChanges(editor)
  const patches: Array<Patch> = []
  editor.on('change', (event) => {
    if (event.origin !== 'local') {
      return
    }
    for (const changePatch of event.patches) {
      patches.push(changePatch)
    }
  })
  const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
  editor.on('operation', (event) => {
    if (event.origin === 'remote' && event.operation.type === 'insert.text') {
      editor.registerNode({
        node: defineContainer({type: 'callout', arrayField: 'content'}),
      })
    }
  })

  editor.send({
    type: 'apply',
    patches: [diffMatchPatch('foo', 'bar', [...spanPath, 'text'])],
  })

  expect(editor.getSnapshot().context.containers.has('callout')).toEqual(true)
  expect(editor.getSnapshot().context.value).toEqual([
    block(blockKey, spanKey, 'bar'),
    {_type: 'callout', _key: calloutKey, content: [block('k5', 'k6', '')]},
  ])

  expect(changes).toEqual([
    {
      value: [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
        },
        {_type: 'callout', _key: 'k2'},
      ],
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'remove.text',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 0,
          text: 'foo',
        },
        {
          type: 'insert.text',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 0,
          text: 'bar',
        },
      ],
    },
    {
      value: [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
        },
        {
          _type: 'callout',
          _key: 'k2',
          content: [
            {
              _type: 'block',
              _key: 'k5',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k6', text: '', marks: []}],
            },
          ],
        },
      ],
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'set',
          path: [
            {
              _key: 'k2',
            },
            'content',
          ],
          value: [
            {
              _type: 'block',
              _key: 'k5',
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: 'k6',
                  text: '',
                  marks: [],
                },
              ],
            },
          ],
          inverse: {
            type: 'unset',
            path: [
              {
                _key: 'k2',
              },
              'content',
            ],
          },
        },
      ],
      patches: [
        {
          type: 'set',
          path: [
            {
              _key: 'k2',
            },
            'content',
          ],
          value: [
            {
              _type: 'block',
              _key: 'k5',
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: 'k6',
                  text: '',
                  marks: [],
                },
              ],
            },
          ],
          origin: 'local',
        },
      ],
    },
  ])
  await vi.waitFor(() =>
    expect(patches).toEqual([
      {
        type: 'set',
        path: [
          {
            _key: 'k2',
          },
          'content',
        ],
        value: [
          {
            _type: 'block',
            _key: 'k5',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k6',
                text: '',
                marks: [],
              },
            ],
          },
        ],
        origin: 'local',
      },
    ]),
  )
})

test('Scenario: A Behavior event sent by an `operation` listener during an `apply` of a container emits its own local `change` after the remote `change` so far', async () => {
  const calloutSchemaDefinition = defineSchema({
    decorators: [{name: 'strong'}],
    blockObjects: [
      {
        name: 'callout',
        fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
      },
    ],
  })
  const keyGenerator = createTestKeyGenerator()
  const calloutKey = keyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: calloutSchemaDefinition,
    initialValue: [callout(calloutKey, [block(blockKey, spanKey, 'foo')])],
  })
  editor.registerNode({
    node: defineContainer({type: 'callout', arrayField: 'content'}),
  })
  const changes = collectChanges(editor)
  const localChanges = collectLocalChanges(editor)
  const contentPath = [{_key: calloutKey}, 'content']
  const spanPath = [
    ...contentPath,
    {_key: blockKey},
    'children',
    {_key: spanKey},
  ]
  const bazBlock = {
    _type: 'block',
    _key: 'k5',
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: 'k6', text: 'baz', marks: []}],
  }
  editor.on('operation', (event) => {
    if (event.origin === 'remote' && event.operation.type === 'set') {
      editor.send({
        type: 'insert.block',
        block: {_type: 'block', children: [{_type: 'span', text: 'baz'}]},
        placement: 'after',
        at: {
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 0},
        },
      })
    }
  })

  editor.send({
    type: 'apply',
    patches: [set([block(blockKey, spanKey, 'bar')], contentPath)],
  })

  expect(editor.getSnapshot().context.value).toEqual([
    callout(calloutKey, [block(blockKey, spanKey, 'bar'), bazBlock]),
  ])

  expect(changes).toEqual([
    {
      value: [
        {
          _type: 'callout',
          _key: 'k0',
          content: [
            {
              _type: 'block',
              _key: 'k1',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k2', text: 'bar', marks: []}],
            },
          ],
        },
      ],
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [
            {
              _key: 'k0',
            },
            'content',
          ],
          value: [
            {
              _type: 'block',
              _key: 'k1',
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: 'k2',
                  text: 'bar',
                  marks: [],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      value: [
        {
          _type: 'callout',
          _key: 'k0',
          content: [
            {
              _type: 'block',
              _key: 'k1',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k2', text: 'bar', marks: []}],
            },
            {
              _type: 'block',
              _key: 'k5',
              children: [{_type: 'span', _key: 'k6', text: 'baz', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'insert',
          path: [
            {
              _key: 'k0',
            },
            'content',
            {
              _key: 'k1',
            },
          ],
          node: {
            _type: 'block',
            _key: 'k5',
            children: [
              {
                _type: 'span',
                _key: 'k6',
                text: 'baz',
                marks: [],
              },
            ],
          },
          position: 'after',
          inverse: {
            type: 'unset',
            path: [
              {
                _key: 'k0',
              },
              'content',
              {
                _key: 'k5',
              },
            ],
          },
        },
        {
          type: 'set',
          path: [
            {
              _key: 'k0',
            },
            'content',
            {
              _key: 'k5',
            },
            'markDefs',
          ],
          value: [],
          inverse: {
            type: 'unset',
            path: [
              {
                _key: 'k0',
              },
              'content',
              {
                _key: 'k5',
              },
              'markDefs',
            ],
          },
        },
        {
          type: 'set',
          path: [
            {
              _key: 'k0',
            },
            'content',
            {
              _key: 'k5',
            },
            'style',
          ],
          value: 'normal',
          inverse: {
            type: 'unset',
            path: [
              {
                _key: 'k0',
              },
              'content',
              {
                _key: 'k5',
              },
              'style',
            ],
          },
        },
      ],
      patches: [
        {
          type: 'setIfMissing',
          path: [
            {
              _key: 'k0',
            },
            'content',
          ],
          value: [],
          origin: 'local',
        },
        {
          type: 'insert',
          path: [
            {
              _key: 'k0',
            },
            'content',
            {
              _key: 'k1',
            },
          ],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'k5',
              children: [
                {
                  _type: 'span',
                  _key: 'k6',
                  text: 'baz',
                  marks: [],
                },
              ],
            },
          ],
          origin: 'local',
        },
        {
          type: 'set',
          path: [
            {
              _key: 'k0',
            },
            'content',
            {
              _key: 'k5',
            },
            'markDefs',
          ],
          value: [],
          origin: 'local',
        },
        {
          type: 'set',
          path: [
            {
              _key: 'k0',
            },
            'content',
            {
              _key: 'k5',
            },
            'style',
          ],
          value: 'normal',
          origin: 'local',
        },
      ],
    },
  ])

  editor.send({
    type: 'insert.text',
    at: spanPath,
    offset: 3,
    text: '!',
  })

  await vi.waitFor(() => {
    expect(localChanges.flatMap((event) => event.patches)).toEqual([
      {
        type: 'setIfMissing',
        path: [
          {
            _key: 'k0',
          },
          'content',
        ],
        value: [],
        origin: 'local',
      },
      {
        type: 'insert',
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k1',
          },
        ],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: 'k5',
            children: [
              {
                _type: 'span',
                _key: 'k6',
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
        origin: 'local',
      },
      {
        type: 'set',
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k5',
          },
          'markDefs',
        ],
        value: [],
        origin: 'local',
      },
      {
        type: 'set',
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k5',
          },
          'style',
        ],
        value: 'normal',
        origin: 'local',
      },
      {
        type: 'diffMatchPatch',
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k1',
          },
          'children',
          {
            _key: 'k2',
          },
          'text',
        ],
        value: '@@ -1,3 +1,4 @@\n bar\n+!\n',
        origin: 'local',
      },
    ])
    expect(editor.getSnapshot().context.value).toEqual([
      callout(calloutKey, [block(blockKey, spanKey, 'bar!'), bazBlock]),
    ])
  })
})

test('Scenario: An initial local fix at root reaches a change host without legacy events', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()

  let hostValue: Array<PortableTextBlock> | undefined = [
    {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', text: 'foo', marks: []}],
    },
  ]
  const legacyEvents: Array<EditorEmittedEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue),

    children: (
      <>
        <RemovedEventListeners events={legacyEvents} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change' && event.origin === 'local') {
              hostValue = applyAll(hostValue, event.patches)
            }
          }}
        />
      </>
    ),
  })
  expect(hostValue).toEqual(editor.getSnapshot().context.value)
  const correctedSpanPath = [{_key: blockKey}, 'children', 0]
  editor.send({
    type: 'select',
    at: {
      anchor: {path: correctedSpanPath, offset: 3},
      focus: {path: correctedSpanPath, offset: 3},
    },
  })
  editor.send({type: 'insert.text', text: 'bar'})
  expect(hostValue).toEqual(editor.getSnapshot().context.value)
  expect(legacyEvents).toEqual([])
})

test('Scenario: A read-only collaborator local fix at root reaches a change host without legacy events', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()

  let hostValue: Array<PortableTextBlock> | undefined = [
    {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
    },
  ]
  const legacyEvents: Array<EditorEmittedEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue),

    children: (
      <>
        <RemovedEventListeners events={legacyEvents} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change' && event.origin === 'local') {
              hostValue = applyAll(hostValue, event.patches)
            }
          }}
        />
      </>
    ),
  })
  editor.send({type: 'update readOnly', readOnly: true})
  const incomingPatches = [
    unset([{_key: blockKey}, 'children', {_key: spanKey}, '_key']),
  ]
  hostValue = applyAll(hostValue, incomingPatches)
  editor.send({type: 'apply', patches: incomingPatches})
  expect(hostValue).toEqual(editor.getSnapshot().context.value)
  editor.send({type: 'update readOnly', readOnly: false})
  const correctedSpanPath = [{_key: blockKey}, 'children', 0]
  editor.send({
    type: 'select',
    at: {
      anchor: {path: correctedSpanPath, offset: 3},
      focus: {path: correctedSpanPath, offset: 3},
    },
  })
  editor.send({type: 'insert.text', text: 'bar'})
  expect(hostValue).toEqual(editor.getSnapshot().context.value)
  expect(legacyEvents).toEqual([])
})

test('Scenario: An initial local fix inside a callout reaches a change host without legacy events', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const calloutKey = keyGenerator()
  let hostValue: Array<PortableTextBlock> | undefined = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', text: 'foo', marks: []}],
        },
      ],
    },
  ]
  const legacyEvents: Array<EditorEmittedEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue),
    schemaDefinition: calloutSchemaDefinition,
    children: (
      <>
        <RemovedEventListeners events={legacyEvents} />
        <NodePlugin
          nodes={[defineContainer({type: 'callout', arrayField: 'content'})]}
        />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change' && event.origin === 'local') {
              hostValue = applyAll(hostValue, event.patches)
            }
          }}
        />
      </>
    ),
  })
  expect(hostValue).toEqual(editor.getSnapshot().context.value)
  const correctedSpanPath = [
    {_key: calloutKey},
    'content',
    {_key: blockKey},
    'children',
    0,
  ]
  editor.send({
    type: 'select',
    at: {
      anchor: {path: correctedSpanPath, offset: 3},
      focus: {path: correctedSpanPath, offset: 3},
    },
  })
  editor.send({type: 'insert.text', text: 'bar'})
  expect(hostValue).toEqual(editor.getSnapshot().context.value)
  expect(legacyEvents).toEqual([])
})

test('Scenario: A read-only collaborator local fix inside a callout reaches a change host without legacy events', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const calloutKey = keyGenerator()
  let hostValue: Array<PortableTextBlock> | undefined = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        },
      ],
    },
  ]
  const legacyEvents: Array<EditorEmittedEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue),
    schemaDefinition: calloutSchemaDefinition,
    children: (
      <>
        <RemovedEventListeners events={legacyEvents} />
        <NodePlugin
          nodes={[defineContainer({type: 'callout', arrayField: 'content'})]}
        />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change' && event.origin === 'local') {
              hostValue = applyAll(hostValue, event.patches)
            }
          }}
        />
      </>
    ),
  })
  editor.send({type: 'update readOnly', readOnly: true})
  const incomingPatches = [
    unset([
      {_key: calloutKey},
      'content',
      {_key: blockKey},
      'children',
      {_key: spanKey},
      '_key',
    ]),
  ]
  hostValue = applyAll(hostValue, incomingPatches)
  editor.send({type: 'apply', patches: incomingPatches})
  expect(hostValue).toEqual(editor.getSnapshot().context.value)
  editor.send({type: 'update readOnly', readOnly: false})
  const correctedSpanPath = [
    {_key: calloutKey},
    'content',
    {_key: blockKey},
    'children',
    0,
  ]
  editor.send({
    type: 'select',
    at: {
      anchor: {path: correctedSpanPath, offset: 3},
      focus: {path: correctedSpanPath, offset: 3},
    },
  })
  editor.send({type: 'insert.text', text: 'bar'})
  expect(hostValue).toEqual(editor.getSnapshot().context.value)
  expect(legacyEvents).toEqual([])
})

function RemovedEventListeners(props: {events: Array<EditorEmittedEvent>}) {
  const editor = useEditor()
  useEffect(() => {
    const mutationSubscription = editor.on('mutation' as never, (event) => {
      props.events.push(event)
    })
    const patchSubscription = editor.on('patch' as never, (event) => {
      props.events.push(event)
    })
    return () => {
      mutationSubscription.unsubscribe()
      patchSubscription.unsubscribe()
    }
  }, [editor, props.events])
  return null
}

test('Scenario: A remote root unset carries an absent value on both changes', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = undefined
  editor.send({type: 'apply', patches: [{type: 'unset', path: []}]})
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [{type: 'unset', path: []}],
        value: undefined,
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'insert',
            path: [0],
            node: {
              _type: 'block',
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
            },
            position: 'before',
          },
        ],
        patches: [],
        value: undefined,
      },
    ])
    expect(hostValue).toEqual(undefined)
  })

  expect(Object.hasOwn(changes[0] ?? {}, 'value')).toEqual(true)
  expect(Object.hasOwn(changes[1] ?? {}, 'value')).toEqual(true)
})

test('Scenario: A remote root empty array carries an empty value on both changes', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = []
  editor.send({type: 'apply', patches: [{type: 'set', path: [], value: []}]})
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [],
        operations: [{type: 'set', path: [], value: []}],
      },
      {
        type: 'change',
        origin: 'local',
        value: [],
        operations: [
          {
            type: 'insert',
            path: [0],
            node: {
              _type: 'block',
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
            },
            position: 'before',
          },
        ],
        patches: [],
      },
    ])
    expect(hostValue).toEqual([])
  })
})

test('Scenario: Removing the only block remotely carries an empty array on both changes', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = []
  editor.send({type: 'apply', patches: [{type: 'unset', path: [{_key: 'k0'}]}]})
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [],
        operations: [{type: 'unset', path: [{_key: 'k0'}]}],
      },
      {
        type: 'change',
        origin: 'local',
        value: [],
        operations: [
          {
            type: 'insert',
            path: [0],
            node: {
              _type: 'block',
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
            },
            position: 'before',
          },
        ],
        patches: [],
      },
    ])
    expect(hostValue).toEqual([])
  })
})

test('Scenario: A keyed whole block set to null alone carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [null]
  editor.send({
    type: 'apply',
    patches: [
      {type: 'set', path: [{_key: 'k0'}], value: null as unknown as JSONValue},
    ],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [null],
        operations: [{type: 'set', path: [{_key: 'k0'}], value: null}],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'unset', path: [0]},
          {
            type: 'insert',
            path: [0],
            node: {
              _type: 'block',
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
            },
            position: 'before',
          },
        ],
        patches: [
          {type: 'setIfMissing', path: [], value: [], origin: 'local'},
          {
            type: 'insert',
            path: [0],
            position: 'before',
            items: [null],
            origin: 'local',
          },
          {type: 'unset', path: [0], origin: 'local'},
          {type: 'unset', path: [], origin: 'local'},
        ],
        value: undefined,
      },
    ])
    expect(hostValue).toEqual(undefined)
  })
})

test('Scenario: A keyed whole block set to string alone carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = ['foo']
  editor.send({
    type: 'apply',
    patches: [{type: 'set', path: [{_key: 'k0'}], value: 'foo'}],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: ['foo'],
        operations: [{type: 'set', path: [{_key: 'k0'}], value: 'foo'}],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'unset', path: [0]},
          {
            type: 'insert',
            path: [0],
            node: {
              _type: 'block',
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
            },
            position: 'before',
          },
        ],
        patches: [
          {type: 'unset', path: [0], origin: 'local'},
          {type: 'unset', path: [], origin: 'local'},
        ],
        value: undefined,
      },
    ])
    expect(hostValue).toEqual(undefined)
  })
})

test('Scenario: A keyed whole block set to a block without children alone carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [{_type: 'block', _key: 'k0', style: 'normal', markDefs: []}]
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: 'k0'}],
        value: {_type: 'block', _key: 'k0', style: 'normal', markDefs: []},
      },
    ],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [{_type: 'block', _key: 'k0', style: 'normal', markDefs: []}],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}],
            value: {_type: 'block', _key: 'k0', style: 'normal', markDefs: []},
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children'],
            value: [],
            inverse: {type: 'unset', path: [{_key: 'k0'}, 'children']},
          },
          {
            type: 'insert',
            path: [{_key: 'k0'}, 'children', 0],
            node: {_type: 'span', _key: 'k4', text: '', marks: []},
            position: 'before',
          },
        ],
        patches: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children'],
            value: [],
            origin: 'local',
          },
          {
            type: 'setIfMissing',
            path: [{_key: 'k0'}, 'children'],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [{_key: 'k0'}, 'children', 0],
            position: 'before',
            items: [{_type: 'span', _key: 'k4', text: '', marks: []}],
            origin: 'local',
          },
          {type: 'unset', path: [], origin: 'local'},
        ],
        value: undefined,
      },
    ])
    expect(hostValue).toEqual(undefined)
  })
})

test('Scenario: A keyed whole span set to null alone carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [null],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        value: null as unknown as JSONValue,
      },
    ],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [null],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
            value: null,
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'unset', path: [{_key: 'k0'}, 'children', 0]},
          {
            type: 'insert',
            path: [{_key: 'k0'}, 'children', 0],
            node: {_type: 'span', _key: 'k4', text: '', marks: []},
            position: 'before',
          },
        ],
        patches: [
          {type: 'unset', path: [{_key: 'k0'}, 'children', 0], origin: 'local'},
          {
            type: 'setIfMissing',
            path: [{_key: 'k0'}, 'children'],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [{_key: 'k0'}, 'children', 0],
            position: 'before',
            items: [{_type: 'span', _key: 'k4', text: '', marks: []}],
            origin: 'local',
          },
          {type: 'unset', path: [], origin: 'local'},
        ],
        value: undefined,
      },
    ])
    expect(hostValue).toEqual(undefined)
  })
})

test('Scenario: A keyed whole span set to string alone carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: ['foo'],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        value: 'foo',
      },
    ],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: ['foo'],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
            value: 'foo',
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'unset', path: [{_key: 'k0'}, 'children', 0]},
          {
            type: 'insert',
            path: [{_key: 'k0'}, 'children', 0],
            node: {_type: 'span', _key: 'k4', text: '', marks: []},
            position: 'before',
          },
        ],
        patches: [
          {type: 'unset', path: [{_key: 'k0'}, 'children', 0], origin: 'local'},
          {
            type: 'setIfMissing',
            path: [{_key: 'k0'}, 'children'],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [{_key: 'k0'}, 'children', 0],
            position: 'before',
            items: [{_type: 'span', _key: 'k4', text: '', marks: []}],
            origin: 'local',
          },
          {type: 'unset', path: [], origin: 'local'},
        ],
        value: undefined,
      },
    ])
    expect(hostValue).toEqual(undefined)
  })
})

test('Scenario: A keyed children array with a keyless span alone carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', text: 'bar', marks: []}],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: 'k0'}, 'children'],
        value: [{_type: 'span', text: 'bar', marks: []}],
      },
    ],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', text: 'bar', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children'],
            value: [{_type: 'span', text: 'bar', marks: []}],
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', text: 'bar', marks: [], _key: 'k4'}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', 0, '_key'],
            value: 'k4',
            inverse: {
              type: 'unset',
              path: [{_key: 'k0'}, 'children', 0, '_key'],
            },
          },
        ],
        patches: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', 0, '_key'],
            value: 'k4',
            origin: 'local',
          },
        ],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', text: 'bar', marks: [], _key: 'k4'}],
      },
    ])
  })
})

test('Scenario: A keyed whole span set to a keyless span alone carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', text: 'bar', marks: []}],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        value: {_type: 'span', text: 'bar', marks: []},
      },
    ],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', text: 'bar', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
            value: {_type: 'span', text: 'bar', marks: []},
          },
        ],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', text: 'bar', marks: []}],
      },
    ])
  })
})

test('Scenario: An indexed whole block set to null alone carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [null]
  editor.send({
    type: 'apply',
    patches: [{type: 'set', path: [0], value: null as unknown as JSONValue}],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [null],
        operations: [{type: 'set', path: [0], value: null}],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'unset', path: [0]},
          {
            type: 'insert',
            path: [0],
            node: {
              _type: 'block',
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
            },
            position: 'before',
          },
        ],
        patches: [
          {type: 'setIfMissing', path: [], value: [], origin: 'local'},
          {
            type: 'insert',
            path: [0],
            position: 'before',
            items: [null],
            origin: 'local',
          },
          {type: 'unset', path: [0], origin: 'local'},
          {type: 'unset', path: [], origin: 'local'},
        ],
        value: undefined,
      },
    ])
    expect(hostValue).toEqual(undefined)
  })
})

test('Scenario: An indexed whole block set to string alone carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = ['foo']
  editor.send({
    type: 'apply',
    patches: [{type: 'set', path: [0], value: 'foo'}],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: ['foo'],
        operations: [{type: 'set', path: [0], value: 'foo'}],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'unset', path: [0]},
          {
            type: 'insert',
            path: [0],
            node: {
              _type: 'block',
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
            },
            position: 'before',
          },
        ],
        patches: [
          {type: 'unset', path: [0], origin: 'local'},
          {type: 'unset', path: [], origin: 'local'},
        ],
        value: undefined,
      },
    ])
    expect(hostValue).toEqual(undefined)
  })
})

test('Scenario: An indexed whole block set to a block without children alone carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [{_type: 'block', _key: 'k0', style: 'normal', markDefs: []}]
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [0],
        value: {_type: 'block', _key: 'k0', style: 'normal', markDefs: []},
      },
    ],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [{_type: 'block', _key: 'k0', style: 'normal', markDefs: []}],
        operations: [
          {
            type: 'set',
            path: [0],
            value: {_type: 'block', _key: 'k0', style: 'normal', markDefs: []},
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children'],
            value: [],
            inverse: {type: 'unset', path: [{_key: 'k0'}, 'children']},
          },
          {
            type: 'insert',
            path: [{_key: 'k0'}, 'children', 0],
            node: {_type: 'span', _key: 'k4', text: '', marks: []},
            position: 'before',
          },
        ],
        patches: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children'],
            value: [],
            origin: 'local',
          },
          {
            type: 'setIfMissing',
            path: [{_key: 'k0'}, 'children'],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [{_key: 'k0'}, 'children', 0],
            position: 'before',
            items: [{_type: 'span', _key: 'k4', text: '', marks: []}],
            origin: 'local',
          },
          {type: 'unset', path: [], origin: 'local'},
        ],
        value: undefined,
      },
    ])
    expect(hostValue).toEqual(undefined)
  })
})

test('Scenario: An indexed whole span set to null alone carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [null],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [0, 'children', 0],
        value: null as unknown as JSONValue,
      },
    ],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [null],
          },
        ],
        operations: [{type: 'set', path: [0, 'children', 0], value: null}],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'unset', path: [{_key: 'k0'}, 'children', 0]},
          {
            type: 'insert',
            path: [{_key: 'k0'}, 'children', 0],
            node: {_type: 'span', _key: 'k4', text: '', marks: []},
            position: 'before',
          },
        ],
        patches: [
          {type: 'unset', path: [{_key: 'k0'}, 'children', 0], origin: 'local'},
          {
            type: 'setIfMissing',
            path: [{_key: 'k0'}, 'children'],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [{_key: 'k0'}, 'children', 0],
            position: 'before',
            items: [{_type: 'span', _key: 'k4', text: '', marks: []}],
            origin: 'local',
          },
          {type: 'unset', path: [], origin: 'local'},
        ],
        value: undefined,
      },
    ])
    expect(hostValue).toEqual(undefined)
  })
})

test('Scenario: An indexed whole span set to string alone carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: ['foo'],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [{type: 'set', path: [0, 'children', 0], value: 'foo'}],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: ['foo'],
          },
        ],
        operations: [{type: 'set', path: [0, 'children', 0], value: 'foo'}],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'unset', path: [{_key: 'k0'}, 'children', 0]},
          {
            type: 'insert',
            path: [{_key: 'k0'}, 'children', 0],
            node: {_type: 'span', _key: 'k4', text: '', marks: []},
            position: 'before',
          },
        ],
        patches: [
          {type: 'unset', path: [{_key: 'k0'}, 'children', 0], origin: 'local'},
          {
            type: 'setIfMissing',
            path: [{_key: 'k0'}, 'children'],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [{_key: 'k0'}, 'children', 0],
            position: 'before',
            items: [{_type: 'span', _key: 'k4', text: '', marks: []}],
            origin: 'local',
          },
          {type: 'unset', path: [], origin: 'local'},
        ],
        value: undefined,
      },
    ])
    expect(hostValue).toEqual(undefined)
  })
})

test('Scenario: An indexed children array with a keyless span alone carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', text: 'bar', marks: []}],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [0, 'children'],
        value: [{_type: 'span', text: 'bar', marks: []}],
      },
    ],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', text: 'bar', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [0, 'children'],
            value: [{_type: 'span', text: 'bar', marks: []}],
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', text: 'bar', marks: [], _key: 'k4'}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', 0, '_key'],
            value: 'k4',
            inverse: {
              type: 'unset',
              path: [{_key: 'k0'}, 'children', 0, '_key'],
            },
          },
        ],
        patches: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', 0, '_key'],
            value: 'k4',
            origin: 'local',
          },
        ],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', text: 'bar', marks: [], _key: 'k4'}],
      },
    ])
  })
})

test('Scenario: An indexed whole span set to a keyless span alone carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', text: 'bar', marks: []}],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [0, 'children', 0],
        value: {_type: 'span', text: 'bar', marks: []},
      },
    ],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', text: 'bar', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [0, 'children', 0],
            value: {_type: 'span', text: 'bar', marks: []},
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', text: 'bar', marks: [], _key: 'k4'}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', 0, '_key'],
            value: 'k4',
            inverse: {
              type: 'unset',
              path: [{_key: 'k0'}, 'children', 0, '_key'],
            },
          },
        ],
        patches: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', 0, '_key'],
            value: 'k4',
            origin: 'local',
          },
        ],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', text: 'bar', marks: [], _key: 'k4'}],
      },
    ])
  })
})

test('Scenario: A keyed whole block set to null among siblings carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondBlockKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const thirdBlockKey = keyGenerator()
  const thirdSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: secondBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: secondSpanKey, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: thirdBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: thirdSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [
    null,
    {
      _type: 'block',
      _key: 'k2',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      {type: 'set', path: [{_key: 'k0'}], value: null as unknown as JSONValue},
    ],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          null,
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [{type: 'set', path: [{_key: 'k0'}], value: null}],
      },
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [{type: 'unset', path: [0]}],
        patches: [{type: 'unset', path: [0], origin: 'local'}],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
      },
    ])
  })
})

test('Scenario: A keyed whole block set to string among siblings carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondBlockKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const thirdBlockKey = keyGenerator()
  const thirdSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: secondBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: secondSpanKey, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: thirdBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: thirdSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [
    'foo',
    {
      _type: 'block',
      _key: 'k2',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [{type: 'set', path: [{_key: 'k0'}], value: 'foo'}],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          'foo',
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [{type: 'set', path: [{_key: 'k0'}], value: 'foo'}],
      },
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [{type: 'unset', path: [0]}],
        patches: [{type: 'unset', path: [0], origin: 'local'}],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
      },
    ])
  })
})

test('Scenario: A keyed whole block set to a block without children among siblings carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondBlockKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const thirdBlockKey = keyGenerator()
  const thirdSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: secondBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: secondSpanKey, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: thirdBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: thirdSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [
    {_type: 'block', _key: 'k0', style: 'normal', markDefs: []},
    {
      _type: 'block',
      _key: 'k2',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: 'k0'}],
        value: {_type: 'block', _key: 'k0', style: 'normal', markDefs: []},
      },
    ],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          {_type: 'block', _key: 'k0', style: 'normal', markDefs: []},
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}],
            value: {_type: 'block', _key: 'k0', style: 'normal', markDefs: []},
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k8', text: '', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children'],
            value: [],
            inverse: {type: 'unset', path: [{_key: 'k0'}, 'children']},
          },
          {
            type: 'insert',
            path: [{_key: 'k0'}, 'children', 0],
            node: {_type: 'span', _key: 'k8', text: '', marks: []},
            position: 'before',
          },
        ],
        patches: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children'],
            value: [],
            origin: 'local',
          },
          {
            type: 'setIfMissing',
            path: [{_key: 'k0'}, 'children'],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [{_key: 'k0'}, 'children', 0],
            position: 'before',
            items: [{_type: 'span', _key: 'k8', text: '', marks: []}],
            origin: 'local',
          },
        ],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k8', text: '', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
      },
    ])
  })
})

test('Scenario: A keyed whole span set to null among siblings carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondBlockKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const thirdBlockKey = keyGenerator()
  const thirdSpanKey = keyGenerator()
  const strongSpanKey = keyGenerator()
  const emSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: firstSpanKey, text: 'foo', marks: []},
        {_type: 'span', _key: strongSpanKey, text: 'bar', marks: ['strong']},
        {_type: 'span', _key: emSpanKey, text: 'baz', marks: ['em']},
      ],
    },
    {
      _type: 'block',
      _key: secondBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: secondSpanKey, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: thirdBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: thirdSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [
        null,
        {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
        {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
      ],
    },
    {
      _type: 'block',
      _key: 'k2',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        value: null as unknown as JSONValue,
      },
    ],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              null,
              {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
              {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
            ],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
            value: null,
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
              {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
            ],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [{type: 'unset', path: [{_key: 'k0'}, 'children', 0]}],
        patches: [
          {type: 'unset', path: [{_key: 'k0'}, 'children', 0], origin: 'local'},
        ],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
          {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
        ],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
      },
    ])
  })
})

test('Scenario: A keyed whole span set to string among siblings carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondBlockKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const thirdBlockKey = keyGenerator()
  const thirdSpanKey = keyGenerator()
  const strongSpanKey = keyGenerator()
  const emSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: firstSpanKey, text: 'foo', marks: []},
        {_type: 'span', _key: strongSpanKey, text: 'bar', marks: ['strong']},
        {_type: 'span', _key: emSpanKey, text: 'baz', marks: ['em']},
      ],
    },
    {
      _type: 'block',
      _key: secondBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: secondSpanKey, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: thirdBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: thirdSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [
        'foo',
        {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
        {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
      ],
    },
    {
      _type: 'block',
      _key: 'k2',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        value: 'foo',
      },
    ],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              'foo',
              {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
              {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
            ],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
            value: 'foo',
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
              {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
            ],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [{type: 'unset', path: [{_key: 'k0'}, 'children', 0]}],
        patches: [
          {type: 'unset', path: [{_key: 'k0'}, 'children', 0], origin: 'local'},
        ],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
          {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
        ],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
      },
    ])
  })
})

test('Scenario: A keyed children array with a keyless span among siblings carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondBlockKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const thirdBlockKey = keyGenerator()
  const thirdSpanKey = keyGenerator()
  const strongSpanKey = keyGenerator()
  const emSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: firstSpanKey, text: 'foo', marks: []},
        {_type: 'span', _key: strongSpanKey, text: 'bar', marks: ['strong']},
        {_type: 'span', _key: emSpanKey, text: 'baz', marks: ['em']},
      ],
    },
    {
      _type: 'block',
      _key: secondBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: secondSpanKey, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: thirdBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: thirdSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', text: 'bar', marks: []},
        {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
        {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
      ],
    },
    {
      _type: 'block',
      _key: 'k2',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: 'k0'}, 'children'],
        value: [
          {_type: 'span', text: 'bar', marks: []},
          {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
          {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
        ],
      },
    ],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', text: 'bar', marks: []},
              {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
              {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
            ],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children'],
            value: [
              {_type: 'span', text: 'bar', marks: []},
              {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
              {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
            ],
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', text: 'bar', marks: [], _key: 'k10'},
              {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
              {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
            ],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', 0, '_key'],
            value: 'k10',
            inverse: {
              type: 'unset',
              path: [{_key: 'k0'}, 'children', 0, '_key'],
            },
          },
        ],
        patches: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', 0, '_key'],
            value: 'k10',
            origin: 'local',
          },
        ],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', text: 'bar', marks: [], _key: 'k10'},
          {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
          {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
        ],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
      },
    ])
  })
})

test('Scenario: A keyed whole span set to a keyless span among siblings carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondBlockKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const thirdBlockKey = keyGenerator()
  const thirdSpanKey = keyGenerator()
  const strongSpanKey = keyGenerator()
  const emSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: firstSpanKey, text: 'foo', marks: []},
        {_type: 'span', _key: strongSpanKey, text: 'bar', marks: ['strong']},
        {_type: 'span', _key: emSpanKey, text: 'baz', marks: ['em']},
      ],
    },
    {
      _type: 'block',
      _key: secondBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: secondSpanKey, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: thirdBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: thirdSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', text: 'bar', marks: []},
        {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
        {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
      ],
    },
    {
      _type: 'block',
      _key: 'k2',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        value: {_type: 'span', text: 'bar', marks: []},
      },
    ],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', text: 'bar', marks: []},
              {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
              {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
            ],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
            value: {_type: 'span', text: 'bar', marks: []},
          },
        ],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', text: 'bar', marks: []},
          {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
          {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
        ],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
      },
    ])
  })
})

test('Scenario: An indexed whole block set to null among siblings carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondBlockKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const thirdBlockKey = keyGenerator()
  const thirdSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: secondBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: secondSpanKey, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: thirdBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: thirdSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [
    null,
    {
      _type: 'block',
      _key: 'k2',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [{type: 'set', path: [0], value: null as unknown as JSONValue}],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          null,
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [{type: 'set', path: [0], value: null}],
      },
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [{type: 'unset', path: [0]}],
        patches: [{type: 'unset', path: [0], origin: 'local'}],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
      },
    ])
  })
})

test('Scenario: An indexed whole block set to string among siblings carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondBlockKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const thirdBlockKey = keyGenerator()
  const thirdSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: secondBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: secondSpanKey, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: thirdBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: thirdSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [
    'foo',
    {
      _type: 'block',
      _key: 'k2',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [{type: 'set', path: [0], value: 'foo'}],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          'foo',
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [{type: 'set', path: [0], value: 'foo'}],
      },
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [{type: 'unset', path: [0]}],
        patches: [{type: 'unset', path: [0], origin: 'local'}],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
      },
    ])
  })
})

test('Scenario: An indexed whole block set to a block without children among siblings carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondBlockKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const thirdBlockKey = keyGenerator()
  const thirdSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: secondBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: secondSpanKey, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: thirdBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: thirdSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [
    {_type: 'block', _key: 'k0', style: 'normal', markDefs: []},
    {
      _type: 'block',
      _key: 'k2',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [0],
        value: {_type: 'block', _key: 'k0', style: 'normal', markDefs: []},
      },
    ],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          {_type: 'block', _key: 'k0', style: 'normal', markDefs: []},
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [0],
            value: {_type: 'block', _key: 'k0', style: 'normal', markDefs: []},
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k8', text: '', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children'],
            value: [],
            inverse: {type: 'unset', path: [{_key: 'k0'}, 'children']},
          },
          {
            type: 'insert',
            path: [{_key: 'k0'}, 'children', 0],
            node: {_type: 'span', _key: 'k8', text: '', marks: []},
            position: 'before',
          },
        ],
        patches: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children'],
            value: [],
            origin: 'local',
          },
          {
            type: 'setIfMissing',
            path: [{_key: 'k0'}, 'children'],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [{_key: 'k0'}, 'children', 0],
            position: 'before',
            items: [{_type: 'span', _key: 'k8', text: '', marks: []}],
            origin: 'local',
          },
        ],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k8', text: '', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
      },
    ])
  })
})

test('Scenario: An indexed whole span set to null among siblings carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondBlockKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const thirdBlockKey = keyGenerator()
  const thirdSpanKey = keyGenerator()
  const strongSpanKey = keyGenerator()
  const emSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: firstSpanKey, text: 'foo', marks: []},
        {_type: 'span', _key: strongSpanKey, text: 'bar', marks: ['strong']},
        {_type: 'span', _key: emSpanKey, text: 'baz', marks: ['em']},
      ],
    },
    {
      _type: 'block',
      _key: secondBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: secondSpanKey, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: thirdBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: thirdSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [
        null,
        {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
        {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
      ],
    },
    {
      _type: 'block',
      _key: 'k2',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [0, 'children', 0],
        value: null as unknown as JSONValue,
      },
    ],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              null,
              {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
              {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
            ],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [{type: 'set', path: [0, 'children', 0], value: null}],
      },
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
              {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
            ],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [{type: 'unset', path: [{_key: 'k0'}, 'children', 0]}],
        patches: [
          {type: 'unset', path: [{_key: 'k0'}, 'children', 0], origin: 'local'},
        ],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
          {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
        ],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
      },
    ])
  })
})

test('Scenario: An indexed whole span set to string among siblings carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondBlockKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const thirdBlockKey = keyGenerator()
  const thirdSpanKey = keyGenerator()
  const strongSpanKey = keyGenerator()
  const emSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: firstSpanKey, text: 'foo', marks: []},
        {_type: 'span', _key: strongSpanKey, text: 'bar', marks: ['strong']},
        {_type: 'span', _key: emSpanKey, text: 'baz', marks: ['em']},
      ],
    },
    {
      _type: 'block',
      _key: secondBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: secondSpanKey, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: thirdBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: thirdSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [
        'foo',
        {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
        {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
      ],
    },
    {
      _type: 'block',
      _key: 'k2',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [{type: 'set', path: [0, 'children', 0], value: 'foo'}],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              'foo',
              {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
              {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
            ],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [{type: 'set', path: [0, 'children', 0], value: 'foo'}],
      },
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
              {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
            ],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [{type: 'unset', path: [{_key: 'k0'}, 'children', 0]}],
        patches: [
          {type: 'unset', path: [{_key: 'k0'}, 'children', 0], origin: 'local'},
        ],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
          {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
        ],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
      },
    ])
  })
})

test('Scenario: An indexed children array with a keyless span among siblings carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondBlockKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const thirdBlockKey = keyGenerator()
  const thirdSpanKey = keyGenerator()
  const strongSpanKey = keyGenerator()
  const emSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: firstSpanKey, text: 'foo', marks: []},
        {_type: 'span', _key: strongSpanKey, text: 'bar', marks: ['strong']},
        {_type: 'span', _key: emSpanKey, text: 'baz', marks: ['em']},
      ],
    },
    {
      _type: 'block',
      _key: secondBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: secondSpanKey, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: thirdBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: thirdSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', text: 'bar', marks: []},
        {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
        {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
      ],
    },
    {
      _type: 'block',
      _key: 'k2',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [0, 'children'],
        value: [
          {_type: 'span', text: 'bar', marks: []},
          {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
          {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
        ],
      },
    ],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', text: 'bar', marks: []},
              {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
              {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
            ],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [0, 'children'],
            value: [
              {_type: 'span', text: 'bar', marks: []},
              {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
              {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
            ],
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', text: 'bar', marks: [], _key: 'k10'},
              {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
              {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
            ],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', 0, '_key'],
            value: 'k10',
            inverse: {
              type: 'unset',
              path: [{_key: 'k0'}, 'children', 0, '_key'],
            },
          },
        ],
        patches: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', 0, '_key'],
            value: 'k10',
            origin: 'local',
          },
        ],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', text: 'bar', marks: [], _key: 'k10'},
          {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
          {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
        ],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
      },
    ])
  })
})

test('Scenario: An indexed whole span set to a keyless span among siblings carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondBlockKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const thirdBlockKey = keyGenerator()
  const thirdSpanKey = keyGenerator()
  const strongSpanKey = keyGenerator()
  const emSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: firstSpanKey, text: 'foo', marks: []},
        {_type: 'span', _key: strongSpanKey, text: 'bar', marks: ['strong']},
        {_type: 'span', _key: emSpanKey, text: 'baz', marks: ['em']},
      ],
    },
    {
      _type: 'block',
      _key: secondBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: secondSpanKey, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: thirdBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: thirdSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', text: 'bar', marks: []},
        {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
        {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
      ],
    },
    {
      _type: 'block',
      _key: 'k2',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [0, 'children', 0],
        value: {_type: 'span', text: 'bar', marks: []},
      },
    ],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', text: 'bar', marks: []},
              {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
              {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
            ],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [0, 'children', 0],
            value: {_type: 'span', text: 'bar', marks: []},
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', text: 'bar', marks: [], _key: 'k10'},
              {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
              {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
            ],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', 0, '_key'],
            value: 'k10',
            inverse: {
              type: 'unset',
              path: [{_key: 'k0'}, 'children', 0, '_key'],
            },
          },
        ],
        patches: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', 0, '_key'],
            value: 'k10',
            origin: 'local',
          },
        ],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', text: 'bar', marks: [], _key: 'k10'},
          {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
          {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
        ],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
      },
    ])
  })
})

test('Scenario: A keyed whole span set to null among siblings while read-only carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondBlockKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const thirdBlockKey = keyGenerator()
  const thirdSpanKey = keyGenerator()
  const strongSpanKey = keyGenerator()
  const emSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: firstSpanKey, text: 'foo', marks: []},
        {_type: 'span', _key: strongSpanKey, text: 'bar', marks: ['strong']},
        {_type: 'span', _key: emSpanKey, text: 'baz', marks: ['em']},
      ],
    },
    {
      _type: 'block',
      _key: secondBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: secondSpanKey, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: thirdBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: thirdSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })
  editor.send({type: 'update readOnly', readOnly: true})
  hostValue = [
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [
        null,
        {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
        {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
      ],
    },
    {
      _type: 'block',
      _key: 'k2',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        value: null as unknown as JSONValue,
      },
    ],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              null,
              {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
              {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
            ],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
            value: null,
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
              {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
            ],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
        operations: [{type: 'unset', path: [{_key: 'k0'}, 'children', 0]}],
        patches: [
          {type: 'unset', path: [{_key: 'k0'}, 'children', 0], origin: 'local'},
        ],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k6', text: 'bar', marks: ['strong']},
          {_type: 'span', _key: 'k7', text: 'baz', marks: ['em']},
        ],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
      },
    ])
  })
})

test('Scenario: A keyed whole block set to null among siblings in a callout carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondBlockKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const thirdBlockKey = keyGenerator()
  const thirdSpanKey = keyGenerator()
  const calloutKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'block',
          _key: firstBlockKey,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: firstSpanKey, text: 'foo', marks: []},
          ],
        },
        {
          _type: 'block',
          _key: secondBlockKey,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: secondSpanKey, text: 'foo', marks: []},
          ],
        },
        {
          _type: 'block',
          _key: thirdBlockKey,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: thirdSpanKey, text: 'foo', marks: []},
          ],
        },
      ],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [
    {
      _type: 'callout',
      _key: 'k6',
      content: [
        null,
        {
          _type: 'block',
          _key: 'k2',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
        },
        {
          _type: 'block',
          _key: 'k4',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
        },
      ],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: 'k6'}, 'content', {_key: 'k0'}],
        value: null as unknown as JSONValue,
      },
    ],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          {
            _type: 'callout',
            _key: 'k6',
            content: [
              null,
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
              },
              {
                _type: 'block',
                _key: 'k4',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
              },
            ],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k6'}, 'content', {_key: 'k0'}],
            value: null,
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'callout',
            _key: 'k6',
            content: [
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
              },
              {
                _type: 'block',
                _key: 'k4',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
              },
            ],
          },
        ],
        operations: [{type: 'unset', path: [{_key: 'k6'}, 'content', 0]}],
        patches: [
          {type: 'unset', path: [{_key: 'k6'}, 'content', 0], origin: 'local'},
        ],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'callout',
        _key: 'k6',
        content: [
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'foo', marks: []}],
          },
        ],
      },
    ])
  })
})

test('Scenario: A keyed whole block set to null among siblings in a table cell carries each host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondBlockKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const thirdBlockKey = keyGenerator()
  const thirdSpanKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'table',
      _key: tableKey,
      rows: [
        {
          _type: 'row',
          _key: rowKey,
          cells: [
            {
              _type: 'cell',
              _key: cellKey,
              content: [
                {
                  _type: 'block',
                  _key: firstBlockKey,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: firstSpanKey, text: 'foo', marks: []},
                  ],
                },
                {
                  _type: 'block',
                  _key: secondBlockKey,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _type: 'span',
                      _key: secondSpanKey,
                      text: 'foo',
                      marks: [],
                    },
                  ],
                },
                {
                  _type: 'block',
                  _key: thirdBlockKey,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: thirdSpanKey, text: 'foo', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [
    {
      _type: 'table',
      _key: 'k6',
      rows: [
        {
          _type: 'row',
          _key: 'k7',
          cells: [
            {
              _type: 'cell',
              _key: 'k8',
              content: [
                null,
                {
                  _type: 'block',
                  _key: 'k2',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k3', text: 'foo', marks: []},
                  ],
                },
                {
                  _type: 'block',
                  _key: 'k4',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k5', text: 'foo', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [
          {_key: 'k6'},
          'rows',
          {_key: 'k7'},
          'cells',
          {_key: 'k8'},
          'content',
          {_key: 'k0'},
        ],
        value: null as unknown as JSONValue,
      },
    ],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          {
            _type: 'table',
            _key: 'k6',
            rows: [
              {
                _type: 'row',
                _key: 'k7',
                cells: [
                  {
                    _type: 'cell',
                    _key: 'k8',
                    content: [
                      null,
                      {
                        _type: 'block',
                        _key: 'k2',
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {_type: 'span', _key: 'k3', text: 'foo', marks: []},
                        ],
                      },
                      {
                        _type: 'block',
                        _key: 'k4',
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {_type: 'span', _key: 'k5', text: 'foo', marks: []},
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [
              {_key: 'k6'},
              'rows',
              {_key: 'k7'},
              'cells',
              {_key: 'k8'},
              'content',
              {_key: 'k0'},
            ],
            value: null,
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'table',
            _key: 'k6',
            rows: [
              {
                _type: 'row',
                _key: 'k7',
                cells: [
                  {
                    _type: 'cell',
                    _key: 'k8',
                    content: [
                      {
                        _type: 'block',
                        _key: 'k2',
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {_type: 'span', _key: 'k3', text: 'foo', marks: []},
                        ],
                      },
                      {
                        _type: 'block',
                        _key: 'k4',
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {_type: 'span', _key: 'k5', text: 'foo', marks: []},
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        operations: [
          {
            type: 'unset',
            path: [
              {_key: 'k6'},
              'rows',
              {_key: 'k7'},
              'cells',
              {_key: 'k8'},
              'content',
              0,
            ],
          },
        ],
        patches: [
          {
            type: 'unset',
            path: [
              {_key: 'k6'},
              'rows',
              {_key: 'k7'},
              'cells',
              {_key: 'k8'},
              'content',
              0,
            ],
            origin: 'local',
          },
        ],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'table',
        _key: 'k6',
        rows: [
          {
            _type: 'row',
            _key: 'k7',
            cells: [
              {
                _type: 'cell',
                _key: 'k8',
                content: [
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: 'foo', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: 'k4',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k5', text: 'foo', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })
})

test('Scenario: Document values follow local edits, history and remote corrections at root', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondBlockKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const initialValue: Array<PortableTextBlock> = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: secondBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: secondSpanKey, text: 'bar', marks: []}],
    },
  ]
  const unchangedBlock = initialValue[1]
  let hostValue: unknown = initialValue
  const values: Array<ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    values.push(event.value)
    if (event.origin === 'local') {
      for (const {origin: _, ...patch} of event.patches) {
        patches.push(patch)
      }
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  patches.length = 0
  values.length = 0
  editor.send({
    type: 'insert.text',
    at: [{_key: 'k0'}, 'children', {_key: 'k1'}],
    offset: 3,
    text: 'x',
  })
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foo', 'foox', [
        ...[{_key: 'k0'}, 'children', {_key: 'k1'}],
        'text',
      ]),
    ])
    expect(values).toEqual([
      [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
        },
        {
          _type: 'block',
          _key: 'k2',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
        },
      ],
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
    ])
  })
  const retainedValue = values[0]
  expect(values[0]?.[1]).toBe(unchangedBlock)

  patches.length = 0
  values.length = 0
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foox', 'foo', [
        ...[{_key: 'k0'}, 'children', {_key: 'k1'}],
        'text',
      ]),
    ])
    expect(values).toEqual([
      [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
        },
        {
          _type: 'block',
          _key: 'k2',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
        },
      ],
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
    ])
  })

  patches.length = 0
  values.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foo', 'foox', [
        ...[{_key: 'k0'}, 'children', {_key: 'k1'}],
        'text',
      ]),
    ])
    expect(values).toEqual([
      [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
        },
        {
          _type: 'block',
          _key: 'k2',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
        },
      ],
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
    ])
  })

  patches.length = 0
  values.length = 0
  hostValue = [
    null,
    {
      _type: 'block',
      _key: 'k2',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [set(null as unknown as JSONValue, [...[], {_key: 'k0'}])],
  })
  await vi.waitFor(() => {
    expect(patches).toEqual([unset([...[], 0])])
    expect(values).toEqual([
      [
        null,
        {
          _type: 'block',
          _key: 'k2',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
        },
      ],
      [
        {
          _type: 'block',
          _key: 'k2',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
        },
      ],
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
    ])
  })
  expect(retainedValue).toEqual([
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k2',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
    },
  ])
  patches.length = 0
  values.length = 0
  hostValue = undefined
  editor.send({type: 'apply', patches: [unset([])]})
  await vi.waitFor(() => {
    expect(patches).toEqual([])
    expect(values).toEqual([undefined, undefined])
    expect(hostValue).toEqual(undefined)
  })
  expect(retainedValue).toEqual([
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k2',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
    },
  ])
})

test('Scenario: Document values follow local edits, history and remote corrections at callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondBlockKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const outerContainerKey = keyGenerator()
  const initialValue: Array<PortableTextBlock> = [
    {
      _type: 'callout',
      _key: outerContainerKey,
      content: [
        {
          _type: 'block',
          _key: firstBlockKey,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: firstSpanKey, text: 'foo', marks: []},
          ],
        },
        {
          _type: 'block',
          _key: secondBlockKey,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: secondSpanKey, text: 'bar', marks: []},
          ],
        },
      ],
    },
  ]

  let hostValue: unknown = initialValue
  const values: Array<ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    values.push(event.value)
    if (event.origin === 'local') {
      for (const {origin: _, ...patch} of event.patches) {
        patches.push(patch)
      }
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  patches.length = 0
  values.length = 0
  editor.send({
    type: 'insert.text',
    at: [{_key: 'k4'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
    offset: 3,
    text: 'x',
  })
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foo', 'foox', [
        ...[{_key: 'k4'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        'text',
      ]),
    ])
    expect(values).toEqual([
      [
        {
          _type: 'callout',
          _key: 'k4',
          content: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
            },
            {
              _type: 'block',
              _key: 'k2',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
            },
          ],
        },
      ],
    ])
    expect(hostValue).toEqual([
      {
        _type: 'callout',
        _key: 'k4',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          },
        ],
      },
    ])
  })
  const retainedValue = values[0]

  patches.length = 0
  values.length = 0
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foox', 'foo', [
        ...[{_key: 'k4'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        'text',
      ]),
    ])
    expect(values).toEqual([
      [
        {
          _type: 'callout',
          _key: 'k4',
          content: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            },
            {
              _type: 'block',
              _key: 'k2',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
            },
          ],
        },
      ],
    ])
    expect(hostValue).toEqual([
      {
        _type: 'callout',
        _key: 'k4',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          },
        ],
      },
    ])
  })

  patches.length = 0
  values.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foo', 'foox', [
        ...[{_key: 'k4'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        'text',
      ]),
    ])
    expect(values).toEqual([
      [
        {
          _type: 'callout',
          _key: 'k4',
          content: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
            },
            {
              _type: 'block',
              _key: 'k2',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
            },
          ],
        },
      ],
    ])
    expect(hostValue).toEqual([
      {
        _type: 'callout',
        _key: 'k4',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          },
        ],
      },
    ])
  })

  patches.length = 0
  values.length = 0
  hostValue = [
    {
      _type: 'callout',
      _key: 'k4',
      content: [
        null,
        {
          _type: 'block',
          _key: 'k2',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
        },
      ],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      set(null as unknown as JSONValue, [
        ...[{_key: 'k4'}, 'content'],
        {_key: 'k0'},
      ]),
    ],
  })
  await vi.waitFor(() => {
    expect(patches).toEqual([unset([...[{_key: 'k4'}, 'content'], 0])])
    expect(values).toEqual([
      [
        {
          _type: 'callout',
          _key: 'k4',
          content: [
            null,
            {
              _type: 'block',
              _key: 'k2',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
            },
          ],
        },
      ],
      [
        {
          _type: 'callout',
          _key: 'k4',
          content: [
            {
              _type: 'block',
              _key: 'k2',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
            },
          ],
        },
      ],
    ])
    expect(hostValue).toEqual([
      {
        _type: 'callout',
        _key: 'k4',
        content: [
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          },
        ],
      },
    ])
  })
  expect(retainedValue).toEqual([
    {
      _type: 'callout',
      _key: 'k4',
      content: [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
        },
        {
          _type: 'block',
          _key: 'k2',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
        },
      ],
    },
  ])
  patches.length = 0
  values.length = 0
  hostValue = undefined
  editor.send({type: 'apply', patches: [unset([])]})
  await vi.waitFor(() => {
    expect(patches).toEqual([])
    expect(values).toEqual([undefined, undefined])
    expect(hostValue).toEqual(undefined)
  })
  expect(retainedValue).toEqual([
    {
      _type: 'callout',
      _key: 'k4',
      content: [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
        },
        {
          _type: 'block',
          _key: 'k2',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
        },
      ],
    },
  ])
})

test('Scenario: Document values follow local edits, history and remote corrections at table cell', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondBlockKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const outerContainerKey = keyGenerator()
  const nestedContainerKey = keyGenerator()
  const cellKey = keyGenerator()
  const initialValue: Array<PortableTextBlock> = [
    {
      _type: 'table',
      _key: outerContainerKey,
      rows: [
        {
          _type: 'row',
          _key: nestedContainerKey,
          cells: [
            {
              _type: 'cell',
              _key: cellKey,
              content: [
                {
                  _type: 'block',
                  _key: firstBlockKey,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: firstSpanKey, text: 'foo', marks: []},
                  ],
                },
                {
                  _type: 'block',
                  _key: secondBlockKey,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _type: 'span',
                      _key: secondSpanKey,
                      text: 'bar',
                      marks: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]

  let hostValue: unknown = initialValue
  const values: Array<ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    values.push(event.value)
    if (event.origin === 'local') {
      for (const {origin: _, ...patch} of event.patches) {
        patches.push(patch)
      }
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  patches.length = 0
  values.length = 0
  editor.send({
    type: 'insert.text',
    at: [
      {_key: 'k4'},
      'rows',
      {_key: 'k5'},
      'cells',
      {_key: 'k6'},
      'content',
      {_key: 'k0'},
      'children',
      {_key: 'k1'},
    ],
    offset: 3,
    text: 'x',
  })
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foo', 'foox', [
        ...[
          {_key: 'k4'},
          'rows',
          {_key: 'k5'},
          'cells',
          {_key: 'k6'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        'text',
      ]),
    ])
    expect(values).toEqual([
      [
        {
          _type: 'table',
          _key: 'k4',
          rows: [
            {
              _type: 'row',
              _key: 'k5',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k6',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k0',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k1', text: 'foox', marks: []},
                      ],
                    },
                    {
                      _type: 'block',
                      _key: 'k2',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    ])
    expect(hostValue).toEqual([
      {
        _type: 'table',
        _key: 'k4',
        rows: [
          {
            _type: 'row',
            _key: 'k5',
            cells: [
              {
                _type: 'cell',
                _key: 'k6',
                content: [
                  {
                    _type: 'block',
                    _key: 'k0',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k1', text: 'foox', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })
  const retainedValue = values[0]

  patches.length = 0
  values.length = 0
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foox', 'foo', [
        ...[
          {_key: 'k4'},
          'rows',
          {_key: 'k5'},
          'cells',
          {_key: 'k6'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        'text',
      ]),
    ])
    expect(values).toEqual([
      [
        {
          _type: 'table',
          _key: 'k4',
          rows: [
            {
              _type: 'row',
              _key: 'k5',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k6',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k0',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                      ],
                    },
                    {
                      _type: 'block',
                      _key: 'k2',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    ])
    expect(hostValue).toEqual([
      {
        _type: 'table',
        _key: 'k4',
        rows: [
          {
            _type: 'row',
            _key: 'k5',
            cells: [
              {
                _type: 'cell',
                _key: 'k6',
                content: [
                  {
                    _type: 'block',
                    _key: 'k0',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  patches.length = 0
  values.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foo', 'foox', [
        ...[
          {_key: 'k4'},
          'rows',
          {_key: 'k5'},
          'cells',
          {_key: 'k6'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        'text',
      ]),
    ])
    expect(values).toEqual([
      [
        {
          _type: 'table',
          _key: 'k4',
          rows: [
            {
              _type: 'row',
              _key: 'k5',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k6',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k0',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k1', text: 'foox', marks: []},
                      ],
                    },
                    {
                      _type: 'block',
                      _key: 'k2',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    ])
    expect(hostValue).toEqual([
      {
        _type: 'table',
        _key: 'k4',
        rows: [
          {
            _type: 'row',
            _key: 'k5',
            cells: [
              {
                _type: 'cell',
                _key: 'k6',
                content: [
                  {
                    _type: 'block',
                    _key: 'k0',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k1', text: 'foox', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  patches.length = 0
  values.length = 0
  hostValue = [
    {
      _type: 'table',
      _key: 'k4',
      rows: [
        {
          _type: 'row',
          _key: 'k5',
          cells: [
            {
              _type: 'cell',
              _key: 'k6',
              content: [
                null,
                {
                  _type: 'block',
                  _key: 'k2',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      set(null as unknown as JSONValue, [
        ...[
          {_key: 'k4'},
          'rows',
          {_key: 'k5'},
          'cells',
          {_key: 'k6'},
          'content',
        ],
        {_key: 'k0'},
      ]),
    ],
  })
  await vi.waitFor(() => {
    expect(patches).toEqual([
      unset([
        ...[
          {_key: 'k4'},
          'rows',
          {_key: 'k5'},
          'cells',
          {_key: 'k6'},
          'content',
        ],
        0,
      ]),
    ])
    expect(values).toEqual([
      [
        {
          _type: 'table',
          _key: 'k4',
          rows: [
            {
              _type: 'row',
              _key: 'k5',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k6',
                  content: [
                    null,
                    {
                      _type: 'block',
                      _key: 'k2',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      [
        {
          _type: 'table',
          _key: 'k4',
          rows: [
            {
              _type: 'row',
              _key: 'k5',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k6',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k2',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    ])
    expect(hostValue).toEqual([
      {
        _type: 'table',
        _key: 'k4',
        rows: [
          {
            _type: 'row',
            _key: 'k5',
            cells: [
              {
                _type: 'cell',
                _key: 'k6',
                content: [
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })
  expect(retainedValue).toEqual([
    {
      _type: 'table',
      _key: 'k4',
      rows: [
        {
          _type: 'row',
          _key: 'k5',
          cells: [
            {
              _type: 'cell',
              _key: 'k6',
              content: [
                {
                  _type: 'block',
                  _key: 'k0',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k1', text: 'foox', marks: []},
                  ],
                },
                {
                  _type: 'block',
                  _key: 'k2',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ])
  patches.length = 0
  values.length = 0
  hostValue = undefined
  editor.send({type: 'apply', patches: [unset([])]})
  await vi.waitFor(() => {
    expect(patches).toEqual([])
    expect(values).toEqual([undefined, undefined])
    expect(hostValue).toEqual(undefined)
  })
  expect(retainedValue).toEqual([
    {
      _type: 'table',
      _key: 'k4',
      rows: [
        {
          _type: 'row',
          _key: 'k5',
          cells: [
            {
              _type: 'cell',
              _key: 'k6',
              content: [
                {
                  _type: 'block',
                  _key: 'k0',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k1', text: 'foox', marks: []},
                  ],
                },
                {
                  _type: 'block',
                  _key: 'k2',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ])
})

test('Scenario: Document values follow local edits, history and remote corrections at callout in a table cell', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondBlockKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const outerContainerKey = keyGenerator()
  const nestedContainerKey = keyGenerator()
  const cellKey = keyGenerator()
  const innerContainerKey = keyGenerator()
  const initialValue: Array<PortableTextBlock> = [
    {
      _type: 'table',
      _key: outerContainerKey,
      rows: [
        {
          _type: 'row',
          _key: nestedContainerKey,
          cells: [
            {
              _type: 'cell',
              _key: cellKey,
              content: [
                {
                  _type: 'callout',
                  _key: innerContainerKey,
                  content: [
                    {
                      _type: 'block',
                      _key: firstBlockKey,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: firstSpanKey,
                          text: 'foo',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _type: 'block',
                      _key: secondBlockKey,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _type: 'span',
                          _key: secondSpanKey,
                          text: 'bar',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]

  let hostValue: unknown = initialValue
  const values: Array<ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    values.push(event.value)
    if (event.origin === 'local') {
      for (const {origin: _, ...patch} of event.patches) {
        patches.push(patch)
      }
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  patches.length = 0
  values.length = 0
  editor.send({
    type: 'insert.text',
    at: [
      {_key: 'k4'},
      'rows',
      {_key: 'k5'},
      'cells',
      {_key: 'k6'},
      'content',
      {_key: 'k7'},
      'content',
      {_key: 'k0'},
      'children',
      {_key: 'k1'},
    ],
    offset: 3,
    text: 'x',
  })
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foo', 'foox', [
        ...[
          {_key: 'k4'},
          'rows',
          {_key: 'k5'},
          'cells',
          {_key: 'k6'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        'text',
      ]),
    ])
    expect(values).toEqual([
      [
        {
          _type: 'table',
          _key: 'k4',
          rows: [
            {
              _type: 'row',
              _key: 'k5',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k6',
                  content: [
                    {
                      _type: 'callout',
                      _key: 'k7',
                      content: [
                        {
                          _type: 'block',
                          _key: 'k0',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {
                              _type: 'span',
                              _key: 'k1',
                              text: 'foox',
                              marks: [],
                            },
                          ],
                        },
                        {
                          _type: 'block',
                          _key: 'k2',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    ])
    expect(hostValue).toEqual([
      {
        _type: 'table',
        _key: 'k4',
        rows: [
          {
            _type: 'row',
            _key: 'k5',
            cells: [
              {
                _type: 'cell',
                _key: 'k6',
                content: [
                  {
                    _type: 'callout',
                    _key: 'k7',
                    content: [
                      {
                        _type: 'block',
                        _key: 'k0',
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {_type: 'span', _key: 'k1', text: 'foox', marks: []},
                        ],
                      },
                      {
                        _type: 'block',
                        _key: 'k2',
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })
  const retainedValue = values[0]

  patches.length = 0
  values.length = 0
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foox', 'foo', [
        ...[
          {_key: 'k4'},
          'rows',
          {_key: 'k5'},
          'cells',
          {_key: 'k6'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        'text',
      ]),
    ])
    expect(values).toEqual([
      [
        {
          _type: 'table',
          _key: 'k4',
          rows: [
            {
              _type: 'row',
              _key: 'k5',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k6',
                  content: [
                    {
                      _type: 'callout',
                      _key: 'k7',
                      content: [
                        {
                          _type: 'block',
                          _key: 'k0',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                          ],
                        },
                        {
                          _type: 'block',
                          _key: 'k2',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    ])
    expect(hostValue).toEqual([
      {
        _type: 'table',
        _key: 'k4',
        rows: [
          {
            _type: 'row',
            _key: 'k5',
            cells: [
              {
                _type: 'cell',
                _key: 'k6',
                content: [
                  {
                    _type: 'callout',
                    _key: 'k7',
                    content: [
                      {
                        _type: 'block',
                        _key: 'k0',
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                        ],
                      },
                      {
                        _type: 'block',
                        _key: 'k2',
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  patches.length = 0
  values.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foo', 'foox', [
        ...[
          {_key: 'k4'},
          'rows',
          {_key: 'k5'},
          'cells',
          {_key: 'k6'},
          'content',
          {_key: 'k7'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        'text',
      ]),
    ])
    expect(values).toEqual([
      [
        {
          _type: 'table',
          _key: 'k4',
          rows: [
            {
              _type: 'row',
              _key: 'k5',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k6',
                  content: [
                    {
                      _type: 'callout',
                      _key: 'k7',
                      content: [
                        {
                          _type: 'block',
                          _key: 'k0',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {
                              _type: 'span',
                              _key: 'k1',
                              text: 'foox',
                              marks: [],
                            },
                          ],
                        },
                        {
                          _type: 'block',
                          _key: 'k2',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    ])
    expect(hostValue).toEqual([
      {
        _type: 'table',
        _key: 'k4',
        rows: [
          {
            _type: 'row',
            _key: 'k5',
            cells: [
              {
                _type: 'cell',
                _key: 'k6',
                content: [
                  {
                    _type: 'callout',
                    _key: 'k7',
                    content: [
                      {
                        _type: 'block',
                        _key: 'k0',
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {_type: 'span', _key: 'k1', text: 'foox', marks: []},
                        ],
                      },
                      {
                        _type: 'block',
                        _key: 'k2',
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  patches.length = 0
  values.length = 0
  hostValue = [
    {
      _type: 'table',
      _key: 'k4',
      rows: [
        {
          _type: 'row',
          _key: 'k5',
          cells: [
            {
              _type: 'cell',
              _key: 'k6',
              content: [
                {
                  _type: 'callout',
                  _key: 'k7',
                  content: [
                    null,
                    {
                      _type: 'block',
                      _key: 'k2',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      set(null as unknown as JSONValue, [
        ...[
          {_key: 'k4'},
          'rows',
          {_key: 'k5'},
          'cells',
          {_key: 'k6'},
          'content',
          {_key: 'k7'},
          'content',
        ],
        {_key: 'k0'},
      ]),
    ],
  })
  await vi.waitFor(() => {
    expect(patches).toEqual([
      unset([
        ...[
          {_key: 'k4'},
          'rows',
          {_key: 'k5'},
          'cells',
          {_key: 'k6'},
          'content',
          {_key: 'k7'},
          'content',
        ],
        0,
      ]),
    ])
    expect(values).toEqual([
      [
        {
          _type: 'table',
          _key: 'k4',
          rows: [
            {
              _type: 'row',
              _key: 'k5',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k6',
                  content: [
                    {
                      _type: 'callout',
                      _key: 'k7',
                      content: [
                        null,
                        {
                          _type: 'block',
                          _key: 'k2',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      [
        {
          _type: 'table',
          _key: 'k4',
          rows: [
            {
              _type: 'row',
              _key: 'k5',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k6',
                  content: [
                    {
                      _type: 'callout',
                      _key: 'k7',
                      content: [
                        {
                          _type: 'block',
                          _key: 'k2',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    ])
    expect(hostValue).toEqual([
      {
        _type: 'table',
        _key: 'k4',
        rows: [
          {
            _type: 'row',
            _key: 'k5',
            cells: [
              {
                _type: 'cell',
                _key: 'k6',
                content: [
                  {
                    _type: 'callout',
                    _key: 'k7',
                    content: [
                      {
                        _type: 'block',
                        _key: 'k2',
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })
  expect(retainedValue).toEqual([
    {
      _type: 'table',
      _key: 'k4',
      rows: [
        {
          _type: 'row',
          _key: 'k5',
          cells: [
            {
              _type: 'cell',
              _key: 'k6',
              content: [
                {
                  _type: 'callout',
                  _key: 'k7',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k0',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k1', text: 'foox', marks: []},
                      ],
                    },
                    {
                      _type: 'block',
                      _key: 'k2',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ])
  patches.length = 0
  values.length = 0
  hostValue = undefined
  editor.send({type: 'apply', patches: [unset([])]})
  await vi.waitFor(() => {
    expect(patches).toEqual([])
    expect(values).toEqual([undefined, undefined])
    expect(hostValue).toEqual(undefined)
  })
  expect(retainedValue).toEqual([
    {
      _type: 'table',
      _key: 'k4',
      rows: [
        {
          _type: 'row',
          _key: 'k5',
          cells: [
            {
              _type: 'cell',
              _key: 'k6',
              content: [
                {
                  _type: 'callout',
                  _key: 'k7',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k0',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k1', text: 'foox', marks: []},
                      ],
                    },
                    {
                      _type: 'block',
                      _key: 'k2',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ])
})

test('Scenario: Document values follow local edits, history and remote corrections at sibling containers', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondBlockKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const outerContainerKey = keyGenerator()
  const nestedContainerKey = keyGenerator()
  const cellKey = keyGenerator()
  const innerContainerKey = keyGenerator()
  const initialValue: Array<PortableTextBlock> = [
    {
      _type: 'callout',
      _key: outerContainerKey,
      content: [
        {
          _type: 'block',
          _key: firstBlockKey,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: firstSpanKey, text: 'foo', marks: []},
          ],
        },
        {
          _type: 'block',
          _key: secondBlockKey,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: secondSpanKey, text: 'bar', marks: []},
          ],
        },
      ],
    },
    {
      _type: 'callout',
      _key: nestedContainerKey,
      content: [
        {
          _type: 'block',
          _key: cellKey,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: innerContainerKey, text: 'baz', marks: []},
          ],
        },
      ],
    },
  ]

  let hostValue: unknown = initialValue
  const values: Array<ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue,
    schemaDefinition: documentValueSchemaDefinition,
    children: <NodePlugin nodes={documentValueContainers} />,
  })
  editor.on('change', (event) => {
    values.push(event.value)
    if (event.origin === 'local') {
      for (const {origin: _, ...patch} of event.patches) {
        patches.push(patch)
      }
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  patches.length = 0
  values.length = 0
  editor.send({
    type: 'insert.text',
    at: [{_key: 'k4'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
    offset: 3,
    text: 'x',
  })
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foo', 'foox', [
        ...[{_key: 'k4'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        'text',
      ]),
    ])
    expect(values).toEqual([
      [
        {
          _type: 'callout',
          _key: 'k4',
          content: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
            },
            {
              _type: 'block',
              _key: 'k2',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
            },
          ],
        },
        {
          _type: 'callout',
          _key: 'k5',
          content: [
            {
              _type: 'block',
              _key: 'k6',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k7', text: 'baz', marks: []}],
            },
          ],
        },
      ],
    ])
    expect(hostValue).toEqual([
      {
        _type: 'callout',
        _key: 'k4',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          },
        ],
      },
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'block',
            _key: 'k6',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k7', text: 'baz', marks: []}],
          },
        ],
      },
    ])
  })
  const retainedValue = values[0]

  patches.length = 0
  values.length = 0
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foox', 'foo', [
        ...[{_key: 'k4'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        'text',
      ]),
    ])
    expect(values).toEqual([
      [
        {
          _type: 'callout',
          _key: 'k4',
          content: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            },
            {
              _type: 'block',
              _key: 'k2',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
            },
          ],
        },
        {
          _type: 'callout',
          _key: 'k5',
          content: [
            {
              _type: 'block',
              _key: 'k6',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k7', text: 'baz', marks: []}],
            },
          ],
        },
      ],
    ])
    expect(hostValue).toEqual([
      {
        _type: 'callout',
        _key: 'k4',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          },
        ],
      },
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'block',
            _key: 'k6',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k7', text: 'baz', marks: []}],
          },
        ],
      },
    ])
  })

  patches.length = 0
  values.length = 0
  editor.send({type: 'history.redo'})
  await vi.waitFor(() => {
    expect(patches).toEqual([
      diffMatchPatch('foo', 'foox', [
        ...[{_key: 'k4'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        'text',
      ]),
    ])
    expect(values).toEqual([
      [
        {
          _type: 'callout',
          _key: 'k4',
          content: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
            },
            {
              _type: 'block',
              _key: 'k2',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
            },
          ],
        },
        {
          _type: 'callout',
          _key: 'k5',
          content: [
            {
              _type: 'block',
              _key: 'k6',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k7', text: 'baz', marks: []}],
            },
          ],
        },
      ],
    ])
    expect(hostValue).toEqual([
      {
        _type: 'callout',
        _key: 'k4',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          },
        ],
      },
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'block',
            _key: 'k6',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k7', text: 'baz', marks: []}],
          },
        ],
      },
    ])
  })

  patches.length = 0
  values.length = 0
  hostValue = [
    {
      _type: 'callout',
      _key: 'k4',
      content: [
        null,
        {
          _type: 'block',
          _key: 'k2',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
        },
      ],
    },
    {
      _type: 'callout',
      _key: 'k5',
      content: [
        {
          _type: 'block',
          _key: 'k6',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k7', text: 'baz', marks: []}],
        },
      ],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      set(null as unknown as JSONValue, [
        ...[{_key: 'k4'}, 'content'],
        {_key: 'k0'},
      ]),
    ],
  })
  await vi.waitFor(() => {
    expect(patches).toEqual([unset([...[{_key: 'k4'}, 'content'], 0])])
    expect(values).toEqual([
      [
        {
          _type: 'callout',
          _key: 'k4',
          content: [
            null,
            {
              _type: 'block',
              _key: 'k2',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
            },
          ],
        },
        {
          _type: 'callout',
          _key: 'k5',
          content: [
            {
              _type: 'block',
              _key: 'k6',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k7', text: 'baz', marks: []}],
            },
          ],
        },
      ],
      [
        {
          _type: 'callout',
          _key: 'k4',
          content: [
            {
              _type: 'block',
              _key: 'k2',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
            },
          ],
        },
        {
          _type: 'callout',
          _key: 'k5',
          content: [
            {
              _type: 'block',
              _key: 'k6',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k7', text: 'baz', marks: []}],
            },
          ],
        },
      ],
    ])
    expect(hostValue).toEqual([
      {
        _type: 'callout',
        _key: 'k4',
        content: [
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          },
        ],
      },
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'block',
            _key: 'k6',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k7', text: 'baz', marks: []}],
          },
        ],
      },
    ])
  })
  expect(retainedValue).toEqual([
    {
      _type: 'callout',
      _key: 'k4',
      content: [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
        },
        {
          _type: 'block',
          _key: 'k2',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
        },
      ],
    },
    {
      _type: 'callout',
      _key: 'k5',
      content: [
        {
          _type: 'block',
          _key: 'k6',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k7', text: 'baz', marks: []}],
        },
      ],
    },
  ])
  patches.length = 0
  values.length = 0
  hostValue = undefined
  editor.send({type: 'apply', patches: [unset([])]})
  await vi.waitFor(() => {
    expect(patches).toEqual([])
    expect(values).toEqual([undefined, undefined])
    expect(hostValue).toEqual(undefined)
  })
  expect(retainedValue).toEqual([
    {
      _type: 'callout',
      _key: 'k4',
      content: [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
        },
        {
          _type: 'block',
          _key: 'k2',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
        },
      ],
    },
    {
      _type: 'callout',
      _key: 'k5',
      content: [
        {
          _type: 'block',
          _key: 'k6',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k7', text: 'baz', marks: []}],
        },
      ],
    },
  ])
})

test('Scenario: Several synchronous sends retain each value in a batched listener', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const batched: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })
  editor.on(
    'change',
    (events) => {
      batched.push(...events)
    },
    {batch: true},
  )
  editor.send({
    type: 'set',
    at: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
    value: 'bar',
  })
  editor.send({
    type: 'set',
    at: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
    value: 'baz',
  })
  editor.send({
    type: 'set',
    at: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
    value: 'foo',
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: 'bar',
            inverse: {
              type: 'set',
              path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
              value: 'foo',
            },
          },
        ],
        patches: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: 'bar',
            origin: 'local',
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'baz', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: 'baz',
            inverse: {
              type: 'set',
              path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
              value: 'bar',
            },
          },
        ],
        patches: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: 'baz',
            origin: 'local',
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: 'foo',
            inverse: {
              type: 'set',
              path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
              value: 'baz',
            },
          },
        ],
        patches: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: 'foo',
            origin: 'local',
          },
        ],
      },
    ])
    expect(batched).toEqual([
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: 'bar',
            inverse: {
              type: 'set',
              path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
              value: 'foo',
            },
          },
        ],
        patches: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: 'bar',
            origin: 'local',
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'baz', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: 'baz',
            inverse: {
              type: 'set',
              path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
              value: 'bar',
            },
          },
        ],
        patches: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: 'baz',
            origin: 'local',
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: 'foo',
            inverse: {
              type: 'set',
              path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
              value: 'baz',
            },
          },
        ],
        patches: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: 'foo',
            origin: 'local',
          },
        ],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
  })
})

test('Scenario: Registering a container carries the corrected host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const calloutKey = keyGenerator()
  let hostValue: unknown = [{_type: 'callout', _key: calloutKey}]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  editor.registerNode({
    node: defineContainer({type: 'callout', arrayField: 'content'}),
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'callout',
            _key: 'k0',
            content: [
              {
                _type: 'block',
                _key: 'k3',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
              },
            ],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'content'],
            value: [
              {
                _type: 'block',
                _key: 'k3',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
              },
            ],
            inverse: {type: 'unset', path: [{_key: 'k0'}, 'content']},
          },
        ],
        patches: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'content'],
            value: [
              {
                _type: 'block',
                _key: 'k3',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
              },
            ],
            origin: 'local',
          },
        ],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'callout',
        _key: 'k0',
        content: [
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
          },
        ],
      },
    ])
  })
})

test('Scenario: Registering a container while read-only carries the corrected host value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const calloutKey = keyGenerator()
  let hostValue: unknown = [{_type: 'callout', _key: calloutKey}]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
    schemaDefinition: documentValueSchemaDefinition,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })
  editor.send({type: 'update readOnly', readOnly: true})
  editor.registerNode({
    node: defineContainer({type: 'callout', arrayField: 'content'}),
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'callout',
            _key: 'k0',
            content: [
              {
                _type: 'block',
                _key: 'k3',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
              },
            ],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'content'],
            value: [
              {
                _type: 'block',
                _key: 'k3',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
              },
            ],
            inverse: {type: 'unset', path: [{_key: 'k0'}, 'content']},
          },
        ],
        patches: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'content'],
            value: [
              {
                _type: 'block',
                _key: 'k3',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
              },
            ],
            origin: 'local',
          },
        ],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'callout',
        _key: 'k0',
        content: [
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
          },
        ],
      },
    ])
  })
})

test('Scenario: A keyed whole block without a key carries the received value without a correction', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })
  hostValue = [
    {
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      set(
        {
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
        },
        [{_key: 'k0'}],
      ),
    ],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          {
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [{_key: 'k0'}],
            value: {
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
            },
          },
        ],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
      },
    ])
  })
})

test('Scenario: An indexed whole block without a key carries the received and corrected values', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
  ]
  const changes: Array<ChangeEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
  })
  editor.on('change', (event) => {
    changes.push(event)
    if (event.origin === 'local') {
      hostValue = applyAll(hostValue, event.patches)
    }
  })
  hostValue = [
    {
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      set(
        {
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
        },
        [0],
      ),
    ],
  })
  await vi.waitFor(() => {
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        value: [
          {
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
          },
        ],
        operations: [
          {
            type: 'set',
            path: [0],
            value: {
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
            },
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        value: [
          {
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
            _key: 'k4',
          },
        ],
        operations: [
          {
            inverse: {type: 'unset', path: [0, '_key']},
            type: 'set',
            path: [0, '_key'],
            value: 'k4',
          },
        ],
        patches: [
          {type: 'set', path: [0, '_key'], value: 'k4', origin: 'local'},
        ],
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
        _key: 'k4',
      },
    ])
  })
})

test('Scenario: A reentrant change listener retains the value before its own edit', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
  ]
  const values: Array<ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
  })
  editor.on('change', (event) => {
    values.push(event.value)
    if (event.origin === 'local') {
      for (const {origin: _, ...patch} of event.patches) {
        patches.push(patch)
      }
      hostValue = applyAll(hostValue, event.patches)
    }
  })
  editor.on('change', (event) => {
    if (event.origin === 'remote') {
      editor.send({
        type: 'set',
        at: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
        value: 'baz',
      })
    }
  })
  hostValue = [
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
        value: 'bar',
      },
    ],
  })
  await vi.waitFor(() => {
    expect(values).toEqual([
      [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
        },
      ],
      [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'baz', marks: []}],
        },
      ],
    ])
    expect(patches).toEqual([
      {
        type: 'set',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
        value: 'baz',
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'baz', marks: []}],
      },
    ])
  })
})

test('Scenario: Several incoming patches needing corrections retain the complete received value', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondBlockKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const thirdBlockKey = keyGenerator()
  const thirdSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: secondBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: secondSpanKey, text: 'bar', marks: []}],
    },
    {
      _type: 'block',
      _key: thirdBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: thirdSpanKey, text: 'baz', marks: []}],
    },
  ]
  const values: Array<ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
  })
  editor.on('change', (event) => {
    values.push(event.value)
    if (event.origin === 'local') {
      for (const {origin: _, ...patch} of event.patches) {
        patches.push(patch)
      }
      hostValue = applyAll(hostValue, event.patches)
    }
  })

  hostValue = [
    null,
    'foo',
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      {type: 'set', path: [{_key: 'k0'}], value: null as unknown as JSONValue},
      {type: 'set', path: [{_key: 'k2'}], value: 'foo'},
    ],
  })
  await vi.waitFor(() => {
    expect(values).toEqual([
      [
        null,
        'foo',
        {
          _type: 'block',
          _key: 'k4',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
        },
      ],
      [
        {
          _type: 'block',
          _key: 'k4',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
        },
      ],
    ])
    expect(patches).toEqual([
      {type: 'unset', path: [1]},
      {type: 'unset', path: [0]},
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
      },
    ])
  })
})

test('Scenario: A later patch removes an earlier broken entry while an operation listener sends an edit', async () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondBlockKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const thirdBlockKey = keyGenerator()
  const thirdSpanKey = keyGenerator()
  let hostValue: unknown = [
    {
      _type: 'block',
      _key: firstBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: secondBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: secondSpanKey, text: 'bar', marks: []}],
    },
    {
      _type: 'block',
      _key: thirdBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: thirdSpanKey, text: 'baz', marks: []}],
    },
  ]
  const values: Array<ChangeEvent['value']> = []
  const patches: Array<Patch> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: structuredClone(hostValue) as Array<PortableTextBlock>,
  })
  editor.on('change', (event) => {
    values.push(event.value)
    if (event.origin === 'local') {
      for (const {origin: _, ...patch} of event.patches) {
        patches.push(patch)
      }
      hostValue = applyAll(hostValue, event.patches)
    }
  })
  editor.on('operation', (event) => {
    if (event.origin === 'remote' && event.operation.type === 'set') {
      editor.send({
        type: 'set',
        at: [{_key: 'k4'}, 'children', {_key: 'k5'}, 'text'],
        value: 'bazx',
      })
    }
  })
  hostValue = [
    {
      _type: 'block',
      _key: 'k2',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      {type: 'set', path: [{_key: 'k0'}], value: null as unknown as JSONValue},
      {type: 'unset', path: [0]},
    ],
  })
  await vi.waitFor(() => {
    expect(values).toEqual([
      [
        {
          _type: 'block',
          _key: 'k2',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
        },
        {
          _type: 'block',
          _key: 'k4',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
        },
      ],
      [
        {
          _type: 'block',
          _key: 'k2',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
        },
        {
          _type: 'block',
          _key: 'k4',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k5', text: 'bazx', marks: []}],
        },
      ],
    ])
    expect(patches).toEqual([
      {
        type: 'set',
        path: [{_key: 'k4'}, 'children', {_key: 'k5'}, 'text'],
        value: 'bazx',
      },
    ])
    expect(hostValue).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'bazx', marks: []}],
      },
    ])
  })
})
const documentValueSchemaDefinition = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
  blockObjects: [
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'callout'}],
        },
      ],
    },
    {
      name: 'table',
      fields: [
        {
          name: 'rows',
          type: 'array',
          of: [
            {
              name: 'row',
              type: 'object',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      name: 'cell',
                      type: 'object',
                      fields: [
                        {
                          name: 'content',
                          type: 'array',
                          of: [{type: 'block'}, {type: 'callout'}],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
})
const documentValueContainers = [
  defineContainer({type: 'callout', arrayField: 'content'}),
  defineContainer({type: 'table', arrayField: 'rows'}),
  defineContainer({type: 'row', arrayField: 'cells'}),
  defineContainer({type: 'cell', arrayField: 'content'}),
]
