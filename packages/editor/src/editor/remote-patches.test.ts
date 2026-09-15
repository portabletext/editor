import type {Patch} from '@portabletext/patches'
import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {createEditor} from '../engine/create-editor'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {EditorActor} from './editor-machine'
import {createMutationLedger} from './mutation-ledger'
import {setupRemotePatches} from './remote-patches'

function createTestHarness() {
  const schema = compileSchema(defineSchema({}))
  const keyGenerator = createTestKeyGenerator()

  const rawEditor: any = createEditor()
  rawEditor.snapshot = {
    blockIndexMap: new Map(),
    context: {
      containers: new Map(),
      converters: [],
      keyGenerator,
      readOnly: false,
      schema,
      selection: null,
      value: [
        {
          _key: 'b1',
          _type: 'block',
          children: [{_key: 'b1-span', _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    },
    decoratorState: {},
  }
  const editor = rawEditor as PortableTextEditorEngine
  editor.mutationLedger = createMutationLedger()

  let patchesListener: ((event: {patches: Array<Patch>}) => void) | undefined

  const editorActor = {
    getSnapshot: () => ({
      context: {schema, keyGenerator, initialValue: undefined},
    }),
    on: (
      _type: 'patches',
      listener: (event: {patches: Array<Patch>}) => void,
    ) => {
      patchesListener = listener
      return {unsubscribe: () => {}}
    },
  } as unknown as EditorActor

  const subscriptions: Array<() => () => void> = []
  setupRemotePatches({editorActor, subscriptions, editor})
  for (const subscription of subscriptions) {
    subscription()
  }

  return {
    editor,
    sendPatches: (patches: Array<Patch>) => {
      patchesListener?.({patches})
    },
  }
}

function textPatch(key: string, value: string, origin: Patch['origin']): Patch {
  return {
    type: 'set',
    path: [{_key: key}, 'children', {_key: `${key}-span`}, 'text'],
    value,
    origin,
  }
}

describe('remote patches: ledger acknowledgment', () => {
  test("an `origin: 'local'` echo acknowledges the recorded patch", () => {
    const harness = createTestHarness()

    harness.editor.mutationLedger.record([textPatch('b1', 'foo', 'local')])

    harness.sendPatches([textPatch('b1', 'foo', 'local')])

    expect(harness.editor.mutationLedger.unacknowledged()).toEqual([])
  })

  test('an unrecorded local echo leaves the ledger untouched', () => {
    const harness = createTestHarness()

    harness.editor.mutationLedger.record([textPatch('b1', 'foo', 'local')])

    harness.sendPatches([textPatch('b1', 'bar', 'local')])

    expect(harness.editor.mutationLedger.unacknowledged()).toEqual([
      textPatch('b1', 'foo', 'local'),
    ])
  })

  test('remote patches do not acknowledge recorded patches', () => {
    const harness = createTestHarness()

    harness.editor.mutationLedger.record([textPatch('b1', 'foo', 'local')])

    // A remote no-op: `setIfMissing` on a root that already holds a value
    // applies nothing, so the pass settles without touching the engine.
    harness.sendPatches([
      {type: 'setIfMissing', path: [], value: [], origin: 'remote'},
    ])

    expect(harness.editor.mutationLedger.unacknowledged()).toEqual([
      textPatch('b1', 'foo', 'local'),
    ])
  })
})
