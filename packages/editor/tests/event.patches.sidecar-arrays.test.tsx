import {defineSchema} from '@portabletext/schema'
import {describe, expect, test, vi} from 'vitest'
import {defineContainer} from '../src'
import {NodePlugin} from '../src/plugins'
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

describe('event.patches sidecar arrays in containers and custom arrays', () => {
  const schemaDefinition = defineSchema({
    decorators: [{name: 'strong'}, {name: 'em'}, {name: 'underline'}],
    annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
    blockObjects: [
      {
        name: 'callout',
        fields: [
          {name: 'content', type: 'array', of: [{type: 'block'}]},
          {name: 'tags', type: 'array', of: [{type: 'string'}]},
        ],
      },
      {
        name: 'table',
        fields: [
          {
            name: 'rows',
            type: 'array',
            of: [
              {
                type: 'object',
                name: 'row',
                fields: [
                  {
                    name: 'cells',
                    type: 'array',
                    of: [
                      {
                        type: 'object',
                        name: 'cell',
                        fields: [
                          {
                            name: 'content',
                            type: 'array',
                            of: [{type: 'block'}],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'image',
        fields: [{name: 'tags', type: 'array', of: [{type: 'string'}]}],
      },
    ],
  })

  const containers = [
    defineContainer({type: 'callout', arrayField: 'content'}),
    defineContainer({
      type: 'table',
      arrayField: 'rows',
      of: [
        defineContainer({
          type: 'row',
          arrayField: 'cells',
          of: [defineContainer({type: 'cell', arrayField: 'content'})],
        }),
      ],
    }),
  ]

  test('Scenario: remote `insert` into `marks` on a container-nested span', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c1',
          content: [
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          tags: [],
        },
      ],
      children: <NodePlugin nodes={containers} />,
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          origin: 'remote',
          position: 'after',
          path: [
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'marks',
            -1,
          ],
          items: ['strong'],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: 'c1',
          content: [
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
          tags: [],
        },
      ])
    })
  })

  test('Scenario: remote annotation toggled on inside a container (`marks` + `markDefs` insert)', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c1',
          content: [
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          tags: [],
        },
      ],
      children: <NodePlugin nodes={containers} />,
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          origin: 'remote',
          position: 'after',
          path: [{_key: 'c1'}, 'content', {_key: 'b1'}, 'markDefs', -1],
          items: [{_type: 'link', _key: 'm1', href: 'https://example.com'}],
        },
        {
          type: 'insert',
          origin: 'remote',
          position: 'after',
          path: [
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'marks',
            -1,
          ],
          items: ['m1'],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: 'c1',
          content: [
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's1', text: 'foo', marks: ['m1']},
              ],
              markDefs: [
                {_type: 'link', _key: 'm1', href: 'https://example.com'},
              ],
              style: 'normal',
            },
          ],
          tags: [],
        },
      ])
    })
  })

  test('Scenario: remote `unset` of a `marks` element two containers deep', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition,
      initialValue: [
        {
          _type: 'table',
          _key: 't1',
          rows: [
            {
              _type: 'row',
              _key: 'r1',
              cells: [
                {
                  _type: 'cell',
                  _key: 'cl1',
                  content: [
                    {
                      _type: 'block',
                      _key: 'b1',
                      children: [
                        {
                          _type: 'span',
                          _key: 's1',
                          text: 'foo',
                          marks: ['strong'],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={containers} />,
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'unset',
          origin: 'remote',
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'cl1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'marks',
            0,
          ],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: 't1',
          rows: [
            {
              _type: 'row',
              _key: 'r1',
              cells: [
                {
                  _type: 'cell',
                  _key: 'cl1',
                  content: [
                    {
                      _type: 'block',
                      _key: 'b1',
                      children: [
                        {_type: 'span', _key: 's1', text: 'foo', marks: []},
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
  })

  test('Scenario: remote `insert` into a void block object custom array', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition,
      initialValue: [{_type: 'image', _key: 'i1', tags: ['photo']}],
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          origin: 'remote',
          position: 'after',
          path: [{_key: 'i1'}, 'tags', -1],
          items: ['landscape'],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {_type: 'image', _key: 'i1', tags: ['photo', 'landscape']},
      ])
    })
  })

  test('Scenario: remote `unset` of an element in a container-owned data array', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c1',
          content: [
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          tags: ['news', 'sports'],
        },
      ],
      children: <NodePlugin nodes={containers} />,
    })

    // `tags` sits beside the container's structural child field (`content`);
    // the element removal must hit `tags`, not the container's children.
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'unset',
          origin: 'remote',
          path: [{_key: 'c1'}, 'tags', 0],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: 'c1',
          content: [
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          tags: ['sports'],
        },
      ])
    })
  })
})

