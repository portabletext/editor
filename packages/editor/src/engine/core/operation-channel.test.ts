import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
  type PortableTextSpan,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {createEditor} from '../create-editor'
import type {Editor} from '../interfaces/editor'
import type {EngineOperation} from '../interfaces/operation'
import {subscribeToOperations, type OperationEvent} from './operation-channel'

const schema = compileSchema(defineSchema({}))

function createBareEditor(value: Array<PortableTextBlock>): Editor {
  const editor = createEditor()

  editor.containers = new Map()
  editor.blockIndexMap = new Map()
  editor.listIndexMap = new Map()
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

    editor.isProcessingRemoteChanges = true
    editor.apply({...insertTextOperation, offset: 0})
    editor.isProcessingRemoteChanges = false

    editor.isUndoing = true
    editor.apply({...insertTextOperation, offset: 0})
    editor.isUndoing = false

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
})
