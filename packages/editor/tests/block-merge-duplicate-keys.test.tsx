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

function duplicateKeyedInitialValueWithSameLink(): Array<PortableTextBlock> {
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
      markDefs: [{_type: 'link', _key: 'link1', href: 'https://a.example'}],
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

  test('Scenario: undoing the merge restores both original blocks, every `_key` included', async () => {
    const {editor} = await mergeDuplicateKeyedBlocks()

    const mergedValue: Array<PortableTextBlock> = [
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
    ]

    expect(editor.getSnapshot().context.value).toEqual(mergedValue)

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(
        duplicateKeyedInitialValue(),
      )
    })

    editor.send({type: 'history.redo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(mergedValue)
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(
        duplicateKeyedInitialValue(),
      )
    })
  })

  test("Scenario: a remote receiver's caret follows the renamed, reinserted child through the merge", async () => {
    const {patches} = await mergeDuplicateKeyedBlocks()

    // Editor 2 starts from the same duplicate-keyed document and receives
    // editor 1's patches as if they came over the wire.
    const {editor: editor2, locator: locator2} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: duplicateKeyMergeSchema,
      initialValue: duplicateKeyedInitialValue(),
    })

    await userEvent.click(locator2)

    editor2.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'kB'}, 'children', {_key: 's3'}], offset: 3},
        focus: {path: [{_key: 'kB'}, 'children', {_key: 's3'}], offset: 3},
      },
    })

    await vi.waitFor(() => {
      expect(editor2.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: 'kB'}, 'children', {_key: 's3'}], offset: 3},
        focus: {path: [{_key: 'kB'}, 'children', {_key: 's3'}], offset: 3},
        backward: false,
      })
    })

    editor2.send({
      type: 'patches',
      patches: patches.map((patch) => ({...patch, origin: 'remote'})),
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor2.getSnapshot().context.value).toEqual([
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

    await vi.waitFor(() => {
      expect(editor2.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: 'kA'}, 'children', {_key: 'k4'}], offset: 3},
        focus: {path: [{_key: 'kA'}, 'children', {_key: 'k4'}], offset: 3},
        backward: false,
      })
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

  test('Scenario: a byte-identical colliding markDef is still renamed on the collapsed merge path', async () => {
    const schemaDefinition = defineSchema({
      decorators: [{name: 'strong'}],
      annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
    })

    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: duplicateKeyedInitialValueWithSameLink(),
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
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })

    editor.send({type: 'delete.backward', unit: 'character'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
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
            {_type: 'link', _key: 'k2', href: 'https://a.example'},
          ],
          style: 'normal',
        },
      ])
    })
  })
})

function reorderReproInitialValue(): Array<PortableTextBlock> {
  return [
    {
      _type: 'block',
      _key: 'kA',
      children: [
        {_type: 'span', _key: 's1', text: 'foo ', marks: []},
        {_type: 'span', _key: 's2', text: 'bar', marks: []},
      ],
      markDefs: [],
      style: 'normal',
    },
    {
      _type: 'block',
      _key: 'kB',
      children: [
        {_type: 'span', _key: 's1', text: 'baz ', marks: []},
        {_type: 'span', _key: 's2', text: 'bar', marks: []},
      ],
      markDefs: [],
      style: 'normal',
    },
  ]
}

function rangeDeleteMergeSharedKeyChildren() {
  return [
    {_type: 'span', _key: 'e0-k1', text: 'foo ', marks: []},
    {_type: 'span', _key: 'e0-k2', text: 'bar', marks: ['strong']},
  ]
}

function rangeDeleteMergeSharedKeyInitialValue(): Array<PortableTextBlock> {
  return [
    {
      _type: 'block',
      _key: 'kA',
      children: rangeDeleteMergeSharedKeyChildren(),
      markDefs: [],
      style: 'normal',
    },
    {
      _type: 'block',
      _key: 'kB',
      children: rangeDeleteMergeSharedKeyChildren(),
      markDefs: [],
      style: 'normal',
    },
  ]
}

