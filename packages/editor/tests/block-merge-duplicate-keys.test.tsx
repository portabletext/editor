import type {Patch} from '@portabletext/patches'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {EventListenerPlugin} from '../src/plugins'
import {createTestEditor} from '../src/test/vitest'

function duplicateKeyedChildren() {
  return [
    {_type: 'span', _key: 's1', text: 'foo ', marks: []},
    {_type: 'span', _key: 's2', text: 'bar', marks: ['strong']},
    {_type: 'span', _key: 's3', text: ' baz', marks: []},
  ]
}

function duplicateKeyedInitialValue(): Array<PortableTextBlock> {
  return [
    {
      _type: 'block',
      _key: 'kA',
      children: duplicateKeyedChildren(),
      markDefs: [],
      style: 'normal',
    },
    {
      _type: 'block',
      _key: 'kB',
      children: duplicateKeyedChildren(),
      markDefs: [],
      style: 'normal',
    },
  ]
}

function duplicateKeyedChildrenWithLink(linkMarkDefKey: string) {
  return [
    {_type: 'span', _key: 's1', text: 'foo ', marks: []},
    {_type: 'span', _key: 's2', text: 'bar', marks: ['strong', linkMarkDefKey]},
    {_type: 'span', _key: 's3', text: ' baz', marks: []},
  ]
}

function duplicateKeyedInitialValueWithLink(): Array<PortableTextBlock> {
  return [
    {
      _type: 'block',
      _key: 'kA',
      children: duplicateKeyedChildrenWithLink('link1'),
      markDefs: [{_type: 'link', _key: 'link1', href: 'https://a.example'}],
      style: 'normal',
    },
    {
      _type: 'block',
      _key: 'kB',
      children: duplicateKeyedChildrenWithLink('link1'),
      markDefs: [{_type: 'link', _key: 'link1', href: 'https://b.example'}],
      style: 'normal',
    },
  ]
}

const duplicateKeyMergeSchema = defineSchema({decorators: [{name: 'strong'}]})

/**
 * Backspace-merge `kB` into `kA` in a fresh editor over
 * `duplicateKeyedInitialValue`, capturing every patch it emits.
 */
async function mergeDuplicateKeyedBlocks() {
  const patches: Array<Patch> = []

  const {editor, locator} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition: duplicateKeyMergeSchema,
    initialValue: duplicateKeyedInitialValue(),
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'patch') {
            patches.push(event.patch)
          }
        }}
      />
    ),
  })

  await userEvent.click(locator)

  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'kB'}, 'children', {_key: 's1'}], offset: 0},
      focus: {path: [{_key: 'kB'}, 'children', {_key: 's1'}], offset: 0},
    },
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {path: [{_key: 'kB'}, 'children', {_key: 's1'}], offset: 0},
      focus: {path: [{_key: 'kB'}, 'children', {_key: 's1'}], offset: 0},
      backward: false,
    })
  })

  editor.send({type: 'delete.backward', unit: 'character'})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value.length).toBe(1)
  })

  return {editor, patches}
}

