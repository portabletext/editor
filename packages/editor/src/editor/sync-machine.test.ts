import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {type AnyEventObject, createActor, fromCallback} from 'xstate'
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
  e.repairJournal = new Map()
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

  test('`updateBlock` replaces children wholesale instead of building a `{_key: undefined}` path when a child lacks a usable key', () => {
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

    const appliedOps = updateBlockWithinRemoteFrame({
      editor,
      context: {
        keyGenerator,
        previousValue: undefined,
        schema,
      },
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

  test('`updateBlock` replaces children wholesale, and normalization inserts the placeholder span, when the incoming block has no children', () => {
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

    const appliedOps = updateBlockWithinRemoteFrame({
      editor,
      context: {
        keyGenerator,
        previousValue: undefined,
        schema,
      },
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

  test('a repair-journal hit on a stale echo applies zero operations and keeps the entry', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, schema} = createTestEngine(keyGenerator)
    const blockKey = keyGenerator()

    const beforeShape: Node = {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', text: '', marks: []} as unknown as Node],
    }
    const afterShape: Node = {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k2', text: '', marks: []}],
    }
    editor.snapshot.context.value = [afterShape]
    editor.repairJournal.set(blockKey, {beforeShape, afterShape})

    const appliedOps: Array<EngineOperation> = []
    subscribeToOperations(editor, (event) => {
      if (event.operation.type !== 'set.selection') {
        appliedOps.push(event.operation)
      }
    })

    let doneSyncingCount = 0
    const actor = createActor(syncMachine, {
      input: {
        initialValue: undefined,
        keyGenerator,
        schema,
        editorEngine: editor,
      },
    })
    actor.on('done syncing value', () => {
      doneSyncingCount++
    })
    actor.start()

    await vi.waitFor(() => {
      expect(doneSyncingCount).toBe(1)
    })

    // The stale echo: `beforeShape` verbatim, the shape the engine held
    // before this repair.
    actor.send({type: 'update value', value: [beforeShape as any]})

    await vi.waitFor(() => {
      expect(doneSyncingCount).toBe(2)
    })

    expect(appliedOps).toEqual([])
    expect(editor.snapshot.context.value).toEqual([afterShape])
    expect(editor.repairJournal.get(blockKey)).toEqual({
      beforeShape,
      afterShape,
    })
  })

  test('a repair-journal near-miss (the engine block has since moved on from the journaled `afterShape`) applies the normal op stream and retires the entry', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, schema} = createTestEngine(keyGenerator)
    const blockKey = keyGenerator()

    const beforeShape: Node = {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', text: 'hello', marks: []} as unknown as Node],
    }
    // One field off the engine's actual current block (`text`): neither an
    // ack (doesn't match the inbound block either) nor an echo (the
    // engine's current block no longer matches it).
    const staleAfterShape: Node = {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k2', text: 'mismatch', marks: []}],
    }
    const currentEngineBlock: Node = {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k2', text: 'hello', marks: []}],
    }
    editor.snapshot.context.value = [currentEngineBlock]
    editor.repairJournal.set(blockKey, {
      beforeShape,
      afterShape: staleAfterShape,
    })

    const appliedOps: Array<EngineOperation> = []
    subscribeToOperations(editor, (event) => {
      if (event.operation.type !== 'set.selection') {
        appliedOps.push(event.operation)
      }
    })

    let doneSyncingCount = 0
    const actor = createActor(syncMachine, {
      input: {
        initialValue: undefined,
        keyGenerator,
        schema,
        editorEngine: editor,
      },
    })
    actor.on('done syncing value', () => {
      doneSyncingCount++
    })
    actor.start()

    await vi.waitFor(() => {
      expect(doneSyncingCount).toBe(1)
    })

    actor.send({type: 'update value', value: [beforeShape as any]})

    await vi.waitFor(() => {
      expect(doneSyncingCount).toBe(2)
    })

    expect(appliedOps.length).toBeGreaterThan(0)
    expect(editor.repairJournal.has(blockKey)).toBe(false)
  })

  test("a pass reports each block's echo independently in a set, not a single pass-wide flag", async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, schema} = createTestEngine(keyGenerator)
    const echoingBlockKey = keyGenerator()
    const ackingBlockKey = keyGenerator()

    const echoingBeforeShape: Node = {
      _type: 'block',
      _key: echoingBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', text: '', marks: []} as unknown as Node],
    }
    const echoingAfterShape: Node = {
      _type: 'block',
      _key: echoingBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k2', text: '', marks: []}],
    }
    const ackingBeforeShape: Node = {
      _type: 'block',
      _key: ackingBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', text: '', marks: []} as unknown as Node],
    }
    const ackingAfterShape: Node = {
      _type: 'block',
      _key: ackingBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
    }

    editor.snapshot.context.value = [echoingAfterShape, ackingAfterShape]
    editor.repairJournal.set(echoingBlockKey, {
      beforeShape: echoingBeforeShape,
      afterShape: echoingAfterShape,
    })
    editor.repairJournal.set(ackingBlockKey, {
      beforeShape: ackingBeforeShape,
      afterShape: ackingAfterShape,
    })

    const inboundStateAppliedEvents: Array<{echoedBlockKeys: Set<string>}> = []
    let doneSyncingCount = 0
    const actor = createActor(syncMachine, {
      input: {
        initialValue: undefined,
        keyGenerator,
        schema,
        editorEngine: editor,
      },
    })
    actor.on('inbound state applied', (event) => {
      inboundStateAppliedEvents.push(event)
    })
    actor.on('done syncing value', () => {
      doneSyncingCount++
    })
    actor.start()

    await vi.waitFor(() => {
      expect(doneSyncingCount).toBe(1)
    })

    // `echoingBlockKey`'s snapshot still carries its pre-repair shape (an
    // echo); `ackingBlockKey`'s snapshot carries exactly the repaired
    // shape (the host learned it).
    actor.send({
      type: 'update value',
      value: [echoingBeforeShape as any, ackingAfterShape as any],
    })

    await vi.waitFor(() => {
      expect(doneSyncingCount).toBe(2)
    })

    expect(inboundStateAppliedEvents).toEqual([
      {
        type: 'inbound state applied',
        echoedBlockKeys: new Set([echoingBlockKey]),
      },
    ])
  })

  test('`inbound state applied` fires even on a pass where every block echoed', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, schema} = createTestEngine(keyGenerator)
    const blockKey = keyGenerator()

    const beforeShape: Node = {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', text: '', marks: []} as unknown as Node],
    }
    const afterShape: Node = {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k2', text: '', marks: []}],
    }

    editor.snapshot.context.value = [afterShape]
    editor.repairJournal.set(blockKey, {beforeShape, afterShape})

    const inboundStateAppliedEvents: Array<{echoedBlockKeys: Set<string>}> = []
    let doneSyncingCount = 0
    const actor = createActor(syncMachine, {
      input: {
        initialValue: undefined,
        keyGenerator,
        schema,
        editorEngine: editor,
      },
    })
    actor.on('inbound state applied', (event) => {
      inboundStateAppliedEvents.push(event)
    })
    actor.on('done syncing value', () => {
      doneSyncingCount++
    })
    actor.start()

    await vi.waitFor(() => {
      expect(doneSyncingCount).toBe(1)
    })

    actor.send({type: 'update value', value: [beforeShape as any]})

    await vi.waitFor(() => {
      expect(doneSyncingCount).toBe(2)
    })

    expect(inboundStateAppliedEvents).toEqual([
      {type: 'inbound state applied', echoedBlockKeys: new Set([blockKey])},
    ])
  })

  test('a pass that aborts on an invalid block never emits `inbound state applied`, leaving the unexamined block unjudged', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, schema} = createTestEngine(keyGenerator)
    const validBlockKey = keyGenerator()
    const echoingBlockKey = keyGenerator()

    const validBlock: Node = {
      _type: 'block',
      _key: validBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k2', text: 'a', marks: []}],
    }
    const echoingBeforeShape: Node = {
      _type: 'block',
      _key: echoingBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', text: '', marks: []} as unknown as Node],
    }
    const echoingAfterShape: Node = {
      _type: 'block',
      _key: echoingBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
    }

    // `echoingBlockKey` sits second, already repaired by an earlier pass
    // and still echoed by the host (unresolved journal entry).
    editor.snapshot.context.value = [validBlock, echoingAfterShape]
    editor.repairJournal.set(echoingBlockKey, {
      beforeShape: echoingBeforeShape,
      afterShape: echoingAfterShape,
    })

    const inboundStateAppliedEvents: Array<unknown> = []
    const invalidValueEvents: Array<unknown> = []
    let doneSyncingCount = 0
    const actor = createActor(syncMachine, {
      input: {
        initialValue: undefined,
        keyGenerator,
        schema,
        editorEngine: editor,
      },
    })
    actor.on('inbound state applied', (event) => {
      inboundStateAppliedEvents.push(event)
    })
    actor.on('invalid value', (event) => {
      invalidValueEvents.push(event)
    })
    actor.on('done syncing value', () => {
      doneSyncingCount++
    })
    actor.start()

    await vi.waitFor(() => {
      expect(doneSyncingCount).toBe(1)
    })

    // The first block now carries a human-decision defect (an unknown
    // block type the schema never registered): the walk breaks there and
    // never reaches `echoingBlockKey`, still carrying its pre-repair
    // shape.
    actor.send({
      type: 'update value',
      value: [{_key: 'bad', _type: 'image'} as any, echoingBeforeShape as any],
    })

    await vi.waitFor(() => {
      expect(doneSyncingCount).toBe(2)
    })

    expect(invalidValueEvents).toHaveLength(1)
    expect(inboundStateAppliedEvents).toEqual([])
  })

  test('`syncing` entry emits `inbound sync started`, including on the reenter transition a value arriving mid-pass triggers', () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, schema} = createTestEngine(keyGenerator)

    // A controllable stand-in for the real `sync value` actor: it never
    // finishes on its own, so the test drives each pass's `done syncing`
    // by hand and can send a new value in between.
    const pendingSyncs: Array<{
      sendBack: (event: AnyEventObject) => void
      value: unknown
    }> = []
    const controlledSyncMachine = syncMachine.provide({
      actors: {
        'sync value': fromCallback(({sendBack, input}) => {
          pendingSyncs.push({
            sendBack,
            value: (input as {value: unknown}).value,
          })
        }),
      },
    })

    let inboundSyncStartedCount = 0
    const actor = createActor(controlledSyncMachine, {
      input: {
        initialValue: undefined,
        keyGenerator,
        schema,
        editorEngine: editor,
      },
    })
    actor.on('inbound sync started', () => {
      inboundSyncStartedCount++
    })
    actor.start()

    expect(inboundSyncStartedCount).toBe(0)

    const valueA = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'a', marks: []}],
      },
    ]
    const valueB = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'b', marks: []}],
      },
    ]

    actor.send({type: 'update value', value: valueA as any})

    // The first pass starts syncing `valueA` and never finishes on its own.
    expect(inboundSyncStartedCount).toBe(1)
    expect(pendingSyncs).toHaveLength(1)

    // A newer value arrives while that pass is still in progress.
    actor.send({type: 'update value', value: valueB as any})

    expect(inboundSyncStartedCount).toBe(1)
    expect(pendingSyncs).toHaveLength(1)

    // The in-progress pass finishes syncing the stale `valueA`, but a
    // newer value is now pending: the machine reenters `syncing` for a
    // second pass, which fires `inbound sync started` again.
    pendingSyncs[0]?.sendBack({
      type: 'done syncing',
      value: valueA,
      changed: true,
      completed: true,
      echoedBlockKeys: new Set(),
    })

    expect(inboundSyncStartedCount).toBe(2)
    expect(pendingSyncs).toHaveLength(2)

    // The second pass finishes syncing the now-current value: nothing is
    // pending, so the machine settles into `idle` without starting a
    // third pass.
    pendingSyncs[1]?.sendBack({
      type: 'done syncing',
      value: valueB,
      changed: true,
      completed: true,
      echoedBlockKeys: new Set(),
    })

    expect(inboundSyncStartedCount).toBe(2)
  })
})

/**
 * Mirrors how `syncBlock` always invokes `updateBlock`: inside a remote
 * frame (suppresses cosmetic normalization unrelated to this fallback) and
 * with normalization deferred until the wrapper exits.
 */
function updateBlockWithinRemoteFrame(
  args: Omit<Parameters<typeof updateBlock>[0], 'editorEngine'> & {
    editor: PortableTextEditorEngine
  },
) {
  const {editor, ...updateBlockArgs} = args

  editor.applyContext = [{kind: 'remote', source: 'update-value'}]

  const appliedOps: Array<EngineOperation> = []
  const originalApply = editor.apply.bind(editor)
  editor.apply = (op: EngineOperation) => {
    appliedOps.push(op)
    return originalApply(op)
  }

  withoutNormalizing(editor, () => {
    updateBlock({...updateBlockArgs, editorEngine: editor})
  })

  return appliedOps
}
