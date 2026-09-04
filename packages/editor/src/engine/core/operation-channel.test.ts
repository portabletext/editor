import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
  type PortableTextSpan,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {withRemoteChanges} from '../../engine-plugins/engine-plugin.remote-changes'
import {pluginUndoing} from '../../engine-plugins/engine-plugin.undoing'
import {pluginWithoutHistory} from '../../engine-plugins/engine-plugin.without-history'
import {withoutPatching} from '../../engine-plugins/engine-plugin.without-patching'
import {buildIndexMaps} from '../../internal-utils/build-index-maps'
import {selectOperationImplementation} from '../../operations/operation.select'
import {defineContainer, type Container} from '../../renderers/renderer.types'
import {
  resolveContainers,
  resolveContainersRich,
} from '../../schema/resolve-containers-batch'
import type {PortableTextEditorEngine} from '../../types/editor-engine'
import {createEditor} from '../create-editor'
import type {Editor} from '../interfaces/editor'
import type {EngineOperation} from '../interfaces/operation'
import {subscribeToOperations, type OperationEvent} from './operation-channel'

const schema = compileSchema(defineSchema({}))

function createBareEditor(value: Array<PortableTextBlock>): Editor {
  const editor = createEditor()

  editor.containers = new Map()
  editor.blockIndexMap = new Map()
  editor.verifiedUniqueChildGroups = new Set()
  editor.snapshot = {
    blockIndexMap: editor.blockIndexMap,
    context: {
      containers: new Map(),
      converters: [],
      keyGenerator: () => 'generated-key',
      readOnly: false,
      schema,
      selection: null,
      value,
    },
    decoratorState: {},
    // The bare engine editor lacks the fields that `withDOM` and
    // `createEditorEngine` assign. Only the snapshot fields used by
    // `apply` are needed here.
  } as Editor['snapshot']

  return editor
}

function createDefaultValue(): Array<PortableTextBlock> {
  return [
    {
      _type: 'block',
      _key: 'b1',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
    },
  ]
}

function getSpanText(value: Array<PortableTextBlock>): string {
  const block = value[0] as PortableTextTextBlock
  const span = block.children[0] as PortableTextSpan
  return span.text
}

const insertTextOperation: EngineOperation = {
  type: 'insert.text',
  path: [{_key: 'b1'}, 'children', {_key: 's1'}],
  offset: 3,
  text: 'bar',
}

