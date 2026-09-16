import {applyAll, type Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema} from '../src'
import {createTestEditor} from '../src/test/vitest'

test('Scenario: Store converges through a clear and retype under a value-mirroring host', async () => {
  const {editor, locator} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition: defineSchema({}),
  })

  const store = createStore(undefined)
  editor.on('mutation', (event) => {
    store.apply(event.patches)
    editor.send({type: 'update value', value: store.value})
  })

  await userEvent.click(locator)
  await userEvent.type(locator, 'foo')

  await vi.waitFor(() => {
    expect(store.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
    },
  })
  await userEvent.keyboard('{Backspace}')

  await vi.waitFor(() => {
    expect(store.value).toEqual(undefined)
  })

  await userEvent.type(locator, 'bar')

  await vi.waitFor(() => {
    expect(store.value).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
    ])
  })
  expect(editor.getSnapshot().context.value).toEqual(store.value)
})

test('Scenario: Store converges after a stale echo resurrects the cleared value', async () => {
  const initialValue = [
    {
      _type: 'block',
      _key: 'b0',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
    },
  ]
  const {editor, locator} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition: defineSchema({}),
    initialValue,
  })

  const store = createStore(initialValue)
  editor.on('mutation', (event) => {
    store.apply(event.patches)
    editor.send({type: 'update value', value: store.value})
  })

  await userEvent.click(locator)
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
      focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 3},
    },
  })
  await userEvent.keyboard('{Backspace}')

  await vi.waitFor(() => {
    expect(store.value).toEqual(undefined)
  })

  // A lagging snapshot of the pre-clear document arrives after the clear's
  // own echo: a listener reconnect refetch or a rebase against a base that
  // predates the clear delivers it through the host's `value` prop.
  editor.send({type: 'update value', value: initialValue})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual(initialValue)
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 3},
      focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 3},
    },
  })
  await userEvent.keyboard('!')

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's0', text: 'foo!', marks: []}],
      },
    ])
  })

  await vi.waitFor(() => {
    expect(store.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's0', text: 'foo!', marks: []}],
      },
    ])
  })
})

test.fails('Scenario: Store converges when a clear is held through a read-only window that restores the value', async () => {
  const initialValue = [
    {
      _type: 'block',
      _key: 'b0',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
    },
  ]
  const {editor, locator} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition: defineSchema({}),
    initialValue,
  })

  const store = createStore(initialValue)
  editor.on('mutation', (event) => {
    store.apply(event.patches)
    editor.send({type: 'update value', value: store.value})
  })

  await userEvent.click(locator)
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
      focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 3},
    },
  })
  await userEvent.keyboard('{Backspace}')

  // The read-only flip lands before the mutation batcher's typing debounce
  // flushes the clear, so the `unset([])` is generated but held.
  editor.send({type: 'update readOnly', readOnly: true})

  // While the editor is read-only, the host restores the field through the
  // `value` prop. The restored snapshot carries a collaborator's edit
  // (`food`): the sync machine skips a value it considers already synced,
  // so an exact copy of the mount value would never reach the editor.
  const restoredValue = [
    {
      _type: 'block',
      _key: 'b0',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 's0', text: 'food', marks: []}],
    },
  ]
  editor.send({type: 'update value', value: restoredValue})

  editor.send({type: 'update readOnly', readOnly: false})

  await vi.waitFor(
    () => {
      expect(editor.getSnapshot().context.value).toEqual(restoredValue)
    },
    {timeout: 5_000},
  )

  await vi.waitFor(
    () => {
      expect(store.value).toEqual(restoredValue)
    },
    {timeout: 5_000},
  )
})

test('Scenario: Store converges when a host swallows a keyed block delete and echoes a root `unset`', async () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition: defineSchema({}),
  })

  const store = createStore(undefined)
  let hostSwallowsNextMutation = false
  editor.on('mutation', (event) => {
    if (hostSwallowsNextMutation) {
      hostSwallowsNextMutation = false
      store.set(undefined)
      editor.send({
        type: 'patches',
        patches: [{type: 'unset', path: [], origin: 'local'}],
        snapshot: undefined,
      })
      return
    }
    store.apply(event.patches)
  })

  await userEvent.click(locator)
  await userEvent.type(locator, 'foo{Enter}bar{Enter}baz')

  await vi.waitFor(() => {
    expect(store.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
      },
    ])
  })

  hostSwallowsNextMutation = true
  editor.send({type: 'delete.block', at: [{_key: 'k2'}]})

  await vi.waitFor(() => {
    expect(store.value).toEqual(undefined)
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
      },
    ])
  })

  expect(warnSpy).toHaveBeenCalledTimes(1)

  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 3},
      focus: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 3},
    },
  })
  await userEvent.type(locator, '!')

  await vi.waitFor(() => {
    expect(store.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'baz!', marks: []}],
      },
    ])
  })
  expect(editor.getSnapshot().context.value).toEqual(store.value)
  expect(warnSpy).toHaveBeenCalledTimes(1)

  warnSpy.mockRestore()
})

