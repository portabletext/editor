import {createTestKeyGenerator} from '@portabletext/test'
import {useEffect} from 'react'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {
  EditorProvider,
  PortableTextEditable,
  type Editor,
  type EditorEmittedEvent,
} from '../src'
import {useEditor} from '../src/editor/use-editor'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {InternalEditorEngineRefPlugin} from '../src/plugins/plugin.internal.editor-engine-ref'
import {NodePlugin} from '../src/plugins/plugin.node'
import {createTestEditor} from '../src/test/vitest'
import type {PortableTextEditorEngine} from '../src/types/editor-engine'
import {
  createWrapperKeys,
  loadContainers,
  loadDepths,
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

  test('Scenario: `load` after `ready` throws', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
    })
    expect(() => editor.send({type: 'load', value: []})).toThrow(
      '`load` is only valid while the editor is loading',
    )
  })

  describe('load', () => {
    test('Scenario: `load` of a target block at the first of three siblings in root makes `ready` carry the value', async () => {
      const depth = loadDepths[0]!

      const position = 'first'

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
    })

    test('Scenario: `load` of a target block at the middle of three siblings in root makes `ready` carry the value', async () => {
      const depth = loadDepths[0]!

      const position = 'middle'

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
    })

    test('Scenario: `load` of a target block at the last of three siblings in root makes `ready` carry the value', async () => {
      const depth = loadDepths[0]!

      const position = 'last'

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
    })

    test('Scenario: `load` of a target block at the first of three siblings in callout makes `ready` carry the value', async () => {
      const depth = loadDepths[1]!

      const position = 'first'

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
    })

    test('Scenario: `load` of a target block at the middle of three siblings in callout makes `ready` carry the value', async () => {
      const depth = loadDepths[1]!

      const position = 'middle'

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
    })

    test('Scenario: `load` of a target block at the last of three siblings in callout makes `ready` carry the value', async () => {
      const depth = loadDepths[1]!

      const position = 'last'

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
    })

    test('Scenario: `load` of a target block at the first of three siblings in nested callout makes `ready` carry the value', async () => {
      const depth = loadDepths[2]!

      const position = 'first'

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
    })

    test('Scenario: `load` of a target block at the middle of three siblings in nested callout makes `ready` carry the value', async () => {
      const depth = loadDepths[2]!

      const position = 'middle'

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
    })

    test('Scenario: `load` of a target block at the last of three siblings in nested callout makes `ready` carry the value', async () => {
      const depth = loadDepths[2]!

      const position = 'last'

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
    })

    test('Scenario: `load` of a target block at the first of three siblings in table cell makes `ready` carry the value', async () => {
      const depth = loadDepths[3]!

      const position = 'first'

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
    })

    test('Scenario: `load` of a target block at the middle of three siblings in table cell makes `ready` carry the value', async () => {
      const depth = loadDepths[3]!

      const position = 'middle'

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
    })

    test('Scenario: `load` of a target block at the last of three siblings in table cell makes `ready` carry the value', async () => {
      const depth = loadDepths[3]!

      const position = 'last'

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
    })

    test('Scenario: A second `load` in the same commit replaces the first at root', async () => {
      const depth = loadDepths[0]!

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

      expect(records).toEqual([{type: 'ready', value: second, status: 'ready'}])
      expect(editor.getSnapshot().context.value).toEqual(second)
    })

    test('Scenario: A second `load` in the same commit replaces the first at callout', async () => {
      const depth = loadDepths[1]!

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

      expect(records).toEqual([{type: 'ready', value: second, status: 'ready'}])
      expect(editor.getSnapshot().context.value).toEqual(second)
    })

    test('Scenario: A second `load` in the same commit replaces the first at nested callout', async () => {
      const depth = loadDepths[2]!

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

      expect(records).toEqual([{type: 'ready', value: second, status: 'ready'}])
      expect(editor.getSnapshot().context.value).toEqual(second)
    })

    test('Scenario: A second `load` in the same commit replaces the first at table cell', async () => {
      const depth = loadDepths[3]!

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

      expect(records).toEqual([{type: 'ready', value: second, status: 'ready'}])
      expect(editor.getSnapshot().context.value).toEqual(second)
    })

    test('Scenario: `load` of undefined gives the placeholder block and no `change`', async () => {
      const value = undefined

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
    })

    test('Scenario: `load` of an empty array gives the placeholder block and no `change`', async () => {
      const value: [] = []

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
    })
  })
})

