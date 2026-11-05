import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, onTestFinished, test, vi} from 'vitest'
import {createActor} from 'xstate'
import {normalize} from '../engine/editor/normalize'
import {buildIndexMaps} from '../internal-utils/build-index-maps'
import {
  createTextBlockDepthTestbed,
  textBlockDepths,
} from '../traversal/node-traversal-testbed'
import {createEditorEngine} from './create-editor-engine'
import {editorMachine} from './editor-machine'

describe.each(textBlockDepths)(
  'deferred local patches with a compact incoming patch %s',
  (depth) => {
    test('Scenario: a compact incoming patch leaves deferred normalization patches in place', () => {
      const {editorActor, consoleCalls, testbed} = setUpPristineEditor(depth)
      const {blockPath, fooSpan, barSpan} = testbed

      expect(editorActor.getSnapshot().context.pendingEvents).toEqual([
        {
          type: 'internal.patch',
          operationId: undefined,
          patch: {
            origin: 'local',
            type: 'set',
            path: [...blockPath, 'children', {_key: barSpan._key}, 'marks'],
            value: [],
          },
        },
        {
          type: 'internal.patch',
          operationId: undefined,
          patch: {
            origin: 'local',
            type: 'set',
            path: [...blockPath, 'children', {_key: fooSpan._key}, 'marks'],
            value: [],
          },
        },
        {
          type: 'internal.patch',
          operationId: undefined,
          patch: {
            origin: 'local',
            type: 'diffMatchPatch',
            path: [...blockPath, 'children', {_key: fooSpan._key}, 'text'],
            value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
          },
        },
        {
          type: 'internal.patch',
          operationId: undefined,
          patch: {
            origin: 'local',
            type: 'unset',
            path: [...blockPath, 'children', {_key: barSpan._key}],
          },
        },
        {
          type: 'internal.patch',
          operationId: undefined,
          patch: {
            origin: 'local',
            type: 'set',
            path: [...blockPath, 'style'],
            value: 'normal',
          },
        },
        {
          type: 'internal.patch',
          operationId: undefined,
          patch: {
            origin: 'local',
            type: 'set',
            path: [...blockPath, 'markDefs'],
            value: [],
          },
        },
      ])

      editorActor.send({
        type: 'patches',
        patches: [
          {
            type: 'unset',
            path: [
              ...blockPath,
              'children',
              {_key: barSpan._key},
              'marks',
              0,
              0,
            ],
            origin: 'remote',
          },
        ],
        snapshot: undefined,
      })

      expect(editorActor.getSnapshot().context.pendingEvents).toEqual([
        {
          type: 'internal.patch',
          operationId: undefined,
          patch: {
            origin: 'local',
            type: 'set',
            path: [...blockPath, 'children', {_key: barSpan._key}, 'marks'],
            value: [],
          },
        },
        {
          type: 'internal.patch',
          operationId: undefined,
          patch: {
            origin: 'local',
            type: 'set',
            path: [...blockPath, 'children', {_key: fooSpan._key}, 'marks'],
            value: [],
          },
        },
        {
          type: 'internal.patch',
          operationId: undefined,
          patch: {
            origin: 'local',
            type: 'diffMatchPatch',
            path: [...blockPath, 'children', {_key: fooSpan._key}, 'text'],
            value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
          },
        },
        {
          type: 'internal.patch',
          operationId: undefined,
          patch: {
            origin: 'local',
            type: 'unset',
            path: [...blockPath, 'children', {_key: barSpan._key}],
          },
        },
        {
          type: 'internal.patch',
          operationId: undefined,
          patch: {
            origin: 'local',
            type: 'set',
            path: [...blockPath, 'style'],
            value: 'normal',
          },
        },
        {
          type: 'internal.patch',
          operationId: undefined,
          patch: {
            origin: 'local',
            type: 'set',
            path: [...blockPath, 'markDefs'],
            value: [],
          },
        },
      ])
      expect(consoleCalls()).toEqual({error: [], warn: []})
    })

    test('Scenario: in a batch of a full and a compact incoming patch, only the full patch discards conflicting deferred patches', () => {
      const {editorActor, consoleCalls, testbed} = setUpPristineEditor(depth)
      const {blockPath, fooSpan, barSpan} = testbed

      editorActor.send({
        type: 'patches',
        patches: [
          {
            type: 'unset',
            path: [...blockPath, 'children', {_key: barSpan._key}, 'marks'],
            origin: 'remote',
          },
          {
            type: 'unset',
            path: [...blockPath, 'style', 0, 0],
            origin: 'remote',
          },
        ],
        snapshot: undefined,
      })

      expect(editorActor.getSnapshot().context.pendingEvents).toEqual([
        {
          type: 'internal.patch',
          operationId: undefined,
          patch: {
            origin: 'local',
            type: 'set',
            path: [...blockPath, 'children', {_key: fooSpan._key}, 'marks'],
            value: [],
          },
        },
        {
          type: 'internal.patch',
          operationId: undefined,
          patch: {
            origin: 'local',
            type: 'diffMatchPatch',
            path: [...blockPath, 'children', {_key: fooSpan._key}, 'text'],
            value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
          },
        },
        {
          type: 'internal.patch',
          operationId: undefined,
          patch: {
            origin: 'local',
            type: 'set',
            path: [...blockPath, 'style'],
            value: 'normal',
          },
        },
        {
          type: 'internal.patch',
          operationId: undefined,
          patch: {
            origin: 'local',
            type: 'set',
            path: [...blockPath, 'markDefs'],
            value: [],
          },
        },
      ])
      expect(consoleCalls()).toEqual({error: [], warn: []})
    })
  },
)

function setUpPristineEditor(depth: (typeof textBlockDepths)[number]) {
  const consoleError = vi.spyOn(console, 'error')
  const consoleWarn = vi.spyOn(console, 'warn')
  const testbed = createTextBlockDepthTestbed(depth)
  const editorActor = createActor(editorMachine, {
    input: {
      keyGenerator: createTestKeyGenerator('generated-'),
      schema: testbed.snapshot.context.schema,
    },
  })
  const subscriptions: Array<() => () => void> = []
  editorActor.start()
  const engine = createEditorEngine({editorActor, subscriptions})
  editorActor.send({type: 'add editor engine', editor: engine})
  const unsubscribers = subscriptions.map((subscribe) => subscribe())
  editorActor.send({type: 'done syncing value'})

  engine.snapshot.context.containers = testbed.snapshot.context.containers
  engine.snapshot.context.value = structuredClone(
    testbed.snapshot.context.value,
  )
  buildIndexMaps(engine.snapshot.context, {
    blockIndexMap: engine.blockIndexMap,
  })

  normalize(engine, {force: true})

  onTestFinished(() => {
    for (const unsubscribe of unsubscribers) {
      unsubscribe()
    }
    editorActor.stop()
    consoleError.mockRestore()
    consoleWarn.mockRestore()
  })

  const consoleCalls = () => ({
    error: consoleError.mock.calls,
    warn: consoleWarn.mock.calls,
  })

  return {editorActor, consoleCalls, testbed}
}