/**
 * Range-delete from `kA`'s second span into `kB`'s first span in a fresh
 * editor over `rangeDeleteMergeSharedKeyInitialValue`, capturing every
 * patch it emits. The two blocks share every child `_key`.
 */
async function rangeDeleteMergeSharedKeyBlocks() {
  const patches: Array<Patch> = []

  const {editor, locator} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition: duplicateKeyMergeSchema,
    initialValue: rangeDeleteMergeSharedKeyInitialValue(),
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
      anchor: {path: [{_key: 'kA'}, 'children', {_key: 'e0-k2'}], offset: 0},
      focus: {path: [{_key: 'kB'}, 'children', {_key: 'e0-k1'}], offset: 3},
    },
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {path: [{_key: 'kA'}, 'children', {_key: 'e0-k2'}], offset: 0},
      focus: {path: [{_key: 'kB'}, 'children', {_key: 'e0-k1'}], offset: 3},
      backward: false,
    })
  })

  editor.send({type: 'delete', direction: 'backward', unit: 'character'})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value.length).toBe(1)
  })

  return {editor, patches}
}

/**
 * Range-delete from `kA`'s `s3` into `kB`'s `s2` in a fresh editor over
 * `duplicateKeyedInitialValueWithLink`, capturing every patch it emits.
 * The two blocks' markDefs share the `link1` key.
 */
async function rangeDeleteMergeMarkDefCollisionBlocks() {
  const schemaDefinition = defineSchema({
    decorators: [{name: 'strong'}],
    annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
  })

  const patches: Array<Patch> = []

  const {editor, locator} = await createTestEditor({
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

  await userEvent.click(locator)

  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'kA'}, 'children', {_key: 's3'}], offset: 0},
      focus: {path: [{_key: 'kB'}, 'children', {_key: 's2'}], offset: 0},
    },
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {path: [{_key: 'kA'}, 'children', {_key: 's3'}], offset: 0},
      focus: {path: [{_key: 'kB'}, 'children', {_key: 's2'}], offset: 0},
      backward: false,
    })
  })

  editor.send({type: 'delete', direction: 'backward', unit: 'character'})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value.length).toBe(1)
  })

  return {editor, patches}
}