describe('event.patches sidecar arrays: multi-element and keyed tails', () => {
  // Multi-element fixtures: empty and single-element arrays cannot
  // distinguish "landed at the anchor" from "landed at the end", nor keyed
  // resolution from "accidentally index 0".
  const schemaDefinition = defineSchema({
    decorators: [{name: 'strong'}, {name: 'em'}, {name: 'underline'}],
    annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
    blockObjects: [
      {
        name: 'callout',
        fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
      },
    ],
  })
  const containers = [defineContainer({type: 'callout', arrayField: 'content'})]

  function calloutWith(children: unknown, markDefs: unknown) {
    return {
      _type: 'callout',
      _key: 'c1',
      content: [
        {
          _type: 'block',
          _key: 'b1',
          children,
          markDefs,
          style: 'normal',
        },
      ],
    }
  }

  test('Scenario: remote `insert` after a middle `marks` element lands between its neighbors', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition,
      initialValue: [
        calloutWith(
          [{_type: 'span', _key: 's1', text: 'foo', marks: ['strong', 'em']}],
          [],
        ),
      ],
      children: <NodePlugin nodes={containers} />,
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          origin: 'remote',
          position: 'after',
          path: [
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'marks',
            0,
          ],
          items: ['underline'],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        calloutWith(
          [
            {
              _type: 'span',
              _key: 's1',
              text: 'foo',
              marks: ['strong', 'underline', 'em'],
            },
          ],
          [],
        ),
      ])
    })
  })

  test('Scenario: remote `unset` of a middle `marks` element removes only that element', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition,
      initialValue: [
        calloutWith(
          [
            {
              _type: 'span',
              _key: 's1',
              text: 'foo',
              marks: ['strong', 'underline', 'em'],
            },
          ],
          [],
        ),
      ],
      children: <NodePlugin nodes={containers} />,
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'unset',
          origin: 'remote',
          path: [
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'marks',
            1,
          ],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        calloutWith(
          [{_type: 'span', _key: 's1', text: 'foo', marks: ['strong', 'em']}],
          [],
        ),
      ])
    })
  })

  test('Scenario: remote `insert` anchored on a keyed `markDefs` element lands between its neighbors', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition,
      initialValue: [
        calloutWith(
          [{_type: 'span', _key: 's1', text: 'foo', marks: ['m1', 'm2']}],
          [
            {_type: 'link', _key: 'm1', href: 'https://one.example'},
            {_type: 'link', _key: 'm2', href: 'https://two.example'},
          ],
        ),
      ],
      children: <NodePlugin nodes={containers} />,
    })

    // The mark insert rides along so the new markDef is referenced; an
    // unreferenced markDef is orphaned data the editor strips (both the
    // unused-markDefs normalization rule and `validateValue`'s
    // auto-resolution remove it).
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          origin: 'remote',
          position: 'after',
          path: [
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'markDefs',
            {_key: 'm1'},
          ],
          items: [{_type: 'link', _key: 'm3', href: 'https://three.example'}],
        },
        {
          type: 'insert',
          origin: 'remote',
          position: 'after',
          path: [
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'marks',
            -1,
          ],
          items: ['m3'],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        calloutWith(
          [
            {
              _type: 'span',
              _key: 's1',
              text: 'foo',
              marks: ['m1', 'm2', 'm3'],
            },
          ],
          [
            {_type: 'link', _key: 'm1', href: 'https://one.example'},
            {_type: 'link', _key: 'm3', href: 'https://three.example'},
            {_type: 'link', _key: 'm2', href: 'https://two.example'},
          ],
        ),
      ])
    })
  })

  test('Scenario: remote keyed `unset` removes the addressed `markDefs` element, not index 0', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition,
      initialValue: [
        calloutWith(
          [{_type: 'span', _key: 's1', text: 'foo', marks: ['m1', 'm2']}],
          [
            {_type: 'link', _key: 'm1', href: 'https://one.example'},
            {_type: 'link', _key: 'm2', href: 'https://two.example'},
          ],
        ),
      ],
      children: <NodePlugin nodes={containers} />,
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'unset',
          origin: 'remote',
          path: [
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
            'marks',
            1,
          ],
        },
        {
          type: 'unset',
          origin: 'remote',
          path: [
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'markDefs',
            {_key: 'm2'},
          ],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        calloutWith(
          [{_type: 'span', _key: 's1', text: 'foo', marks: ['m1']}],
          [{_type: 'link', _key: 'm1', href: 'https://one.example'}],
        ),
      ])
    })
  })
})