describe('Feature: block merge renames colliding keys', () => {
  test('Scenario: backspace-merging blocks whose children share keys renames instead of re-minting', async () => {
    const {editor, patches} = await mergeDuplicateKeyedBlocks()

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'kA',
          children: [
            {_type: 'span', _key: 's1', text: 'foo ', marks: []},
            {_type: 'span', _key: 's2', text: 'bar', marks: ['strong']},
            {_type: 'span', _key: 's3', text: ' bazfoo ', marks: []},
            {_type: 'span', _key: 'k3', text: 'bar', marks: ['strong']},
            {_type: 'span', _key: 'k4', text: ' baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    // The three colliding children get renamed with keyed `set` patches on
    // `_key` before the merging block is unset, so a receiver applying the
    // patches in order never sees a duplicate key and can follow each
    // renamed child by its new key instead of losing it to a destroy/create.
    const keySetPatches = patches.filter(
      (patch) => patch.type === 'set' && patch.path.at(-1) === '_key',
    )
    const unsetKbIndex = patches.findIndex(
      (patch) =>
        patch.type === 'unset' &&
        patch.path.length === 1 &&
        typeof patch.path[0] === 'object' &&
        patch.path[0] !== null &&
        '_key' in patch.path[0] &&
        patch.path[0]._key === 'kB',
    )

    expect(keySetPatches).toEqual([
      {
        type: 'set',
        path: [{_key: 'kB'}, 'children', {_key: 's1'}, '_key'],
        value: 'k2',
        origin: 'local',
      },
      {
        type: 'set',
        path: [{_key: 'kB'}, 'children', {_key: 's2'}, '_key'],
        value: 'k3',
        origin: 'local',
      },
      {
        type: 'set',
        path: [{_key: 'kB'}, 'children', {_key: 's3'}, '_key'],
        value: 'k4',
        origin: 'local',
      },
    ])
    expect(unsetKbIndex).toBeGreaterThan(-1)
    for (const keySetPatch of keySetPatches) {
      expect(patches.indexOf(keySetPatch)).toBeLessThan(unsetKbIndex)
    }

    // Every child inserted back under `kA` carries a renamed key: none of
    // the merging block's original `s1`/`s2`/`s3` keys reach the insert, so
    // nothing collides with `kA`'s own children of the same name.
    const insertedKeys = patches.flatMap((patch) =>
      patch.type === 'insert'
        ? patch.items.flatMap((item) =>
            typeof item === 'object' && item !== null && '_key' in item
              ? [item['_key']]
              : [],
          )
        : [],
    )
    expect(insertedKeys).toEqual(['k5', 'k2', 'k3', 'k4'])
  })

  test('Scenario: forward-deleting at block end renames colliding keys the same way', async () => {
    const patches: Array<Patch> = []

    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: duplicateKeyMergeSchema,
      initialValue: duplicateKeyedInitialValue(),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'kA'}, 'children', {_key: 's3'}], offset: 4},
        focus: {path: [{_key: 'kA'}, 'children', {_key: 's3'}], offset: 4},
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: 'kA'}, 'children', {_key: 's3'}], offset: 4},
        focus: {path: [{_key: 'kA'}, 'children', {_key: 's3'}], offset: 4},
        backward: false,
      })
    })

    editor.send({type: 'delete.forward', unit: 'character'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value.length).toBe(1)
    })

    const keySetPatches = patches.filter(
      (patch) => patch.type === 'set' && patch.path.at(-1) === '_key',
    )
    const unsetKbIndex = patches.findIndex(
      (patch) =>
        patch.type === 'unset' &&
        patch.path.length === 1 &&
        typeof patch.path[0] === 'object' &&
        patch.path[0] !== null &&
        '_key' in patch.path[0] &&
        patch.path[0]._key === 'kB',
    )

    expect(keySetPatches).toEqual([
      {
        type: 'set',
        path: [{_key: 'kB'}, 'children', {_key: 's1'}, '_key'],
        value: 'k2',
        origin: 'local',
      },
      {
        type: 'set',
        path: [{_key: 'kB'}, 'children', {_key: 's2'}, '_key'],
        value: 'k3',
        origin: 'local',
      },
      {
        type: 'set',
        path: [{_key: 'kB'}, 'children', {_key: 's3'}, '_key'],
        value: 'k4',
        origin: 'local',
      },
    ])
    expect(patches.indexOf(keySetPatches[2] as Patch)).toBeLessThan(
      unsetKbIndex,
    )

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'kA',
          children: [
            {_type: 'span', _key: 's1', text: 'foo ', marks: []},
            {_type: 'span', _key: 's2', text: 'bar', marks: ['strong']},
            {_type: 'span', _key: 's3', text: ' bazfoo ', marks: []},
            {_type: 'span', _key: 'k3', text: 'bar', marks: ['strong']},
            {_type: 'span', _key: 'k4', text: ' baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: a colliding markDef is renamed and every mark referencing it is rewritten before the merge', async () => {
    const schemaDefinition = defineSchema({
      decorators: [{name: 'strong'}],
      annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
    })

    const patches: Array<Patch> = []

    const {editor: editor1, locator: locator1} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: duplicateKeyedInitialValueWithLink(),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
    })

    await userEvent.click(locator1)

    editor1.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'kB'}, 'children', {_key: 's1'}], offset: 0},
        focus: {path: [{_key: 'kB'}, 'children', {_key: 's1'}], offset: 0},
      },
    })

    await vi.waitFor(() => {
      expect(editor1.getSnapshot().context.selection).not.toBeNull()
    })

    editor1.send({type: 'delete.backward', unit: 'character'})

    await vi.waitFor(() => {
      expect(editor1.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'kA',
          children: [
            {_type: 'span', _key: 's1', text: 'foo ', marks: []},
            {
              _type: 'span',
              _key: 's2',
              text: 'bar',
              marks: ['strong', 'link1'],
            },
            {_type: 'span', _key: 's3', text: ' bazfoo ', marks: []},
            {_type: 'span', _key: 'k4', text: 'bar', marks: ['strong', 'k2']},
            {_type: 'span', _key: 'k5', text: ' baz', marks: []},
          ],
          markDefs: [
            {_type: 'link', _key: 'link1', href: 'https://a.example'},
            {_type: 'link', _key: 'k2', href: 'https://b.example'},
          ],
          style: 'normal',
        },
      ])
    })

    // `kB`'s markDef collides with `kA`'s own `link1`, so it's renamed
    // ahead of the merge, same as a colliding child key, before `kB` is
    // unset.
    const markDefKeySetPatch = patches.find(
      (patch) =>
        patch.type === 'set' &&
        patch.path.at(-1) === '_key' &&
        patch.path.at(-3) === 'markDefs',
    )
    expect(markDefKeySetPatch).toEqual({
      type: 'set',
      path: [{_key: 'kB'}, 'markDefs', {_key: 'link1'}, '_key'],
      value: 'k2',
      origin: 'local',
    })

    // `s2` carries the renamed markDef in its `marks`, so the rename
    // rewrites that reference too, not just the markDef's own `_key`.
    const marksRewritePatch = patches.find(
      (patch) => patch.type === 'set' && patch.path.at(-1) === 'marks',
    )
    expect(marksRewritePatch).toEqual({
      type: 'set',
      path: [{_key: 'kB'}, 'children', {_key: 'k4'}, 'marks'],
      value: ['strong', 'k2'],
      origin: 'local',
    })

    // Editor 2 starts from the same duplicate-markDef-keyed document and
    // receives editor 1's patches as if they came over the wire.
    const {editor: editor2} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: duplicateKeyedInitialValueWithLink(),
    })

    editor2.send({
      type: 'patches',
      patches: patches.map((patch) => ({...patch, origin: 'remote'})),
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor2.getSnapshot().context.value).toEqual(
        editor1.getSnapshot().context.value,
      )
    })
  })
})
