import {applyAll, type Patch} from '@portabletext/patches'
import {isDeepEqual} from '../src/internal-utils/equality'
import {createTestKeyGenerator} from '@portabletext/test'
import React, {useEffect} from 'react'
import {subscribeToChanges} from '../src/engine/core/change'
import {expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {createTestEditor} from '../src/test/vitest'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {NodePlugin} from '../src/plugins/plugin.node'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'
import {EditorProvider} from '../src/editor/editor-provider'
import {PortableTextEditable} from '../src/editor/Editable'
import {useEngine} from '../src/engine/react/hooks/use-engine'
import {defineTextBlock} from '../src/renderers/renderer.types'
import type {Editor} from '../src/editor'
import {loadSchemaDefinition, loadContainers} from './discovery-schema'

test('Scenario: discovery keyless span root', async () => {
  const keyGenerator = createTestKeyGenerator()
  const block = {
    _type: 'block',
    _key: keyGenerator(),
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', text: 'foo', marks: []}],
  }
  const value = [block]
  const prefix = []
  const patches: Patch[] = []
  const changes: unknown[] = []
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    initialValue: value,
    schemaDefinition: loadSchemaDefinition,
    children: (
      <>
        <NodePlugin nodes={loadContainers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') patches.push(event.patch)
            if (event.type === 'change') changes.push(event)
          }}
        />
      </>
    ),
  })
  await expect.element(locator.getByText('foo')).toBeVisible()
  const before = structuredClone(patches)
  const current = editor.getSnapshot().context.value as any
  const spanKey = current[0].children[0]._key
  const path = [...prefix, {_key: block._key}, 'children', {_key: spanKey}]
  editor.send({
    type: 'select',
    at: {anchor: {path, offset: 3}, focus: {path, offset: 3}},
  })
  editor.send({type: 'insert.text', text: 'y'})
  await vi.waitFor(() =>
    expect(
      (editor.getSnapshot().context.value as any)[0].children[0].text,
    ).toEqual('fooy'),
  )
  await vi.waitFor(() =>
    expect(patches.some((patch) => patch.type === 'diffMatchPatch')).toEqual(
      true,
    ),
  )
  const host = applyAll(value, patches)
  console.log(
    'DISCOVERY_ROW ' +
      JSON.stringify({
        name: 'root',
        start: value,
        spanKey,
        before,
        patches,
        changes,
        host,
        editor: editor.getSnapshot().context.value,
        equal: isDeepEqual(host, editor.getSnapshot().context.value),
      }),
  )
  expect(host).toEqual(editor.getSnapshot().context.value)
})

test('Scenario: discovery keyless span callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const block = {
    _type: 'block',
    _key: keyGenerator(),
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', text: 'foo', marks: []}],
  }
  const value = [{_type: 'callout', _key: keyGenerator(), content: [block]}]
  const prefix = [{_key: value[0]._key}, 'content']
  const patches: Patch[] = []
  const changes: unknown[] = []
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    initialValue: value,
    schemaDefinition: loadSchemaDefinition,
    children: (
      <>
        <NodePlugin nodes={loadContainers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') patches.push(event.patch)
            if (event.type === 'change') changes.push(event)
          }}
        />
      </>
    ),
  })
  await expect.element(locator.getByText('foo')).toBeVisible()
  const before = structuredClone(patches)
  const current = editor.getSnapshot().context.value as any
  const spanKey = current[0].content[0].children[0]._key
  const path = [...prefix, {_key: block._key}, 'children', {_key: spanKey}]
  editor.send({
    type: 'select',
    at: {anchor: {path, offset: 3}, focus: {path, offset: 3}},
  })
  editor.send({type: 'insert.text', text: 'y'})
  await vi.waitFor(() =>
    expect(
      (editor.getSnapshot().context.value as any)[0].content[0].children[0]
        .text,
    ).toEqual('fooy'),
  )
  await vi.waitFor(() =>
    expect(patches.some((patch) => patch.type === 'diffMatchPatch')).toEqual(
      true,
    ),
  )
  const host = applyAll(value, patches)
  console.log(
    'DISCOVERY_ROW ' +
      JSON.stringify({
        name: 'callout',
        start: value,
        spanKey,
        before,
        patches,
        changes,
        host,
        editor: editor.getSnapshot().context.value,
        equal: isDeepEqual(host, editor.getSnapshot().context.value),
      }),
  )
  expect(host).toEqual(editor.getSnapshot().context.value)
})