test('Scenario: Store stays untouched by a remote root `unset` while idle', async () => {
  const {editor, locator} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition: defineSchema({}),
  })

  const mutations: Array<Array<Patch>> = []
  editor.on('mutation', (event) => {
    mutations.push(event.patches)
  })

  await userEvent.click(locator)
  await userEvent.type(locator, 'foo')

  await vi.waitFor(() => {
    expect(mutations.length).toEqual(1)
  })

  editor.send({
    type: 'patches',
    patches: [{type: 'unset', path: [], origin: 'remote'}],
    snapshot: undefined,
  })
  editor.send({type: 'update value', value: undefined})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
      },
    ])
  })

  expect(mutations.length).toEqual(1)
})

test('Scenario: Store converges to what the user types after a remote clear', async () => {
  const {editor, locator} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition: defineSchema({}),
  })

  const store = createStore(undefined)
  editor.on('mutation', (event) => {
    store.apply(event.patches)
  })

  await userEvent.click(locator)
  await userEvent.type(locator, 'foo')

  await vi.waitFor(() => {
    expect(store.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
  })

  store.apply([{type: 'unset', path: [], origin: 'remote'}])
  editor.send({
    type: 'patches',
    patches: [{type: 'unset', path: [], origin: 'remote'}],
    snapshot: undefined,
  })
  editor.send({type: 'update value', value: undefined})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
      },
    ])
  })

  await userEvent.type(locator, 'bar')

  await vi.waitFor(() => {
    expect(store.value).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
    ])
  })
  expect(editor.getSnapshot().context.value).toEqual(store.value)
})

test('Scenario: A stale empty `update value` with no patches event leaves typed content in place', async () => {
  const {editor, locator} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition: defineSchema({}),
  })

  const store = createStore(undefined)
  const mutations: Array<Array<Patch>> = []
  editor.on('mutation', (event) => {
    mutations.push(event.patches)
    store.apply(event.patches)
  })

  await userEvent.click(locator)
  await userEvent.type(locator, 'foo')

  await vi.waitFor(() => {
    expect(store.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
  })

  editor.send({type: 'update value', value: []})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
  })

  const mutationsBeforeRetype = mutations.length
  await userEvent.type(locator, 'x')

  await vi.waitFor(() => {
    expect(mutations.length).toEqual(mutationsBeforeRetype + 1)
  })

  expect(mutations[mutationsBeforeRetype]).toEqual([
    {
      type: 'diffMatchPatch',
      path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
      value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
      origin: 'local',
    },
  ])
  expect(editor.getSnapshot().context.value).toEqual(store.value)
})

test('Scenario: An echoed rebuild `setIfMissing` disarms the unset flag before the next edit', async () => {
  const {editor, locator} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition: defineSchema({}),
  })

  const store = createStore(undefined)
  let hostSwallowsNextMutation = false
  const mutations: Array<Array<Patch>> = []
  editor.on('mutation', (event) => {
    mutations.push(event.patches)
    if (hostSwallowsNextMutation) {
      hostSwallowsNextMutation = false
      store.set(undefined)
      editor.send({
        type: 'patches',
        patches: [
          {type: 'unset', path: [], origin: 'local'},
          {type: 'setIfMissing', path: [], value: [], origin: 'local'},
        ],
        snapshot: [],
      })
      return
    }
    store.apply(event.patches)
  })

  await userEvent.click(locator)
  await userEvent.type(locator, 'foo{Enter}bar')

  await vi.waitFor(() => {
    expect(store.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
    ])
  })

  hostSwallowsNextMutation = true
  editor.send({type: 'delete.block', at: [{_key: 'k0'}]})

  await vi.waitFor(() => {
    expect(store.value).toEqual(undefined)
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
    ])
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 0},
      focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 0},
    },
  })

  const mutationsBeforeRetype = mutations.length
  await userEvent.type(locator, 'x')

  await vi.waitFor(() => {
    expect(mutations.length).toEqual(mutationsBeforeRetype + 1)
  })

  expect(mutations[mutationsBeforeRetype]).toEqual([
    {
      type: 'diffMatchPatch',
      path: [{_key: 'k2'}, 'children', {_key: 'k3'}, 'text'],
      value: '@@ -1,3 +1,4 @@\n+x\n bar\n',
      origin: 'local',
    },
  ])
})

test("Scenario: The editor's own root `unset` echoing back after the rebuild does not re-arm", async () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition: defineSchema({}),
  })

  const store = createStore(undefined)
  const mutations: Array<Array<Patch>> = []
  editor.on('mutation', (event) => {
    mutations.push(event.patches)
    store.apply(event.patches)
  })

  await userEvent.click(locator)
  await userEvent.type(locator, 'foo')

  await vi.waitFor(() => {
    expect(store.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
    },
  })
  await userEvent.keyboard('{Backspace}')

  await vi.waitFor(() => {
    expect(store.value).toEqual(undefined)
  })

  await userEvent.type(locator, 'bar')

  await vi.waitFor(() => {
    expect(store.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
      },
    ])
  })

  editor.send({
    type: 'patches',
    patches: [{type: 'unset', path: [], origin: 'local'}],
    snapshot: undefined,
  })

  expect(warnSpy).not.toHaveBeenCalled()

  const mutationsBeforeRetype = mutations.length
  await userEvent.type(locator, '!')

  await vi.waitFor(() => {
    expect(mutations.length).toEqual(mutationsBeforeRetype + 1)
  })

  expect(mutations[mutationsBeforeRetype]).toEqual([
    {
      type: 'diffMatchPatch',
      path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
      value: '@@ -1,3 +1,4 @@\n bar\n+!\n',
      origin: 'local',
    },
  ])

  await vi.waitFor(() => {
    expect(store.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'bar!', marks: []}],
      },
    ])
  })
  expect(editor.getSnapshot().context.value).toEqual(store.value)

  warnSpy.mockRestore()
})

