import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import type {PortableTextEditorEngine} from '../../types/editor-engine'
import {createEditor} from '../create-editor'
import type {EngineOperation} from '../interfaces/operation'
import {
  commitChange,
  createChange,
  resumeChange,
  subscribeToChanges,
  withChange,
  type ChangeCause,
} from './change'
import {subscribeToOperations} from './operation-channel'

describe(withChange.name, () => {
  test('an apply whose `before` listener throws does not stop later changes', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const editor = createBareEngine(keyGenerator, [
      block(blockKey, spanKey, 'foo'),
    ])
    const committed: Array<Array<EngineOperation>> = []
    subscribeToChanges(editor, (change) => {
      committed.push(change.entries.map((entry) => entry.event.operation))
    })
    let throwOnce = true
    subscribeToOperations(
      editor,
      () => {
        if (throwOnce) {
          throwOnce = false
          throw new Error('boom')
        }
      },
      {phase: 'before'},
    )
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    expect(() =>
      withChange(editor, {type: 'behavior event'}, () => {
        editor.apply({
          type: 'insert.text',
          path: spanPath,
          offset: 3,
          text: '!',
        })
      }),
    ).toThrow('boom')
    withChange(editor, {type: 'behavior event'}, () => {
      editor.apply({type: 'insert.text', path: spanPath, offset: 3, text: '?'})
    })

    expect(editor.change).toEqual(undefined)
    expect(committed).toEqual([
      [{type: 'insert.text', path: spanPath, offset: 3, text: '?'}],
    ])
  })

  test('a change opened while a change commits is a new change', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const editor = createBareEngine(keyGenerator, [
      block(blockKey, spanKey, 'foo'),
    ])
    const committed: Array<Array<EngineOperation>> = []
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    let reentered = false
    subscribeToChanges(editor, (change) => {
      committed.push(change.entries.map((entry) => entry.event.operation))
      if (!reentered) {
        reentered = true
        withChange(editor, {type: 'behavior event'}, () => {
          editor.apply({
            type: 'insert.text',
            path: spanPath,
            offset: 4,
            text: '?',
          })
        })
      }
    })

    withChange(editor, {type: 'behavior event'}, () => {
      editor.apply({type: 'insert.text', path: spanPath, offset: 3, text: '!'})
    })

    expect(committed).toEqual([
      [{type: 'insert.text', path: spanPath, offset: 3, text: '!'}],
      [{type: 'insert.text', path: spanPath, offset: 4, text: '?'}],
    ])
  })

  test('an apply outside a change throws', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const editor = createBareEngine(keyGenerator, [
      block(blockKey, spanKey, 'foo'),
    ])
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    expect(() =>
      editor.apply({type: 'insert.text', path: spanPath, offset: 3, text: '!'}),
    ).toThrow(
      '`insert.text` was applied outside a change. Only an entry point (a Behavior event, remote patches, a value sync or a registration) may open one.',
    )
  })

  test('a change for another cause cannot open inside an open change', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const editor = createBareEngine(keyGenerator, [
      block(blockKey, spanKey, 'foo'),
    ])

    expect(() =>
      withChange(editor, {type: 'behavior event'}, () => {
        withChange(editor, {type: 'remote patches'}, () => {})
      }),
    ).toThrow(
      'A `remote patches` change was opened while a `behavior event` change is open',
    )
  })
})