test('Scenario: discovery keyless span nested callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const block = {
    _type: 'block',
    _key: keyGenerator(),
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', text: 'foo', marks: []}],
  }
  const value = [
    {
      _type: 'callout',
      _key: keyGenerator(),
      content: [{_type: 'callout', _key: keyGenerator(), content: [block]}],
    },
  ]
  const prefix = [
    {_key: value[0]._key},
    'content',
    {_key: value[0].content[0]._key},
    'content',
  ]
  const patches: Patch[] = []
  const changes: unknown[] = []
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    initialValue: value,
    schemaDefinition: loadSchemaDefinition,
    children: (
      <>
        <NodePlugin nodes={loadContainers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') patches.push(event.patch)
            if (event.type === 'change') changes.push(event)
          }}
        />
      </>
    ),
  })
  await expect.element(locator.getByText('foo')).toBeVisible()
  const before = structuredClone(patches)
  const current = editor.getSnapshot().context.value as any
  const spanKey = current[0].content[0].content[0].children[0]._key
  const path = [...prefix, {_key: block._key}, 'children', {_key: spanKey}]
  editor.send({
    type: 'select',
    at: {anchor: {path, offset: 3}, focus: {path, offset: 3}},
  })
  editor.send({type: 'insert.text', text: 'y'})
  await vi.waitFor(() =>
    expect(
      (editor.getSnapshot().context.value as any)[0].content[0].content[0]
        .children[0].text,
    ).toEqual('fooy'),
  )
  await vi.waitFor(() =>
    expect(patches.some((patch) => patch.type === 'diffMatchPatch')).toEqual(
      true,
    ),
  )
  const host = applyAll(value, patches)
  console.log(
    'DISCOVERY_ROW ' +
      JSON.stringify({
        name: 'nested callout',
        start: value,
        spanKey,
        before,
        patches,
        changes,
        host,
        editor: editor.getSnapshot().context.value,
        equal: isDeepEqual(host, editor.getSnapshot().context.value),
      }),
  )
  expect(host).toEqual(editor.getSnapshot().context.value)
})

test('Scenario: discovery keyless span table cell', async () => {
  const keyGenerator = createTestKeyGenerator()
  const block = {
    _type: 'block',
    _key: keyGenerator(),
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', text: 'foo', marks: []}],
  }
  const value = [
    {
      _type: 'table',
      _key: keyGenerator(),
      rows: [
        {
          _type: 'row',
          _key: keyGenerator(),
          cells: [{_type: 'cell', _key: keyGenerator(), content: [block]}],
        },
      ],
    },
  ]
  const prefix = [
    {_key: value[0]._key},
    'rows',
    {_key: value[0].rows[0]._key},
    'cells',
    {_key: value[0].rows[0].cells[0]._key},
    'content',
  ]
  const patches: Patch[] = []
  const changes: unknown[] = []
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    initialValue: value,
    schemaDefinition: loadSchemaDefinition,
    children: (
      <>
        <NodePlugin nodes={loadContainers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') patches.push(event.patch)
            if (event.type === 'change') changes.push(event)
          }}
        />
      </>
    ),
  })
  await expect.element(locator.getByText('foo')).toBeVisible()
  const before = structuredClone(patches)
  const current = editor.getSnapshot().context.value as any
  const spanKey = current[0].rows[0].cells[0].content[0].children[0]._key
  const path = [...prefix, {_key: block._key}, 'children', {_key: spanKey}]
  editor.send({
    type: 'select',
    at: {anchor: {path, offset: 3}, focus: {path, offset: 3}},
  })
  editor.send({type: 'insert.text', text: 'y'})
  await vi.waitFor(() =>
    expect(
      (editor.getSnapshot().context.value as any)[0].rows[0].cells[0].content[0]
        .children[0].text,
    ).toEqual('fooy'),
  )
  await vi.waitFor(() =>
    expect(patches.some((patch) => patch.type === 'diffMatchPatch')).toEqual(
      true,
    ),
  )
  const host = applyAll(value, patches)
  console.log(
    'DISCOVERY_ROW ' +
      JSON.stringify({
        name: 'table cell',
        start: value,
        spanKey,
        before,
        patches,
        changes,
        host,
        editor: editor.getSnapshot().context.value,
        equal: isDeepEqual(host, editor.getSnapshot().context.value),
      }),
  )
  expect(host).toEqual(editor.getSnapshot().context.value)
})