test('Scenario: A host echoing a legitimate clear as `[setIfMissing, unset]` does not warn or duplicate the rebuild', async () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition: defineSchema({}),
  })

  const store = createStore(undefined)
  const mutations: Array<Array<Patch>> = []
  editor.on('mutation', (event) => {
    mutations.push(event.patches)
    store.apply(event.patches)
  })

  await userEvent.click(locator)
  await userEvent.type(locator, 'foo')

  await vi.waitFor(() => {
    expect(store.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
    },
  })
  await userEvent.keyboard('{Backspace}')

  await vi.waitFor(() => {
    expect(store.value).toEqual(undefined)
  })

  editor.send({
    type: 'patches',
    patches: [
      {type: 'setIfMissing', path: [], value: [], origin: 'local'},
      {type: 'unset', path: [], origin: 'local'},
    ],
    snapshot: undefined,
  })

  expect(warnSpy).not.toHaveBeenCalled()

  const mutationsBeforeRetype = mutations.length
  await userEvent.type(locator, 'x')

  await vi.waitFor(() => {
    expect(mutations.length).toEqual(mutationsBeforeRetype + 1)
  })

  expect(mutations[mutationsBeforeRetype]).toEqual([
    {type: 'setIfMissing', path: [], value: [], origin: 'local'},
    {
      type: 'insert',
      path: [0],
      position: 'before',
      items: [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
        },
      ],
      origin: 'local',
    },
    {
      type: 'diffMatchPatch',
      path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
      value: '@@ -0,0 +1 @@\n+x\n',
      origin: 'local',
    },
  ])

  warnSpy.mockRestore()
})

test('Scenario: A host-synthesized `[setIfMissing, unset]` echo with no self-emission credit still arms', async () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition: defineSchema({}),
  })

  const store = createStore(undefined)
  let hostSwallowsNextMutation = false
  const mutations: Array<Array<Patch>> = []
  editor.on('mutation', (event) => {
    mutations.push(event.patches)
    if (hostSwallowsNextMutation) {
      hostSwallowsNextMutation = false
      store.set(undefined)
      editor.send({
        type: 'patches',
        patches: [
          {type: 'setIfMissing', path: [], value: [], origin: 'local'},
          {type: 'unset', path: [], origin: 'local'},
        ],
        snapshot: undefined,
      })
      return
    }
    store.apply(event.patches)
  })

  await userEvent.click(locator)
  await userEvent.type(locator, 'foo{Enter}bar')

  await vi.waitFor(() => {
    expect(store.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
    ])
  })

  hostSwallowsNextMutation = true
  editor.send({type: 'delete.block', at: [{_key: 'k2'}]})

  await vi.waitFor(() => {
    expect(store.value).toEqual(undefined)
  })

  expect(warnSpy).toHaveBeenCalledTimes(1)

  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
    },
  })

  const mutationsBeforeRetype = mutations.length
  await userEvent.type(locator, '!')

  await vi.waitFor(() => {
    expect(mutations.length).toEqual(mutationsBeforeRetype + 1)
  })

  expect(mutations[mutationsBeforeRetype]).toEqual([
    {type: 'setIfMissing', path: [], value: [], origin: 'local'},
    {
      type: 'insert',
      path: [0],
      position: 'before',
      items: [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
        },
      ],
      origin: 'local',
    },
    {
      type: 'diffMatchPatch',
      path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
      value: '@@ -1,3 +1,4 @@\n foo\n+!\n',
      origin: 'local',
    },
  ])

  warnSpy.mockRestore()
})

/**
 * A store applying the editor's emitted mutations with the semantics the
 * incident path relies on: a patch it cannot apply (a deep patch into a
 * destroyed field, a missing `_key`) is dropped silently instead of
 * aborting, like Gradient's zero-match JSONPath handling and Studio's form
 * store.
 */
function createStore(initialValue: Array<PortableTextBlock> | undefined) {
  let value: Array<PortableTextBlock> | undefined = initialValue

  return {
    get value() {
      return value
    },
    set(newValue: Array<PortableTextBlock> | undefined) {
      value = newValue
    },
    apply(patches: Array<Patch>) {
      for (const patch of patches) {
        try {
          value = applyAll(value, [patch])
        } catch {
          // Silent no-op, matching the store semantics described above.
        }
      }
    },
  }
}
