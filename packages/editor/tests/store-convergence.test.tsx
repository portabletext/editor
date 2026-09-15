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

test.fails('Scenario: Store converges after a stale echo resurrects the cleared value', async () => {
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