describe('Feature: range delete renames colliding keys before merging sibling blocks', () => {
  test('Scenario: a range delete spanning two sibling blocks with colliding child keys keeps children in order', async () => {
    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: duplicateKeyMergeSchema,
      initialValue: reorderReproInitialValue(),
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'kA'}, 'children', {_key: 's1'}], offset: 2},
        focus: {path: [{_key: 'kB'}, 'children', {_key: 's1'}], offset: 2},
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: 'kA'}, 'children', {_key: 's1'}], offset: 2},
        focus: {path: [{_key: 'kB'}, 'children', {_key: 's1'}], offset: 2},
        backward: false,
      })
    })

    editor.send({type: 'delete', direction: 'backward', unit: 'character'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value.length).toBe(1)
    })

    // The renamed span and `kA`'s own children all carry the same (empty)
    // marks, so normalization merges everything into a single span once
    // the renamed key stops mattering; only the order of the merged text
    // proves the reorder bug is gone.
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'kA',
        children: [{_type: 'span', _key: 's1', text: 'foz bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('Scenario: a colliding markDef is renamed and the migrated span keeps the a.example def resolvable', async () => {
    const {editor, patches} = await rangeDeleteMergeMarkDefCollisionBlocks()

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'kA',
        children: [
          {_type: 'span', _key: 's1', text: 'foo ', marks: []},
          {_type: 'span', _key: 's2', text: 'bar', marks: ['strong', 'link1']},
          {_type: 'span', _key: 'k3', text: 'bar', marks: ['strong', 'k2']},
          {_type: 'span', _key: 'k4', text: ' baz', marks: []},
        ],
        markDefs: [
          {_type: 'link', _key: 'link1', href: 'https://a.example'},
          {_type: 'link', _key: 'k2', href: 'https://b.example'},
        ],
        style: 'normal',
      },
    ])

    // These land on the wire before `kB` is unset, checked below.
    const keySetPatches = patches.filter(
      (patch) => patch.type === 'set' && patch.path.at(-1) === '_key',
    )
    expect(keySetPatches).toEqual([
      {
        type: 'set',
        path: [{_key: 'kB'}, 'markDefs', {_key: 'link1'}, '_key'],
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

    // `s2` carries the renamed markDef in its `marks`, so the rename
    // rewrites that reference too, not just the markDef's own `_key`.
    const marksRewritePatch = patches.find(
      (patch) => patch.type === 'set' && patch.path.at(-1) === 'marks',
    )
    expect(marksRewritePatch).toEqual({
      type: 'set',
      path: [{_key: 'kB'}, 'children', {_key: 'k3'}, 'marks'],
      value: ['strong', 'k2'],
      origin: 'local',
    })

    const unsetKbIndex = patches.findIndex(
      (patch) =>
        patch.type === 'unset' &&
        patch.path.length === 1 &&
        typeof patch.path[0] === 'object' &&
        patch.path[0] !== null &&
        '_key' in patch.path[0] &&
        patch.path[0]._key === 'kB',
    )
    expect(unsetKbIndex).toBeGreaterThan(-1)
    for (const keySetPatch of keySetPatches) {
      expect(patches.indexOf(keySetPatch)).toBeLessThan(unsetKbIndex)
    }
  })

  test('Scenario: undoing a range delete with a colliding markDef restores both original blocks, every `_key` included', async () => {
    const {editor} = await rangeDeleteMergeMarkDefCollisionBlocks()

    const mergedValue = editor.getSnapshot().context.value

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(
        duplicateKeyedInitialValueWithLink(),
      )
    })

    editor.send({type: 'history.redo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(mergedValue)
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(
        duplicateKeyedInitialValueWithLink(),
      )
    })
  })

  test('Scenario: a byte-identical colliding markDef is deduped instead of renamed', async () => {
    const schemaDefinition = defineSchema({
      decorators: [{name: 'strong'}],
      annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
    })

    const patches: Array<Patch> = []

    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: duplicateKeyedInitialValueWithSameLink(),
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
        anchor: {path: [{_key: 'kA'}, 'children', {_key: 's3'}], offset: 0},
        focus: {path: [{_key: 'kB'}, 'children', {_key: 's2'}], offset: 0},
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: 'kA'}, 'children', {_key: 's3'}], offset: 0},
        focus: {path: [{_key: 'kB'}, 'children', {_key: 's2'}], offset: 0},
        backward: false,
      })
    })

    editor.send({type: 'delete', direction: 'backward', unit: 'character'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value.length).toBe(1)
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'kA',
        children: [
          {_type: 'span', _key: 's1', text: 'foo ', marks: []},
          {
            _type: 'span',
            _key: 's2',
            text: 'barbar',
            marks: ['strong', 'link1'],
          },
          {_type: 'span', _key: 'k3', text: ' baz', marks: []},
        ],
        markDefs: [{_type: 'link', _key: 'link1', href: 'https://a.example'}],
        style: 'normal',
      },
    ])

    // Normalization merges the two adjacent `strong`+`link1` spans once
    // deduping keeps them both pointing at the same markDef key; that
    // merge is incidental to this scenario, not what it pins.
    const markDefKeySetPatches = patches.filter(
      (patch) =>
        patch.type === 'set' &&
        patch.path.at(-1) === '_key' &&
        patch.path.at(-3) === 'markDefs',
    )
    expect(markDefKeySetPatches).toEqual([])
  })

  test('Scenario: the range start survives as a trimmed empty span and is itself a collision source', async () => {
    const {editor} = await rangeDeleteMergeSharedKeyBlocks()

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'kA',
        children: [
          {_type: 'span', _key: 'e0-k1', text: 'foo  ', marks: []},
          {_type: 'span', _key: 'k3', text: 'bar', marks: ['strong']},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])

    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {path: [{_key: 'kA'}, 'children', {_key: 'e0-k1'}], offset: 4},
      focus: {path: [{_key: 'kA'}, 'children', {_key: 'e0-k1'}], offset: 4},
      backward: false,
    })
  })

  test('Scenario: the rename patches land before the merge unsets and inserts on the wire', async () => {
    const {patches} = await rangeDeleteMergeSharedKeyBlocks()

    const keySetPatches = patches.filter(
      (patch) => patch.type === 'set' && patch.path.at(-1) === '_key',
    )
    expect(keySetPatches).toEqual([
      {
        type: 'set',
        path: [{_key: 'kB'}, 'children', {_key: 'e0-k1'}, '_key'],
        value: 'k2',
        origin: 'local',
      },
      {
        type: 'set',
        path: [{_key: 'kB'}, 'children', {_key: 'e0-k2'}, '_key'],
        value: 'k3',
        origin: 'local',
      },
    ])

    const unsetKbIndex = patches.findIndex(
      (patch) =>
        patch.type === 'unset' &&
        patch.path.length === 1 &&
        typeof patch.path[0] === 'object' &&
        patch.path[0] !== null &&
        '_key' in patch.path[0] &&
        patch.path[0]._key === 'kB',
    )
    expect(unsetKbIndex).toBeGreaterThan(-1)
    for (const keySetPatch of keySetPatches) {
      expect(patches.indexOf(keySetPatch)).toBeLessThan(unsetKbIndex)
    }

    const insertedKeys = patches.flatMap((patch) =>
      patch.type === 'insert'
        ? patch.items.flatMap((item) =>
            typeof item === 'object' && item !== null && '_key' in item
              ? [item['_key']]
              : [],
          )
        : [],
    )
    expect(insertedKeys).toEqual(['k2', 'k3'])
  })

  test('Scenario: undoing the range delete restores both original blocks, every `_key` included', async () => {
    const {editor} = await rangeDeleteMergeSharedKeyBlocks()

    const mergedValue = editor.getSnapshot().context.value

    const initialValue = [
      {
        _type: 'block',
        _key: 'kA',
        children: [
          {_type: 'span', _key: 'e0-k1', text: 'foo ', marks: []},
          {_type: 'span', _key: 'e0-k2', text: 'bar', marks: ['strong']},
        ],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: 'kB',
        children: [
          {_type: 'span', _key: 'e0-k1', text: 'foo ', marks: []},
          {_type: 'span', _key: 'e0-k2', text: 'bar', marks: ['strong']},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })

    editor.send({type: 'history.redo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(mergedValue)
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test('Scenario: a range delete spanning two sibling blocks with a colliding inline-object key renames it and keeps its position', async () => {
    const patches: Array<Patch> = []
    const schemaDefinition = defineSchema({
      decorators: [{name: 'strong'}],
      inlineObjects: [{name: 'stock-ticker'}],
    })

    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: 'kA',
          children: [{_type: 'span', _key: 's1', text: 'foo ', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'kB',
          children: [
            {_type: 'span', _key: 'b1', text: 'baz ', marks: []},
            {_type: 'stock-ticker', _key: 's1'},
            {_type: 'span', _key: 'b2', text: 'qux', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
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
        anchor: {path: [{_key: 'kA'}, 'children', {_key: 's1'}], offset: 2},
        focus: {path: [{_key: 'kB'}, 'children', {_key: 'b1'}], offset: 2},
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: 'kA'}, 'children', {_key: 's1'}], offset: 2},
        focus: {path: [{_key: 'kB'}, 'children', {_key: 'b1'}], offset: 2},
        backward: false,
      })
    })

    editor.send({type: 'delete', direction: 'backward', unit: 'character'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'kA',
          children: [
            {_type: 'span', _key: 's1', text: 'foz ', marks: []},
            {_type: 'stock-ticker', _key: 'k2'},
            {_type: 'span', _key: 'b2', text: 'qux', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    const keySetPatchIndex = patches.findIndex(
      (patch) =>
        patch.type === 'set' &&
        patch.path.at(-1) === '_key' &&
        patch.path.at(-2) &&
        typeof patch.path.at(-2) === 'object' &&
        (patch.path.at(-2) as {_key: string})._key === 's1',
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
    expect(keySetPatchIndex).toBeGreaterThan(-1)
    expect(unsetKbIndex).toBeGreaterThan(-1)
    expect(keySetPatchIndex).toBeLessThan(unsetKbIndex)
  })
})
