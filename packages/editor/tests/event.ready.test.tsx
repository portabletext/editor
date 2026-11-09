import {createTestKeyGenerator} from '@portabletext/test'
import {useEffect} from 'react'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import type {EditorEmittedEvent} from '../src'
import {useEditor} from '../src/editor/use-editor'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {InternalEditorEngineRefPlugin} from '../src/plugins/plugin.internal.editor-engine-ref'
import {NodePlugin} from '../src/plugins/plugin.node'
import {createTestEditor} from '../src/test/vitest'
import type {PortableTextEditorEngine} from '../src/types/editor-engine'
import {
  createWrapperKeys,
  loadContainers,
  loadDepths,
  loadPositions,
  loadSchemaDefinition,
  positionIndex,
  textBlock,
} from '../test-utils/load-depths'
import {LoadOnMount, type LoadRecord} from '../test-utils/load-on-mount'

describe('event.ready', () => {
  test('Scenario: Ready is emitted for an "undefined" initial value', async () => {
    const onEvent = vi.fn<(event: EditorEmittedEvent) => void>()

    await createTestEditor({
      children: <EventListenerPlugin on={onEvent} />,
    })

    expect(onEvent).toHaveBeenCalledWith({type: 'ready'})
  })

  test('Scenario: Ready is emitted for a "[]" initial value', async () => {
    const onEvent = vi.fn<(event: EditorEmittedEvent) => void>()

    await createTestEditor({
      children: <EventListenerPlugin on={onEvent} />,
      initialValue: [],
    })

    expect(onEvent).toHaveBeenCalledWith({type: 'ready'})
  })

  test("Scenario: `status` is `loading` in a plugin's first render and `ready` in the `ready` listener", async () => {
    const statusesAtRender: Array<unknown> = []
    const statusesAtReady: Array<unknown> = []

    function StatusProbe() {
      const editor = useEditor()
      statusesAtRender.push(editor.getSnapshot().status)
      useEffect(() => {
        const subscription = editor.on('ready', () => {
          statusesAtReady.push(editor.getSnapshot().status)
        })
        return () => subscription.unsubscribe()
      }, [editor])
      return null
    }

    const {editor} = await createTestEditor({children: <StatusProbe />})

    expect(statusesAtRender[0]).toEqual('loading')
    expect(statusesAtReady).toEqual(['ready'])
    expect(editor.getSnapshot().status).toEqual('ready')
  })

  test('Scenario: `status` never goes back to `loading`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    expect(editor.getSnapshot().status).toEqual('ready')

    editor.send({type: 'update readOnly', readOnly: true})
    editor.send({type: 'update value', value: []})
    editor.send({type: 'update readOnly', readOnly: false})

    expect(editor.getSnapshot().status).toEqual('ready')
  })

  describe('load', () => {
    test.each(
      loadDepths.flatMap((depth) =>
        loadPositions.map((position) => ({depth, position})),
      ),
    )(
      'Scenario: `load` of a target block at the $position of three siblings in $depth.name makes `ready` carry the value',
      async ({depth, position}) => {
        const keyGenerator = createTestKeyGenerator()
        const wrapperKey = createWrapperKeys(keyGenerator)
        const siblings = ['foo', 'bar', 'baz'].map((text, index) =>
          textBlock(
            keyGenerator(),
            keyGenerator(),
            text,
            index === positionIndex(position) ? ['strong'] : [],
          ),
        )
        const {value} = depth.wrap(siblings, wrapperKey)
        const records: Array<LoadRecord> = []
        const engineRef = React.createRef<PortableTextEditorEngine>()

        const {editor} = await createTestEditor({
          keyGenerator,
          schemaDefinition: loadSchemaDefinition,
          children: (
            <>
              <InternalEditorEngineRefPlugin ref={engineRef} />
              <NodePlugin nodes={loadContainers} />
              <LoadOnMount loads={[value]} records={records} />
            </>
          ),
        })

        expect(records).toEqual([{type: 'ready', value, status: 'ready'}])
        expect(editor.getSnapshot().context.value).toEqual(value)
        expect(engineRef.current?.history).toEqual({undos: [], redos: []})
      },
    )

    test.each(loadDepths)(
      'Scenario: A second `load` in the same commit replaces the first at $name',
      async (depth) => {
        const keyGenerator = createTestKeyGenerator()
        const wrapperKey = createWrapperKeys(keyGenerator)
        const first = depth.wrap(
          [textBlock(keyGenerator(), keyGenerator(), 'foo')],
          wrapperKey,
        ).value
        const second = depth.wrap(
          [textBlock(keyGenerator(), keyGenerator(), 'bar')],
          wrapperKey,
        ).value
        const records: Array<LoadRecord> = []

        const {editor} = await createTestEditor({
          keyGenerator,
          schemaDefinition: loadSchemaDefinition,
          children: (
            <>
              <NodePlugin nodes={loadContainers} />
              <LoadOnMount loads={[first, second]} records={records} />
            </>
          ),
        })

        expect(records).toEqual([
          {type: 'ready', value: second, status: 'ready'},
        ])
        expect(editor.getSnapshot().context.value).toEqual(second)
      },
    )

    test.each([
      {name: 'undefined', value: undefined},
      {name: 'an empty array', value: []},
    ])(
      'Scenario: `load` of $name gives the placeholder block and no `change`',
      async ({value}) => {
        const keyGenerator = createTestKeyGenerator()
        const records: Array<LoadRecord> = []

        const {editor} = await createTestEditor({
          keyGenerator,
          children: <LoadOnMount loads={[value]} records={records} />,
        })

        const placeholder = [
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ]
        expect(records).toEqual([
          {type: 'ready', value: placeholder, status: 'ready'},
        ])
        expect(editor.getSnapshot().context.value).toEqual(placeholder)
      },
    )
  })

  describe('resync', () => {
    test('Scenario: `resync` before `ready` throws', async () => {
      const errors: Array<unknown> = []

      function ResyncOnMount() {
        const editor = useEditor()
        useEffect(() => {
          try {
            editor.send({type: 'resync', value: []})
          } catch (error) {
            errors.push(error instanceof Error ? error.message : error)
          }
        }, [editor])
        return null
      }

      await createTestEditor({children: <ResyncOnMount />})

      expect(errors).toEqual([
        '`resync` is only valid once the editor is ready',
      ])
    })
  })
})