describe('operation channel', () => {
  test('`before` listeners observe pre-apply state, `after` listeners post-apply state', () => {
    const editor = createBareEditor(createDefaultValue())
    const observations: Array<{
      phase: 'before' | 'after'
      liveText: string
      beforeText: string
      event: OperationEvent
    }> = []

    subscribeToOperations(
      editor,
      (event) => {
        observations.push({
          phase: 'before',
          liveText: getSpanText(editor.snapshot.context.value),
          beforeText: getSpanText(event.beforeValue),
          event,
        })
      },
      {phase: 'before'},
    )
    subscribeToOperations(editor, (event) => {
      observations.push({
        phase: 'after',
        liveText: getSpanText(editor.snapshot.context.value),
        beforeText: getSpanText(event.beforeValue),
        event,
      })
    })

    editor.apply(insertTextOperation)

    expect(
      observations.map(({phase, liveText, beforeText}) => ({
        phase,
        liveText,
        beforeText,
      })),
    ).toEqual([
      {phase: 'before', liveText: 'foo', beforeText: 'foo'},
      {phase: 'after', liveText: 'foobar', beforeText: 'foo'},
    ])
    expect(observations[0]?.event).toBe(observations[1]?.event)
    expect(observations[0]?.event.operation).toBe(insertTextOperation)
    expect(observations[0]?.event.origin).toBe('local')
  })

  test('listeners run in subscription order', () => {
    const editor = createBareEditor(createDefaultValue())
    const callOrder: Array<string> = []

    subscribeToOperations(editor, () => {
      callOrder.push('first')
    })
    subscribeToOperations(editor, () => {
      callOrder.push('second')
    })
    subscribeToOperations(editor, () => {
      callOrder.push('third')
    })

    editor.apply(insertTextOperation)

    expect(callOrder).toEqual(['first', 'second', 'third'])
  })

  test('unsubscribing stops delivery', () => {
    const editor = createBareEditor(createDefaultValue())
    let callCount = 0

    const unsubscribe = subscribeToOperations(editor, () => {
      callCount++
    })

    editor.apply(insertTextOperation)
    unsubscribe()
    editor.apply({...insertTextOperation, offset: 0})

    expect(callCount).toBe(1)
  })

  test('`operationsInProgress` reflects unflushed operations at apply entry', () => {
    const editor = createBareEditor(createDefaultValue())
    const inProgressFlags: Array<boolean> = []

    subscribeToOperations(editor, (event) => {
      inProgressFlags.push(event.operationsInProgress)
    })

    editor.apply(insertTextOperation)
    editor.apply({...insertTextOperation, offset: 0})

    expect(inProgressFlags).toEqual([false, true])
  })

  test('`beforeSelection` captures the pre-apply selection', () => {
    const editor = createBareEditor(createDefaultValue())
    const beforeSelections: Array<OperationEvent['beforeSelection']> = []

    subscribeToOperations(editor, (event) => {
      beforeSelections.push(event.beforeSelection)
    })

    const range = {
      anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 0},
      focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 3},
    }

    editor.apply({
      type: 'set.selection',
      properties: null,
      newProperties: range,
    })

    expect(beforeSelections).toEqual([null])
    expect(editor.snapshot.context.selection).toEqual({
      ...range,
      backward: false,
    })
  })

  test('operations replace the value instead of mutating it, keeping `beforeValue` intact', () => {
    const operationCases: Array<{name: string; operation: EngineOperation}> = [
      {
        name: 'insert.text on a span',
        operation: insertTextOperation,
      },
      {
        name: 'set on a block property',
        operation: {type: 'set', path: [{_key: 'b1'}, 'style'], value: 'h1'},
      },
      {
        name: 'insert of a block',
        operation: {
          type: 'insert',
          path: [{_key: 'b1'}],
          position: 'after',
          node: {
            _type: 'block',
            _key: 'b2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 's2', text: '', marks: []}],
          },
        },
      },
      {
        name: 'unset of a block',
        operation: {type: 'unset', path: [{_key: 'b2'}]},
      },
      {
        name: 'root-level set',
        operation: {
          type: 'set',
          path: [],
          value: [
            {
              _type: 'block',
              _key: 'b3',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 's3', text: 'new', marks: []}],
            },
          ],
        },
      },
    ]

    for (const operationCase of operationCases) {
      const initialValue: Array<PortableTextBlock> = [
        ...createDefaultValue(),
        {
          _type: 'block',
          _key: 'b2',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 's2', text: 'second', marks: []}],
        },
      ]
      const editor = createBareEditor(initialValue)
      const preApplyValue = structuredClone(initialValue)
      let capturedEvent: OperationEvent | undefined

      subscribeToOperations(editor, (event) => {
        capturedEvent = capturedEvent ?? event
      })

      editor.apply(operationCase.operation)

      expect(
        capturedEvent?.beforeValue,
        `${operationCase.name}: the value array is replaced`,
      ).not.toBe(editor.snapshot.context.value)
      expect(
        capturedEvent?.beforeValue,
        `${operationCase.name}: \`beforeValue\` is not mutated in place`,
      ).toEqual(preApplyValue)
    }
  })

  test('operations replace the selection instead of mutating it, keeping `beforeSelection` intact', () => {
    const editor = createBareEditor(createDefaultValue())
    const preApplySelection = {
      anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 3},
      focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 3},
      backward: false,
    }
    editor.snapshot.context.selection = preApplySelection
    let capturedEvent: OperationEvent | undefined

    subscribeToOperations(editor, (event) => {
      capturedEvent = capturedEvent ?? event
    })

    editor.apply({...insertTextOperation, offset: 0})

    expect(capturedEvent?.beforeSelection).toBe(preApplySelection)
    expect(editor.snapshot.context.selection).not.toBe(preApplySelection)
    expect(preApplySelection.anchor.offset).toBe(3)
    expect(editor.snapshot.context.selection?.anchor.offset).toBe(6)
  })

  test('engine flags are snapshotted onto the event and derive `origin`', () => {
    const editor = createBareEditor(createDefaultValue())
    const origins: Array<OperationEvent['origin']> = []

    subscribeToOperations(editor, (event) => {
      origins.push(event.origin)
    })

    editor.apply(insertTextOperation)

    withRemoteChanges(editor, 'patches', () => {
      editor.apply({...insertTextOperation, offset: 0})
    })

    pluginUndoing(editor, () => {
      editor.apply({...insertTextOperation, offset: 0})
    })

    expect(origins).toEqual(['local', 'remote', 'undo'])
  })

  test('normalization fix events nest between the triggering operation’s `before` and `after`', () => {
    const editor = createBareEditor(createDefaultValue())
    const eventLog: Array<string> = []

    let fixApplied = false
    editor.normalizeNode = () => {
      if (!fixApplied) {
        fixApplied = true
        editor.apply(insertTextOperation)
      }
    }

    subscribeToOperations(
      editor,
      (event) => {
        eventLog.push(`before:${event.operation.type}:${event.origin}`)
      },
      {phase: 'before'},
    )
    subscribeToOperations(editor, (event) => {
      eventLog.push(`after:${event.operation.type}:${event.origin}`)
    })

    editor.apply({
      type: 'set',
      path: [{_key: 'b1'}, 'style'],
      value: 'h1',
    })

    // The fix operation’s `after` event fires before the triggering
    // operation’s.
    expect(eventLog).toEqual([
      'before:set:local',
      'before:insert.text:normalization',
      'after:insert.text:normalization',
      'after:set:local',
    ])
  })

  test('a normalization bracket nested inside a consumer `normalizeNode` override does not clobber the outer bracket', () => {
    const editor = createBareEditor(createDefaultValue())
    const events: Array<{
      origin: OperationEvent['origin']
      isNormalizingNode: boolean
    }> = []

    let fixApplied = false
    editor.normalizeNode = () => {
      if (fixApplied) {
        return
      }
      fixApplied = true

      // Mirrors the inner bracket `operation.select`'s container repair
      // establishes around its own `normalizeNode` call, nested inside
      // this (outer) bracket.
      const prev = editor.isNormalizingNode
      editor.isNormalizingNode = true
      editor.applyContext.push({kind: 'normalization'})
      try {
        // The inner bracket's own `normalizeNode` call.
      } finally {
        editor.applyContext.pop()
        editor.isNormalizingNode = prev
      }

      editor.apply(insertTextOperation)
    }

    subscribeToOperations(editor, (event) => {
      events.push({
        origin: event.origin,
        isNormalizingNode: event.isNormalizingNode,
      })
    })

    editor.apply({
      type: 'set',
      path: [{_key: 'b1'}, 'style'],
      value: 'h1',
    })

    expect(events).toEqual([
      {origin: 'normalization', isNormalizingNode: true},
      {origin: 'local', isNormalizingNode: false},
    ])
  })

  test('an `operation.select` container-repair bracket nested inside a consumer `normalizeNode` override does not clobber the outer bracket', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'sidebar',
            fields: [
              {
                name: 'markDefs',
                type: 'array',
                of: [
                  {
                    type: 'object',
                    name: 'note',
                    fields: [{name: 'title', type: 'string'}],
                  },
                ],
              },
            ],
          },
        ],
      }),
    )
    const publicContainers: Array<Container> = [
      defineContainer({type: 'sidebar', arrayField: 'markDefs'}),
    ]
    const value: Array<PortableTextBlock> = [
      ...createDefaultValue(),
      {_key: 'c1', _type: 'sidebar', markDefs: []},
    ]
    const editor = createBareEditor(value)
    const containers = resolveContainers(schema, publicContainers)
    buildIndexMaps(
      {schema, containers, value},
      {blockIndexMap: editor.blockIndexMap},
    )
    editor.containers = resolveContainersRich(schema, publicContainers)
    editor.snapshot.context.schema = schema
    editor.snapshot.context.containers = containers

    const events: Array<{
      operationType: string
      origin: OperationEvent['origin']
      isNormalizingNode: boolean
    }> = []
    subscribeToOperations(editor, (event) => {
      events.push({
        operationType: event.operation.type,
        origin: event.origin,
        isNormalizingNode: event.isNormalizingNode,
      })
    })

    const containerPoint = {path: [{_key: 'c1'}], offset: 0}
    let outerFired = false
    editor.normalizeNode = () => {
      if (outerFired) {
        // The nested call `operation.select`'s repair issues for the
        // empty container; nothing to fix.
        return
      }
      outerFired = true

      // Selecting the empty container lands the point on the container
      // itself (it has no children to descend into), which is exactly
      // the scenario `operation.select`'s container-repair bracket
      // guards: it re-enters `editor.normalizeNode` nested inside this
      // (outer) normalization bracket.
      selectOperationImplementation({
        snapshot: editor.snapshot,
        operation: {
          type: 'select',
          editor: editor as unknown as PortableTextEditorEngine,
          at: {anchor: containerPoint, focus: containerPoint},
        },
      })

      editor.apply(insertTextOperation)
    }

    editor.apply({
      type: 'set',
      path: [{_key: 'b1'}, 'style'],
      value: 'h1',
    })

    const insertTextEvent = events.find(
      (event) => event.operationType === 'insert.text',
    )
    expect(insertTextEvent).toEqual({
      operationType: 'insert.text',
      origin: 'normalization',
      isNormalizingNode: true,
    })
  })

  test('`context` carries the frame stack `origin` derives from, across nested attribution brackets', () => {
    const editor = createBareEditor(createDefaultValue())
    const events: Array<{
      origin: OperationEvent['origin']
      context: OperationEvent['context']
    }> = []

    let fixApplied = false
    editor.normalizeNode = () => {
      if (!fixApplied) {
        fixApplied = true
        editor.apply(insertTextOperation)
      }
    }

    subscribeToOperations(editor, (event) => {
      events.push({origin: event.origin, context: event.context})
    })

    const setStyle = (value: string) => ({
      type: 'set' as const,
      path: [{_key: 'b1'}, 'style'],
      value,
    })

    editor.apply(setStyle('h1'))

    fixApplied = false
    withRemoteChanges(editor, 'patches', () => {
      editor.apply(setStyle('normal'))
    })

    fixApplied = false
    pluginUndoing(editor, () => {
      editor.apply(setStyle('h1'))
    })

    expect(events).toEqual([
      {origin: 'normalization', context: [{kind: 'normalization'}]},
      {origin: 'local', context: []},
      {
        origin: 'remote',
        context: [{kind: 'remote', source: 'patches'}, {kind: 'normalization'}],
      },
      {origin: 'remote', context: [{kind: 'remote', source: 'patches'}]},
      {
        origin: 'undo',
        context: [{kind: 'undo'}, {kind: 'normalization'}],
      },
      {origin: 'undo', context: [{kind: 'undo'}]},
    ])
  })

  test('a throw inside `withRemoteChanges` does not stick `isProcessingRemoteChanges`', () => {
    const editor = createBareEditor(createDefaultValue())
    editor.isProcessingRemoteChanges = false
    const origins: Array<OperationEvent['origin']> = []

    subscribeToOperations(editor, (event) => {
      origins.push(event.origin)
    })

    expect(() =>
      withRemoteChanges(editor, 'patches', () => {
        throw new Error('boom')
      }),
    ).toThrow('boom')

    expect(editor.isProcessingRemoteChanges).toEqual(false)
    expect(editor.applyContext).toEqual([])

    editor.apply(insertTextOperation)

    expect(origins).toEqual(['local'])
  })

  test('a throw inside `withoutPatching` does not stick `isPatching`', () => {
    const editor = createBareEditor(createDefaultValue())
    editor.isPatching = true
    const isPatchingFlags: Array<boolean> = []

    subscribeToOperations(editor, (event) => {
      isPatchingFlags.push(event.isPatching)
    })

    expect(() =>
      withoutPatching(editor, () => {
        throw new Error('boom')
      }),
    ).toThrow('boom')

    expect(editor.isPatching).toEqual(true)

    editor.apply(insertTextOperation)

    expect(isPatchingFlags).toEqual([true])
  })

  test('a throw inside `pluginWithoutHistory` does not stick `withHistory`', () => {
    const editor = createBareEditor(createDefaultValue())
    editor.withHistory = true
    const withHistoryFlags: Array<boolean> = []

    subscribeToOperations(editor, (event) => {
      withHistoryFlags.push(event.withHistory)
    })

    expect(() =>
      pluginWithoutHistory(editor, () => {
        throw new Error('boom')
      }),
    ).toThrow('boom')

    expect(editor.withHistory).toEqual(true)

    editor.apply(insertTextOperation)

    expect(withHistoryFlags).toEqual([true])
  })
  test('a throw inside `pluginUndoing` does not stick `isUndoing`', () => {
    const editor = createBareEditor(createDefaultValue())
    editor.isUndoing = false

    expect(() => {
      pluginUndoing(editor, () => {
        throw new Error('boom')
      })
    }).toThrow('boom')

    expect(editor.isUndoing).toEqual(false)
  })

  test('a throw inside a normalization bracket leaves `isNormalizingNode` restored and `applyContext` balanced', () => {
    const editor = createBareEditor(createDefaultValue())
    editor.isNormalizingNode = false
    editor.normalizeNode = () => {
      throw new Error('boom')
    }

    expect(() =>
      editor.apply({
        type: 'set',
        path: [{_key: 'b1'}, 'style'],
        value: 'h1',
      }),
    ).toThrow('boom')

    expect(editor.isNormalizingNode).toEqual(false)
    expect(editor.applyContext).toEqual([])
  })
})
