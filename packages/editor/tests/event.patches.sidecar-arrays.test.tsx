import {defineSchema} from '@portabletext/schema'
import {describe, expect, test, vi} from 'vitest'
import {createTestEditor} from '../src/test/vitest'

/**
 * Remote patches produced by diffing tools (e.g. `@sanity/diff-patch` in
 * `@portabletext/plugin-sdk-value`, or Studio's remote patch stream) can
 * address elements of sidecar arrays: `span.marks` (array of strings) and
 * `block.markDefs`. These paths end in a keyed or numeric segment just like
 * structural node paths, but the target array is not the owning node's
 * structural `children`. The engine must route them to plain data patching
 * instead of structural child insertion/removal.
 *
 * The patch shapes below are exactly what `diffValue` emits when a
 * collaborator toggles a decorator or annotation.
 */
describe('event.patches sidecar arrays', () => {
  const schemaDefinition = defineSchema({
    decorators: [{name: 'strong'}, {name: 'em'}],
    annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
  })

  test('Scenario: remote `insert` into `marks` (decorator toggled on)', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          origin: 'remote',
          position: 'after',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'marks', -1],
          items: ['strong'],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'b1',
          children: [
            {_type: 'span', _key: 's1', text: 'foo', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: remote `unset` of a `marks` element (decorator toggled off)', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [
            {_type: 'span', _key: 's1', text: 'foo', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'unset',
          origin: 'remote',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'marks', 0],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: remote annotation toggled on (`marks` insert + `markDefs` insert)', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          origin: 'remote',
          position: 'after',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'marks', -1],
          items: ['m1'],
        },
        {
          type: 'insert',
          origin: 'remote',
          position: 'before',
          path: [{_key: 'b1'}, 'markDefs', 0],
          items: [{_key: 'm1', _type: 'link', href: 'https://www.sanity.io'}],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'foo', marks: ['m1']}],
          markDefs: [
            {_key: 'm1', _type: 'link', href: 'https://www.sanity.io'},
          ],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: remote annotation toggled off (`marks` unset + `markDefs` unset)', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'foo', marks: ['m1']}],
          markDefs: [
            {_key: 'm1', _type: 'link', href: 'https://www.sanity.io'},
          ],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'unset',
          origin: 'remote',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'marks', 0],
        },
        {
          type: 'unset',
          origin: 'remote',
          path: [{_key: 'b1'}, 'markDefs', {_key: 'm1'}],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: remote `set` of a `marks` element (decorator swapped)', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [
            {_type: 'span', _key: 's1', text: 'foo', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'marks', 0],
          value: 'em',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'foo', marks: ['em']}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: remote `diffMatchPatch` on a `marks` element (decorator swapped)', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [
            {_type: 'span', _key: 's1', text: 'foo', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'diffMatchPatch',
          origin: 'remote',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'marks', 0],
          value: '@@ -1,6 +1,2 @@\n-strong\n+em\n',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'foo', marks: ['em']}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })
})