describe(resumeChange.name, () => {
  test('a change resumed across ticks commits once', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const editor = createBareEngine(keyGenerator, [
      block(blockKey, spanKey, 'foo'),
    ])
    const committed: Array<Array<EngineOperation>> = []
    subscribeToChanges(editor, (change) => {
      committed.push(change.entries.map((entry) => entry.event.operation))
    })
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const change = createChange({type: 'value sync', initial: true})

    resumeChange(editor, change, () => {
      editor.apply({type: 'insert.text', path: spanPath, offset: 3, text: '!'})
    })
    await Promise.resolve()
    resumeChange(editor, change, () => {
      editor.apply({type: 'insert.text', path: spanPath, offset: 4, text: '?'})
    })

    expect(editor.change).toEqual(undefined)
    expect(committed).toEqual([])

    commitChange(editor, change)
    commitChange(editor, change)

    expect(committed).toEqual([
      [
        {type: 'insert.text', path: spanPath, offset: 3, text: '!'},
        {type: 'insert.text', path: spanPath, offset: 4, text: '?'},
      ],
    ])
  })

  test('a change resumed while another change is open publishes what the open change applied first and keeps it open', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const editor = createBareEngine(keyGenerator, [
      block(blockKey, spanKey, 'foo'),
    ])
    const committed: Array<{
      cause: ChangeCause
      operations: Array<EngineOperation>
    }> = []
    subscribeToChanges(editor, (change) => {
      committed.push({
        cause: change.cause,
        operations: change.entries.map((entry) => entry.event.operation),
      })
    })
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const sync = createChange({type: 'value sync', initial: false})

    withChange(editor, {type: 'behavior event'}, () => {
      editor.apply({type: 'insert.text', path: spanPath, offset: 3, text: '!'})
      resumeChange(editor, sync, () => {
        editor.apply({
          type: 'insert.text',
          path: spanPath,
          offset: 4,
          text: '?',
        })
      })
      commitChange(editor, sync)
      editor.apply({type: 'insert.text', path: spanPath, offset: 5, text: '.'})
    })

    expect(editor.change).toEqual(undefined)
    expect(committed).toEqual([
      {
        cause: {type: 'behavior event'},
        operations: [
          {type: 'insert.text', path: spanPath, offset: 3, text: '!'},
        ],
      },
      {
        cause: {type: 'value sync', initial: false},
        operations: [
          {type: 'insert.text', path: spanPath, offset: 4, text: '?'},
        ],
      },
      {
        cause: {type: 'behavior event'},
        operations: [
          {type: 'insert.text', path: spanPath, offset: 5, text: '.'},
        ],
      },
    ])
  })

  test('a change listener that throws while an interrupted change publishes leaves the interrupted change open', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const editor = createBareEngine(keyGenerator, [
      block(blockKey, spanKey, 'foo'),
    ])
    let throwOnce = true
    subscribeToChanges(editor, () => {
      if (throwOnce) {
        throwOnce = false
        throw new Error('boom')
      }
    })
    const committed: Array<{
      cause: ChangeCause
      operations: Array<EngineOperation>
    }> = []
    subscribeToChanges(editor, (change) => {
      committed.push({
        cause: change.cause,
        operations: change.entries.map((entry) => entry.event.operation),
      })
    })
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const sync = createChange({type: 'value sync', initial: false})
    let resumed = false

    withChange(editor, {type: 'behavior event'}, () => {
      editor.apply({type: 'insert.text', path: spanPath, offset: 3, text: '!'})
      const interrupted = editor.change

      expect(() =>
        resumeChange(editor, sync, () => {
          resumed = true
        }),
      ).toThrow('boom')
      expect(editor.change).toBe(interrupted)

      editor.apply({type: 'insert.text', path: spanPath, offset: 4, text: '.'})
    })

    expect(resumed).toEqual(false)
    expect(editor.change).toEqual(undefined)
    expect(committed).toEqual([
      {
        cause: {type: 'behavior event'},
        operations: [
          {type: 'insert.text', path: spanPath, offset: 4, text: '.'},
        ],
      },
    ])
  })
})

function createBareEngine(
  keyGenerator: () => string,
  value: Array<PortableTextBlock>,
): PortableTextEditorEngine {
  const editor = createEditor() as PortableTextEditorEngine

  editor.containers = new Map()
  editor.blockIndexMap = new Map()
  editor.verifiedUniqueChildGroups = new Set()
  editor.isPatching = true
  // The bare engine lacks the fields that `withDOM` and `createEditorEngine`
  // assign; `apply` reads only these snapshot fields.
  editor.snapshot = {
    blockIndexMap: editor.blockIndexMap,
    context: {
      containers: new Map(),
      converters: [],
      keyGenerator,
      readOnly: false,
      schema: compileSchema(defineSchema({})),
      selection: null,
      value,
    },
    decoratorState: {},
  } as unknown as PortableTextEditorEngine['snapshot']

  return editor
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
