import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {subscribeToOperations} from '../engine/core/operation-channel'
import {createEditor} from '../engine/create-editor'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {createChangeCollector} from './change-collector'
import type {ChangeEvent} from './relay'

describe(createChangeCollector.name, () => {
  test('an apply whose `before` listener throws does not stop later changes', () => {
    const editor = createBareEngine([block('b1', 's1', 'foo')])
    const changes: Array<ChangeEvent> = []
    const collector = createChangeCollector({
      editor,
      emit: (event) => {
        changes.push(event)
      },
    })
    collector.subscribe()
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
    const spanPath = [{_key: 'b1'}, 'children', {_key: 's1'}]

    expect(() =>
      editor.apply({type: 'insert.text', path: spanPath, offset: 3, text: '!'}),
    ).toThrow('boom')
    editor.apply({type: 'insert.text', path: spanPath, offset: 3, text: '?'})

    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 3, text: '?'},
        ],
        patches: [],
      },
    ])
  })

  test('an apply made while a change is emitted goes into a new change', () => {
    const editor = createBareEngine([block('b1', 's1', 'foo')])
    const changes: Array<ChangeEvent> = []
    const spanPath = [{_key: 'b1'}, 'children', {_key: 's1'}]
    let reentered = false
    const collector = createChangeCollector({
      editor,
      emit: (event) => {
        changes.push(event)
        if (!reentered) {
          reentered = true
          editor.apply({
            type: 'insert.text',
            path: spanPath,
            offset: 4,
            text: '?',
          })
        }
      },
    })
    collector.subscribe()

    collector.withUnit(() => {
      editor.apply({type: 'insert.text', path: spanPath, offset: 3, text: '!'})
    })

    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 3, text: '!'},
        ],
        patches: [],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {type: 'insert.text', path: spanPath, offset: 4, text: '?'},
        ],
        patches: [],
      },
    ])
  })
})

function createBareEngine(
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
      keyGenerator: () => 'generated-key',
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
