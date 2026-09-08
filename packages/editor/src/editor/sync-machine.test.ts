import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {createActor} from 'xstate'
import {createBehaviorApiPlugin} from '../engine-plugins/engine-plugin.behavior-api'
import {updateSelectionPlugin} from '../engine-plugins/engine-plugin.update-selection'
import type {ApplyContextFrame} from '../engine/core/apply-context'
import {subscribeToOperations} from '../engine/core/operation-channel'
import {createEditor} from '../engine/create-editor'
import {withoutNormalizing} from '../engine/editor/without-normalizing'
import type {Node} from '../engine/interfaces/node'
import type {EngineOperation} from '../engine/interfaces/operation'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {editorMachine} from './editor-machine'
import {syncMachine, updateBlock} from './sync-machine'

function createTestEngine(keyGenerator: () => string) {
  const schema = compileSchema(defineSchema({}))
  const e: any = createEditor()
  e.containers = new Map()
  e.blockIndexMap = new Map()
  e.verifiedUniqueChildGroups = new Set()
  e.snapshot = {
    blockIndexMap: e.blockIndexMap,
    context: {
      containers: new Map(),
      converters: [],
      keyGenerator,
      readOnly: false,
      schema,
      selection: null,
      value: [],
    },
    decoratorState: {},
  }

  // Only wired for the plugin closures `updateSelectionPlugin` and
  // `createBehaviorApiPlugin` capture; the sync flow under test never sends
  // it an event.
  const editorActor = createActor(editorMachine, {
    input: {schema, keyGenerator},
  })

  const behaviorApiPlugin = createBehaviorApiPlugin(editorActor)
  const editor: PortableTextEditorEngine = behaviorApiPlugin(
    updateSelectionPlugin({editorActor, editor: e}),
  )

  return {editor, schema}
}

describe('sync machine', () => {
  test('an editor created without an initial value tags its first real value sync `update-value`, not `initial-sync`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, schema} = createTestEngine(keyGenerator)

    const remoteFrames: Array<ApplyContextFrame> = []
    subscribeToOperations(editor, (event) => {
      for (const frame of event.context) {
        if (frame.kind === 'remote') {
          remoteFrames.push(frame)
        }
      }
    })

    const actor = createActor(syncMachine, {
      input: {
        initialValue: undefined,
        keyGenerator,
        schema,
        editorEngine: editor,
      },
    })
    actor.start()

    actor.send({
      type: 'update value',
      value: [
        {
          _type: 'block',
          _key: 'b1',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(remoteFrames.length).toBeGreaterThan(0)
    })

    expect(remoteFrames).toEqual([{kind: 'remote', source: 'update-value'}])
  })

  test(`${updateBlock.name} replaces children wholesale instead of building a \`{_key: undefined}\` path when a child lacks a usable key`, () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, schema} = createTestEngine(keyGenerator)
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()

    const oldEngineBlock: Node = {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: fooKey, text: 'foo', marks: []},
        {
          _type: 'span',
          _key: undefined as unknown as string,
          text: 'bar',
          marks: [],
        },
      ],
    }
    editor.snapshot.context.value = [oldEngineBlock]
    // Mirrors how `syncBlock` always invokes `updateBlock`: inside a remote
    // frame (suppresses cosmetic normalization unrelated to this fallback)
    // and with normalization deferred until the wrapper exits.
    editor.applyContext = [{kind: 'remote', source: 'update-value'}]

    const appliedOps: Array<EngineOperation> = []
    const originalApply = editor.apply.bind(editor)
    editor.apply = (op: EngineOperation) => {
      appliedOps.push(op)
      return originalApply(op)
    }

    withoutNormalizing(editor, () => {
      updateBlock({
        context: {
          keyGenerator,
          previousValue: undefined,
          schema,
        },
        editorEngine: editor,
        oldEngineBlock,
        block: {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: fooKey, text: 'foo', marks: []},
            {_type: 'span', text: 'baz', marks: []},
          ],
        },
        index: 0,
      })
    })

    expect(appliedOps).toEqual([
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
        value: [
          {_type: 'span', _key: fooKey, text: 'foo', marks: []},
          {_type: 'span', text: 'baz', marks: []},
        ],
        inverse: {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [
            {_type: 'span', _key: fooKey, text: 'foo', marks: []},
            {_type: 'span', text: 'bar', marks: []},
          ],
        },
      },
      {
        type: 'set',
        path: [{_key: blockKey}, 'children', 1, '_key'],
        value: 'k2',
        inverse: {
          type: 'unset',
          path: [{_key: blockKey}, 'children', 1, '_key'],
        },
      },
    ])

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: fooKey, text: 'foo', marks: []},
          {_type: 'span', _key: 'k2', text: 'baz', marks: []},
        ],
      },
    ])
  })

  test(`${updateBlock.name} replaces children wholesale, and normalization inserts the placeholder span, when the incoming block has no children`, () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, schema} = createTestEngine(keyGenerator)
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()

    const oldEngineBlock: Node = {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: fooKey, text: 'foo', marks: []},
        {_type: 'span', _key: barKey, text: 'bar', marks: []},
      ],
    }
    editor.snapshot.context.value = [oldEngineBlock]
    // Mirrors how `syncBlock` always invokes `updateBlock`: inside a remote
    // frame (suppresses cosmetic normalization unrelated to this fallback)
    // and with normalization deferred until the wrapper exits.
    editor.applyContext = [{kind: 'remote', source: 'update-value'}]

    const appliedOps: Array<EngineOperation> = []
    const originalApply = editor.apply.bind(editor)
    editor.apply = (op: EngineOperation) => {
      appliedOps.push(op)
      return originalApply(op)
    }

    withoutNormalizing(editor, () => {
      updateBlock({
        context: {
          keyGenerator,
          previousValue: undefined,
          schema,
        },
        editorEngine: editor,
        oldEngineBlock,
        block: {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          markDefs: [],
          children: [],
        },
        index: 0,
      })
    })

    expect(appliedOps).toEqual([
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
        value: [],
        inverse: {
          type: 'set',
          path: [{_key: blockKey}, 'children'],
          value: [
            {_type: 'span', _key: fooKey, text: 'foo', marks: []},
            {_type: 'span', _key: barKey, text: 'bar', marks: []},
          ],
        },
      },
      {
        type: 'insert',
        path: [{_key: blockKey}, 'children', 0],
        node: {_type: 'span', _key: 'k3', text: '', marks: []},
        position: 'before',
      },
    ])

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
      },
    ])
  })
})