test('Scenario: StrictMode replay replaces the first load before ready', async () => {
  const keyGenerator = createTestKeyGenerator()
  const first = [textBlock(keyGenerator(), keyGenerator(), 'foo')]
  const replay = [textBlock(keyGenerator(), keyGenerator(), 'bar')]
  const records: Array<LoadRecord> = []
  const engineRef = React.createRef<PortableTextEditorEngine>()
  const editorRef = React.createRef<Editor>()
  let effects = 0
  function Loader() {
    const editor = useEditor()
    useEffect(() => {
      const subscription = editor.on('*', (event) => {
        if (event.type === 'ready') {
          records.push({
            type: 'ready',
            value: editor.getSnapshot().context.value,
            status: editor.getSnapshot().status,
          })
        } else if (event.type !== 'operation') {
          records.push({type: 'event', event})
        }
      })
      editor.send({type: 'load', value: effects++ === 0 ? first : replay})
      return () => subscription.unsubscribe()
    }, [editor])
    return null
  }
  const rendered = await render(
    <React.StrictMode>
      <EditorProvider initialConfig={{keyGenerator, schemaDefinition: {}}}>
        <EditorRefPlugin ref={editorRef} />
        <InternalEditorEngineRefPlugin ref={engineRef} />
        <PortableTextEditable />
        <Loader />
      </EditorProvider>
    </React.StrictMode>,
  )
  await expect.element(rendered.getByRole('textbox')).toHaveTextContent('bar')
  expect(records).toEqual([{type: 'ready', value: replay, status: 'ready'}])
  expect(editorRef.current?.getSnapshot().context.value).toEqual(replay)
  expect(engineRef.current?.history).toEqual({undos: [], redos: []})
  await rendered.rerender(
    <React.StrictMode>
      <EditorProvider initialConfig={{keyGenerator, schemaDefinition: {}}}>
        <EditorRefPlugin ref={editorRef} />
        <InternalEditorEngineRefPlugin ref={engineRef} />
        <PortableTextEditable />
        <Loader />
      </EditorProvider>
    </React.StrictMode>,
  )
  expect(() => editorRef.current?.send({type: 'load', value: first})).toThrow(
    '`load` is only valid while the editor is loading',
  )
})

test('Scenario: headless load accepts an edit after ready', async () => {
  const keyGenerator = createTestKeyGenerator()
  const value = [textBlock(keyGenerator(), keyGenerator(), 'foo')]
  const editorRef = React.createRef<Editor>()
  const loads = [value]
  const records: Array<LoadRecord> = []
  await render(
    <EditorProvider initialConfig={{keyGenerator, schemaDefinition: {}}}>
      <EditorRefPlugin ref={editorRef} />
      <LoadOnMount loads={loads} records={records} />
    </EditorProvider>,
  )
  const editor = editorRef.current!
  await vi.waitFor(() => expect(editor.getSnapshot().status).toEqual('ready'))

  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
    },
  })
  editor.send({type: 'insert.text', text: 'bar'})
  expect(editor.getSnapshot().context.value).toEqual([
    {
      _key: 'k0',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: 'k1', _type: 'span', text: 'barfoo', marks: []}],
    },
  ])
})

test('Scenario: mounted editable blocks an edit from ready before the first draw', async () => {
  const keyGenerator = createTestKeyGenerator()
  const value = Array.from({length: 400}, () =>
    textBlock(keyGenerator(), keyGenerator(), 'foo'),
  )
  const editorRef = React.createRef<Editor>()
  const loadedTextAtReady: Array<boolean> = []
  function Loader() {
    const editor = useEditor()
    useEffect(() => {
      const subscription = editor.on('ready', () => {
        loadedTextAtReady.push(
          document
            .querySelector('[role="textbox"]')
            ?.textContent?.includes('foo') ?? false,
        )

        editor.send({
          type: 'select',
          at: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
          },
        })
        editor.send({type: 'insert.text', text: 'bar'})
      })
      editor.send({type: 'load', value})
      return () => subscription.unsubscribe()
    }, [editor])
    return null
  }
  await render(
    <EditorProvider initialConfig={{keyGenerator, schemaDefinition: {}}}>
      <EditorRefPlugin ref={editorRef} />
      <PortableTextEditable />
      <Loader />
    </EditorProvider>,
  )
  await vi.waitFor(() =>
    expect(editorRef.current?.getSnapshot().status).toEqual('ready'),
  )
  expect(loadedTextAtReady).toEqual([false])
  expect(editorRef.current?.getSnapshot().context.value).toEqual(value)
})
