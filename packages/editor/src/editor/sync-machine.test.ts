import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {createActor} from 'xstate'
import {createBehaviorApiPlugin} from '../engine-plugins/engine-plugin.behavior-api'
import {updateSelectionPlugin} from '../engine-plugins/engine-plugin.update-selection'
import type {ApplyContextFrame} from '../engine/core/apply-context'
import {subscribeToOperations} from '../engine/core/operation-channel'
import {createEditor} from '../engine/create-editor'
import {buildIndexMaps} from '../internal-utils/build-index-maps'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {editorMachine} from './editor-machine'
import {findOldBlock, syncMachine} from './sync-machine'

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
    status: 'ready',
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
        readOnly: false,
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

  test('`findOldBlock` resolves a moved block without scanning the value', () => {
    const keyGenerator = createTestKeyGenerator()
    const schema = compileSchema(defineSchema({}))
    const value: Array<PortableTextBlock> = Array.from({length: 5}, () => ({
      _type: 'block',
      _key: keyGenerator(),
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keyGenerator(), text: 'foo', marks: []}],
    }))
    const containers = new Map()
    const blockIndexMap = new Map<string, number>()
    buildIndexMaps({schema, containers, value}, {blockIndexMap})

    const readIndexes: Array<number> = []
    const observedValue = new Proxy(value, {
      get(target, property, receiver) {
        if (typeof property === 'string' && /^\d+$/.test(property)) {
          readIndexes.push(Number(property))
        }
        return Reflect.get(target, property, receiver)
      },
    })

    const result = findOldBlock({
      snapshot: {
        context: {schema, containers, value: observedValue},
        blockIndexMap,
      },
      blockKey: value[4]!._key,
      index: 0,
      incomingKeys: new Set(value.map((block) => block._key)),
    })

    expect(result).toEqual({blockAtIndex: value[0], oldBlock: value[4]})
    expect(readIndexes).toEqual([0, 4, 4])
  })
})