test('Scenario: discovery keyless span object field', async () => {
  const keyGenerator = createTestKeyGenerator()
  const block = {
    _type: 'block',
    _key: keyGenerator(),
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', text: 'foo', marks: []}],
  }
  const value = [{_type: 'note', _key: keyGenerator(), body: [block]}]
  const prefix = [{_key: value[0]._key}, 'body']
  const patches: Patch[] = []
  const changes: unknown[] = []
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    initialValue: value,
    schemaDefinition: loadSchemaDefinition,
    children: (
      <>
        <NodePlugin nodes={loadContainers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') patches.push(event.patch)
            if (event.type === 'change') changes.push(event)
          }}
        />
      </>
    ),
  })
  await expect.element(locator.getByText('foo')).toBeVisible()
  const before = structuredClone(patches)
  const current = editor.getSnapshot().context.value as any
  const spanKey = current[0].body[0].children[0]._key
  const path = [...prefix, {_key: block._key}, 'children', {_key: spanKey}]
  editor.send({
    type: 'select',
    at: {anchor: {path, offset: 3}, focus: {path, offset: 3}},
  })
  editor.send({type: 'insert.text', text: 'y'})
  await vi.waitFor(() =>
    expect(
      (editor.getSnapshot().context.value as any)[0].body[0].children[0].text,
    ).toEqual('fooy'),
  )
  await vi.waitFor(() =>
    expect(patches.some((patch) => patch.type === 'diffMatchPatch')).toEqual(
      true,
    ),
  )
  const host = applyAll(value, patches)
  console.log(
    'DISCOVERY_ROW ' +
      JSON.stringify({
        name: 'object field',
        start: value,
        spanKey,
        before,
        patches,
        changes,
        host,
        editor: editor.getSnapshot().context.value,
        equal: isDeepEqual(host, editor.getSnapshot().context.value),
      }),
  )
  expect(host).toEqual(editor.getSnapshot().context.value)
})

test('Scenario: discovery StrictMode initialValue and registered placeholder', async () => {
  const keyGenerator = createTestKeyGenerator()
  const value = [
    {
      _type: 'block',
      _key: keyGenerator(),
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keyGenerator(), text: 'foo', marks: []}],
    },
  ]
  const editorRef = React.createRef<Editor>()
  const events: any[] = []
  const renders: any[] = []
  let engine: any
  const committedCauses: unknown[] = []
  let effectSetups = 0
  let effectCleanups = 0
  function Capture() {
    engine = useEngine()
    useEffect(() => {
      effectSetups++
      const unsubscribe = subscribeToChanges(engine, (change) =>
        committedCauses.push(change.cause),
      )
      return () => {
        effectCleanups++
        unsubscribe()
      }
    }, [])
    return null
  }
  const node = defineTextBlock({
    type: 'block',
    render: (props) => {
      renders.push(structuredClone(props.node))
      return props.renderDefault(props)
    },
  })
  const result = await render(
    <React.StrictMode>
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: loadSchemaDefinition,
          initialValue: value,
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <Capture />
        <PortableTextEditable />
        <NodePlugin nodes={[node]} />
        <EventListenerPlugin
          on={(event) => {
            events.push(event)
          }}
        />
      </EditorProvider>
    </React.StrictMode>,
  )
  await expect
    .element(result.getByRole('textbox').getByText('foo'))
    .toBeVisible()
  await vi.waitFor(() =>
    expect(events.some((event) => event.type === 'ready')).toEqual(true),
  )
  console.log(
    'DISCOVERY_STRICT ' +
      JSON.stringify({
        events,
        renders,
        committedCauses,
        effectSetups,
        effectCleanups,
        history: engine.history,
        value: editorRef.current!.getSnapshot().context.value,
      }),
  )
  expect(engine.history).toEqual({undos: [], redos: []})
})

