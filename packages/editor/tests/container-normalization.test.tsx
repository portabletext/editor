import type {Patch} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {NodePlugin} from '../src/plugins/plugin.node'
import {PatchesPlugin} from '../src/plugins/plugin.patches'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  blockObjects: [
    {name: 'row'},
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}],
        },
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
  ],
})

const tableContainers = [
  defineContainer({
    type: 'table',
    arrayField: 'rows',
    render: ({children}) => <>{children}</>,
  }),
  defineContainer({
    type: 'row',
    arrayField: 'cells',
    render: ({children}) => <>{children}</>,
  }),
  defineContainer({
    type: 'cell',
    arrayField: 'content',
    render: ({children}) => <>{children}</>,
  }),
]

const calloutContainers = [
  defineContainer({
    type: 'callout',
    arrayField: 'content',
    render: ({children}) => <>{children}</>,
  }),
]

describe('container normalization', () => {
  test('top-level registration is inert at a position where schema declares the type without the registered arrayField', async () => {
    // Registration is type-keyed; activation is position-gated.
    // The test schema declares `row` twice:
    //   - root: `{name: 'row'}` (void, no fields)
    //   - inline inside `table.rows.of`: with a `cells` field
    // A top-level `defineContainer({type: 'row', arrayField: 'cells'})`
    // registers `row` as a container. At the root position, schema
    // declares `row` without `cells` - the registration is inert and
    // the top-level row stays as a bare void object. The same
    // registration still activates at the inline-table position
    // (covered by other tests in this suite).
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const rowKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'row',
          _key: rowKey,
        },
      ],
      children: <NodePlugin nodes={tableContainers} />,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'row',
          _key: rowKey,
        },
      ])
    })
  })

  test('container block normalizes to cursor-ready structure', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const tableKey = keyGenerator()

    const patches: Array<Patch> = []

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'table',
          _key: tableKey,
        },
      ],
      children: (
        <>
          <PatchesPlugin patches={patches} />
          <NodePlugin nodes={tableContainers} />
        </>
      ),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: 'k5',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k6',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k7',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k8',
                          text: '',
                          marks: [],
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
      ])
    })

    // Normalization patches are deferred during setup. Trigger the dirty
    // state so deferred patches get emitted.
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 5,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 5,
        },
      },
    })
    editor.send({type: 'insert.text', text: ' '})

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: tableKey}, 'rows'],
          value: [{_type: 'row', _key: 'k5'}],
        },
        {
          type: 'set',
          path: [{_key: tableKey}, 'rows', {_key: 'k5'}, 'cells'],
          value: [{_type: 'cell', _key: 'k6'}],
        },
        {
          type: 'set',
          path: [
            {_key: tableKey},
            'rows',
            {_key: 'k5'},
            'cells',
            {_key: 'k6'},
            'content',
          ],
          value: [
            {
              _type: 'block',
              _key: 'k7',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k8', text: '', marks: []}],
            },
          ],
        },
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
          value: '@@ -1,5 +1,6 @@\n hello\n+ \n',
        },
      ])
    })
  })

  test('callout container normalizes to cursor-ready structure', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const calloutKey = keyGenerator()

    const patches: Array<Patch> = []

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
        },
      ],
      children: (
        <>
          <PatchesPlugin patches={patches} />
          <NodePlugin nodes={calloutContainers} />
        </>
      ),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: 'k5',
              children: [
                {
                  _type: 'span',
                  _key: 'k6',
                  text: '',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 5,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 5,
        },
      },
    })
    editor.send({type: 'insert.text', text: ' '})

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: calloutKey}, 'content'],
          value: [
            {
              _type: 'block',
              _key: 'k5',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k6', text: '', marks: []}],
            },
          ],
        },
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
          value: '@@ -1,5 +1,6 @@\n hello\n+ \n',
        },
      ])
    })
  })

  test('text block with missing children normalizes to have empty span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: 'k4',
              text: '',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('incoming patch unsets container children restores structure', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const contentBlockKey = keyGenerator()
    const contentSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: contentBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: contentSpanKey,
                          text: '',
                          marks: [],
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
      children: <NodePlugin nodes={tableContainers} />,
    })

    // Verify initial value is correct
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: contentBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: contentSpanKey,
                          text: '',
                          marks: [],
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
      ])
    })

    // Simulate a remote unset of the rows field
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'unset',
          path: [{_key: tableKey}, 'rows'],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: 'k9',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k10',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k11',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k12',
                          text: '',
                          marks: [],
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
      ])
    })
  })

  test('container with text block missing children normalizes the block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const contentBlockKey = keyGenerator()

    const patches: Array<Patch> = []

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: contentBlockKey,
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <>
          <PatchesPlugin patches={patches} />
          <NodePlugin nodes={calloutContainers} />
        </>
      ),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: contentBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: 'k6',
                  text: '',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 5,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 5,
        },
      },
    })
    editor.send({type: 'insert.text', text: ' '})

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [
            {_key: calloutKey},
            'content',
            {_key: contentBlockKey},
            'children',
          ],
          value: [],
        },
        {
          type: 'setIfMissing',
          path: [
            {_key: calloutKey},
            'content',
            {_key: contentBlockKey},
            'children',
          ],
          value: [],
        },
        {
          type: 'insert',
          path: [
            {_key: calloutKey},
            'content',
            {_key: contentBlockKey},
            'children',
            0,
          ],
          position: 'before',
          items: [{_type: 'span', _key: 'k6', text: '', marks: []}],
        },
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
          value: '@@ -1,5 +1,6 @@\n hello\n+ \n',
        },
      ])
    })
  })

  test('duplicate keys in container children are fixed', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [],
            },
            {
              _type: 'row',
              _key: rowKey,
              cells: [],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={tableContainers} />,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: 'k10',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k11',
                      children: [
                        {_type: 'span', _key: 'k12', text: '', marks: []},
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
              ],
            },
            {
              _type: 'row',
              _key: 'k6',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k7',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k8',
                      children: [
                        {_type: 'span', _key: 'k9', text: '', marks: []},
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

  test('incoming patch unsets container field and normalization restores it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const contentBlockKey = keyGenerator()
    const contentSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: contentBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: contentSpanKey,
                  text: '',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <NodePlugin nodes={calloutContainers} />,
    })

    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      const callout = value[1] as Record<string, unknown>
      expect(Array.isArray(callout['content'])).toBe(true)
    })

    // Simulate a remote patch that removes the content field
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'unset',
          path: [{_key: calloutKey}, 'content'],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: 'k7',
              children: [{_type: 'span', _key: 'k8', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('multiple containers in same document normalize independently', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const tableKey = keyGenerator()
    const calloutKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'table',
          _key: tableKey,
        },
        {
          _type: 'callout',
          _key: calloutKey,
        },
      ],
      children: (
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
      ),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: 'k6',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k7',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k8',
                      children: [
                        {_type: 'span', _key: 'k9', text: '', marks: []},
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
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: 'k10',
              children: [{_type: 'span', _key: 'k11', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('container inserted via incoming patch normalizes', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={calloutContainers} />,
    })

    // Insert a bare callout via incoming patch
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          path: [{_key: blockKey}],
          position: 'after',
          items: [
            {
              _type: 'callout',
              _key: 'remote-callout',
            },
          ],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: 'remote-callout',
          content: [
            {
              _type: 'block',
              _key: 'k4',
              children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('void container with empty child array is not normalized', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const tableKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'table',
          _key: tableKey,
          rows: [],
        },
      ],
      // No ContainerPlugin: table is treated as a void block object
    })

    // Give normalization time to run (it shouldn't touch the table)
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'table',
          _key: tableKey,
          rows: [],
        },
      ])
    })
  })

  test('deeply nested container block with missing children is normalized', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const contentBlockKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: contentBlockKey,
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
      children: <NodePlugin nodes={tableContainers} />,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: contentBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: 'k8',
                          text: '',
                          marks: [],
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
      ])
    })
  })

  test('removing last child from container triggers normalization', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const contentBlockKey = keyGenerator()
    const contentSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: contentBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: contentSpanKey,
                  text: 'inside',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <NodePlugin nodes={calloutContainers} />,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toHaveLength(2)
    })

    // Remove the content block via incoming patch, leaving content: []
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'unset',
          path: [{_key: calloutKey}, 'content', {_key: contentBlockKey}],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: 'k7',
              children: [{_type: 'span', _key: 'k8', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('late container registration normalizes existing void container', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const calloutKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
        },
      ],
      // No ContainerPlugin initially: callout is void
    })

    // Verify the callout stays as-is (void, no normalization)
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
        },
      ])
    })

    // Late-register a container for callout
    editor.registerNode({
      node: defineContainer({
        type: 'callout',
        arrayField: 'content',
      }),
    })

    // Normalization should now kick in and populate the callout
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: 'k5',
              children: [{_type: 'span', _key: 'k6', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('container block with no `_key` gets a key via numeric index', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const calloutKey = keyGenerator()

    const patches: Array<Patch> = []

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <>
          <PatchesPlugin patches={patches} />
          <NodePlugin nodes={calloutContainers} />
        </>
      ),
    })

    // Insert a callout whose content block and span both lack _key.
    // Normalization must assign keys using numeric indices at container depth.
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          path: [{_key: blockKey}],
          position: 'after',
          items: [
            {
              _type: 'callout',
              _key: calloutKey,
              content: [
                {
                  _type: 'block',
                  children: [{_type: 'span', text: '', marks: []}],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: 'k6',
              children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: calloutKey}, 'content', 0, 'children', 0, '_key'],
          value: 'k5',
        },
        {
          type: 'set',
          path: [{_key: calloutKey}, 'content', 0, '_key'],
          value: 'k6',
        },
      ])
    })
  })

  test('non-block editable field produces warning and is excluded', async () => {
    const cardSchemaDefinition = defineSchema({
      blockObjects: [
        {
          name: 'card',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [{type: 'block'}],
            },
            {
              name: 'tags',
              type: 'array',
              of: [{type: 'string'}],
            },
          ],
        },
      ],
    })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const cardKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: cardSchemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'card',
          _key: cardKey,
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'card',
              // 'tags' is a primitive-only array; the engine warn-and-excludes
              // it at runtime. With type narrowing dropped from v2, this is
              // a runtime-only check (no compile-time rejection).
              arrayField: 'tags',
              render: ({children}) => <>{children}</>,
            }),
          ]}
        />
      ),
    })

    // The card should NOT be normalized because 'tags' is excluded
    // (primitive types only)
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'card',
          _key: cardKey,
        },
      ])
    })

    expect(warnSpy).toHaveBeenCalledWith(
      "Field 'tags' on 'card' doesn't contain block or container types and will be excluded",
    )

    warnSpy.mockRestore()
  })

  test('three independent containers normalize without interference', async () => {
    const multiContainerSchemaDefinition = defineSchema({
      blockObjects: [
        {
          name: 'callout',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [{type: 'block'}],
            },
          ],
        },
        {
          name: 'row',
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
          name: 'figure',
          fields: [
            {
              name: 'caption',
              type: 'array',
              of: [{type: 'block'}],
            },
          ],
        },
      ],
    })

    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const tableKey = keyGenerator()
    const figureKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: multiContainerSchemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
        },
        {
          _type: 'table',
          _key: tableKey,
        },
        {
          _type: 'figure',
          _key: figureKey,
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
            defineContainer({
              type: 'table',
              arrayField: 'rows',
              render: ({children}) => <>{children}</>,
            }),
            defineContainer({
              type: 'row',
              arrayField: 'cells',
              render: ({children}) => <>{children}</>,
            }),
            defineContainer({
              type: 'cell',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
            defineContainer({
              type: 'figure',
              arrayField: 'caption',
              render: ({children}) => <>{children}</>,
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: 'k7',
              children: [{_type: 'span', _key: 'k8', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: 'k9',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k10',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k11',
                      children: [
                        {_type: 'span', _key: 'k12', text: '', marks: []},
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
        {
          _type: 'figure',
          _key: figureKey,
          caption: [
            {
              _type: 'block',
              _key: 'k13',
              children: [{_type: 'span', _key: 'k14', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('full hierarchy normalizes all levels', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const tableKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: 'row-0',
              cells: [
                {
                  _type: 'cell',
                  _key: 'cell-0',
                  content: [],
                },
              ],
            },
          ],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'table',
              arrayField: 'rows',
              render: ({children}) => <>{children}</>,
            }),
            defineContainer({
              type: 'row',
              arrayField: 'cells',
              render: ({children}) => <>{children}</>,
            }),
            defineContainer({
              type: 'cell',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: 'row-0',
              cells: [
                {
                  _type: 'cell',
                  _key: 'cell-0',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k5',
                      children: [
                        {_type: 'span', _key: 'k6', text: '', marks: []},
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

  test('shallow table normalizes to full cursor-ready structure', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'table',
              arrayField: 'rows',
              render: ({children}) => <>{children}</>,
            }),
            defineContainer({
              type: 'row',
              arrayField: 'cells',
              render: ({children}) => <>{children}</>,
            }),
            defineContainer({
              type: 'cell',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
          ]}
        />
      ),
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          path: [{_key: blockKey}],
          position: 'after',
          items: [{_type: 'table'}],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'table',
          _key: 'k4',
          rows: [
            {
              _type: 'row',
              _key: 'k5',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k6',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k7',
                      children: [
                        {_type: 'span', _key: 'k8', text: '', marks: []},
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

  test('unregistering container reverts container to void', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const calloutKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
        },
      ],
    })

    const unregisterCallout = editor.registerNode({
      node: defineContainer({
        type: 'callout',
        arrayField: 'content',
      }),
    })

    // Verify normalization happened
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: 'k5',
              children: [{_type: 'span', _key: 'k6', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })

    // Unregister the container via the public registerNode return
    unregisterCallout()

    // Send a new value with a callout with empty content
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: calloutKey}, 'content'],
          value: [],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    })

    // The empty content array should NOT be normalized because the type
    // is no longer editable
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          content: [],
        },
      ])
    })
  })

  test('calling the unregister function returned from editor.registerNode reverts container to void', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const calloutKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
        },
      ],
    })

    const unregister = editor.registerNode({
      node: defineContainer({
        type: 'callout',
        arrayField: 'content',
      }),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: 'k5',
              children: [{_type: 'span', _key: 'k6', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })

    unregister()

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: calloutKey}, 'content'],
          value: [],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          content: [],
        },
      ])
    })
  })

  test('unmounting ContainerPlugin reverts container to void', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const calloutKey = keyGenerator()

    const initialValue = [
      {
        _type: 'block' as const,
        _key: blockKey,
        children: [
          {_type: 'span' as const, _key: spanKey, text: 'hello', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'callout',
        _key: calloutKey,
      },
    ]

    const {editor, rerender} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue,
      children: <NodePlugin nodes={calloutContainers} />,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: 'k5',
              children: [{_type: 'span', _key: 'k6', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })

    await rerender({
      keyGenerator,
      schemaDefinition,
      initialValue,
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: calloutKey}, 'content'],
          value: [],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          content: [],
        },
      ])
    })
  })
  test('partial nested subtree inserted via patches normalizes leaves to placeholder blocks', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={tableContainers} />,
    })

    // Insert a partially-formed table: rows + cells are scaffolded, but each
    // cell's `content` field is missing entirely. Normalization should walk
    // descendants of the insertion and fill each cell's content with a
    // placeholder block.
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          path: [{_key: blockKey}],
          position: 'after',
          items: [
            {
              _type: 'table',
              _key: 'table-0',
              rows: [
                {
                  _type: 'row',
                  _key: 'row-0',
                  cells: [
                    {_type: 'cell', _key: 'cell-0'},
                    {_type: 'cell', _key: 'cell-1'},
                  ],
                },
              ],
            },
          ],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'table',
          _key: 'table-0',
          rows: [
            {
              _type: 'row',
              _key: 'row-0',
              cells: [
                {
                  _type: 'cell',
                  _key: 'cell-0',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k6',
                      children: [
                        {_type: 'span', _key: 'k7', text: '', marks: []},
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: 'cell-1',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k4',
                      children: [
                        {_type: 'span', _key: 'k5', text: '', marks: []},
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

  test('partial nested subtree inserted via insert.block event normalizes leaves to placeholder blocks', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={tableContainers} />,
    })

    // Same shape as the patches test above, but inserted via the
    // `insert.block` event instead. The contract for normalization should not
    // depend on the origin of the operation.
    editor.send({
      type: 'insert.block',
      block: {
        _type: 'table',
        _key: 'table-0',
        rows: [
          {
            _type: 'row',
            _key: 'row-0',
            cells: [
              {_type: 'cell', _key: 'cell-0'},
              {_type: 'cell', _key: 'cell-1'},
            ],
          },
        ],
      },
      placement: 'after',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'table',
          _key: 'table-0',
          rows: [
            {
              _type: 'row',
              _key: 'row-0',
              cells: [
                {
                  _type: 'cell',
                  _key: 'cell-0',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k6',
                      children: [
                        {_type: 'span', _key: 'k7', text: '', marks: []},
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: 'cell-1',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k4',
                      children: [
                        {_type: 'span', _key: 'k5', text: '', marks: []},
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

  test('partial row inserted into existing table via patches normalizes cell content', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: 'row-0',
              cells: [
                {
                  _type: 'cell',
                  _key: 'cell-0',
                  content: [
                    {
                      _type: 'block',
                      _key: 'b0',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 's0', text: '', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={tableContainers} />,
    })

    // Insert a partial row directly into the table's `rows` field via a
    // remote patch. The row's only cell has no `content` field at all;
    // normalization should fill it.
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          path: [{_key: tableKey}, 'rows', {_key: 'row-0'}],
          position: 'after',
          items: [
            {
              _type: 'row',
              _key: 'row-1',
              cells: [{_type: 'cell', _key: 'cell-1'}],
            },
          ],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: 'row-0',
              cells: [
                {
                  _type: 'cell',
                  _key: 'cell-0',
                  content: [
                    {
                      _type: 'block',
                      _key: 'b0',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 's0', text: '', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
            {
              _type: 'row',
              _key: 'row-1',
              cells: [
                {
                  _type: 'cell',
                  _key: 'cell-1',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k3',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k4', text: '', marks: []},
                      ],
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

  test('partial row inserted into existing table via insert.block normalizes cell content', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: 'row-0',
              cells: [
                {
                  _type: 'cell',
                  _key: 'cell-0',
                  content: [
                    {
                      _type: 'block',
                      _key: 'b0',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 's0', text: '', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={tableContainers} />,
    })

    // Same shape but via insert.block targeting the reference row's path.
    editor.send({
      type: 'insert.block',
      block: {
        _type: 'row',
        _key: 'row-1',
        cells: [{_type: 'cell', _key: 'cell-1'}],
      },
      placement: 'after',
      at: {
        anchor: {path: [{_key: tableKey}, 'rows', {_key: 'row-0'}], offset: 0},
        focus: {path: [{_key: tableKey}, 'rows', {_key: 'row-0'}], offset: 0},
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: 'row-0',
              cells: [
                {
                  _type: 'cell',
                  _key: 'cell-0',
                  content: [
                    {
                      _type: 'block',
                      _key: 'b0',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 's0', text: '', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
            {
              _type: 'row',
              _key: 'row-1',
              cells: [
                {
                  _type: 'cell',
                  _key: 'cell-1',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k3',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k4', text: '', marks: []},
                      ],
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

  test('partial row inserted at nested path with nested-`of` registration normalizes cell content', async () => {
    // Mirrors plugin-table's exact setup: single top-level container with
    // nested-`of` children, partial row inserted at a NESTED path.
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()

    const nestedTableContainer = defineContainer({
      type: 'table',
      arrayField: 'rows',
      render: ({children}) => <>{children}</>,
      of: [
        defineContainer({
          type: 'row',
          arrayField: 'cells',
          render: ({children}) => <>{children}</>,
          of: [
            defineContainer({
              type: 'cell',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
          ],
        }),
      ],
    })

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: 'row-0',
              cells: [
                {
                  _type: 'cell',
                  _key: 'cell-0',
                  content: [
                    {
                      _type: 'block',
                      _key: 'b0',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 's0', text: '', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={[nestedTableContainer]} />,
    })

    editor.send({
      type: 'insert.block',
      block: {
        _type: 'row',
        _key: 'row-1',
        cells: [{_type: 'cell', _key: 'cell-1'}],
      },
      placement: 'after',
      at: {
        anchor: {path: [{_key: tableKey}, 'rows', {_key: 'row-0'}], offset: 0},
        focus: {path: [{_key: tableKey}, 'rows', {_key: 'row-0'}], offset: 0},
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: 'row-0',
              cells: [
                {
                  _type: 'cell',
                  _key: 'cell-0',
                  content: [
                    {
                      _type: 'block',
                      _key: 'b0',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 's0', text: '', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
            {
              _type: 'row',
              _key: 'row-1',
              cells: [
                {
                  _type: 'cell',
                  _key: 'cell-1',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k3',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k4', text: '', marks: []},
                      ],
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
})