test('Scenario: discovery registered placeholder without StrictMode', async () => {
  const keyGenerator = createTestKeyGenerator()
  const value = [
    {
      _type: 'block',
      _key: keyGenerator(),
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: keyGenerator(), text: 'foo', marks: []}],
    },
  ]
  const renders: any[] = []
  const node = defineTextBlock({
    type: 'block',
    render: (props) => {
      renders.push(structuredClone(props.node))
      return props.renderDefault(props)
    },
  })
  const {locator} = await createTestEditor({
    keyGenerator,
    initialValue: value,
    children: <NodePlugin nodes={[node]} />,
  })
  await expect.element(locator.getByText('foo')).toBeVisible()
  console.log('DISCOVERY_PLACEHOLDER ' + JSON.stringify({renders}))
})

test('Scenario: discovery keyless span read-only then unlock', async () => {
  const keyGenerator = createTestKeyGenerator()
  const value = [
    {
      _type: 'block',
      _key: keyGenerator(),
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', text: 'foo', marks: []}],
    },
  ]
  const editorRef = React.createRef<Editor>()
  const patches: Patch[] = []
  const changes: unknown[] = []
  const result = await render(
    <EditorProvider
      initialConfig={{
        keyGenerator,
        schemaDefinition: loadSchemaDefinition,
        initialValue: value,
        readOnly: true,
      }}
    >
      <EditorRefPlugin ref={editorRef} />
      <PortableTextEditable />
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'patch') patches.push(event.patch)
          if (event.type === 'change') changes.push(event)
        }}
      />
    </EditorProvider>,
  )
  await expect.element(result.getByText('foo')).toBeVisible()
  const editor = editorRef.current!
  const before = structuredClone(patches)
  const spanKey = (editor.getSnapshot().context.value[0] as any).children[0]
    ._key
  editor.send({type: 'update readOnly', readOnly: false})
  const path = [{_key: value[0]._key}, 'children', {_key: spanKey}]
  editor.send({
    type: 'select',
    at: {anchor: {path, offset: 3}, focus: {path, offset: 3}},
  })
  editor.send({type: 'insert.text', text: 'y'})
  await vi.waitFor(() =>
    expect(patches.some((patch) => patch.type === 'diffMatchPatch')).toEqual(
      true,
    ),
  )
  const host = applyAll(value, patches)
  console.log(
    'DISCOVERY_ROW ' +
      JSON.stringify({
        name: 'read-only root then unlock',
        start: value,
        spanKey,
        before,
        patches,
        changes,
        host,
        editor: editor.getSnapshot().context.value,
        equal: isDeepEqual(host, editor.getSnapshot().context.value),
      }),
  )
  expect(host).toEqual(editor.getSnapshot().context.value)
})

test('Scenario: discovery non-object correction operations on initialValue', async () => {
  const keyGenerator = createTestKeyGenerator()
  const value = [
    null,
    {
      _type: 'block',
      _key: keyGenerator(),
      style: 'normal',
      markDefs: [null],
      children: [
        null,
        {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []},
      ],
    },
  ]
  const changes: any[] = []
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    initialValue: value as never,
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change') changes.push(event)
        }}
      />
    ),
  })
  await expect.element(locator.getByText('foo')).toBeVisible()
  const patches = changes.flatMap((change) =>
    change.origin === 'local' ? change.patches : [],
  )
  console.log(
    'DISCOVERY_REPAIR ' +
      JSON.stringify({
        start: value,
        changes,
        patches,
        host: applyAll(value, patches),
        editor: editor.getSnapshot().context.value,
      }),
  )
  expect(applyAll(value, patches)).toEqual(editor.getSnapshot().context.value)
})
