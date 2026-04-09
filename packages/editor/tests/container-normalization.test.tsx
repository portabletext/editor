import type {Patch} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import type {InternalEditor} from '../src/editor/create-editor'
import {PatchesPlugin} from '../src/plugins/plugin.patches'
import {RendererPlugin} from '../src/plugins/plugin.renderer'
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
              type: 'row',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      type: 'cell',
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

const tableRenderers = [
  {
    renderer: {
      type: 'table' as const,
      render: ({children}: {children: React.ReactNode}) => <>{children}</>,
    },
  },
]

const calloutRenderers = [
  {
    renderer: {
      type: 'callout' as const,
      render: ({children}: {children: React.ReactNode}) => <>{children}</>,
    },
  },
]

describe('container normalization', () => {
  test('top-level void block is not confused with container child type', async () => {
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
      children: <RendererPlugin renderers={tableRenderers} />,
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
          <RendererPlugin renderers={tableRenderers} />
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
        {type: 'set', path: [{_key: tableKey}, 'rows'], value: []},
        {type: 'setIfMissing', path: [{_key: tableKey}, 'rows'], value: []},
        {
          type: 'insert',
          path: [{_key: tableKey}, 'rows', 0],
          position: 'before',
          items: [{_type: 'row', _key: 'k5'}],
        },
        {
          type: 'set',
          path: [{_key: tableKey}, 'rows', {_key: 'k5'}, 'cells'],
          value: [],
        },
        {
          type: 'setIfMissing',
          path: [{_key: tableKey}, 'rows', {_key: 'k5'}, 'cells'],
          value: [],
        },
        {
          type: 'insert',
          path: [{_key: tableKey}, 'rows', {_key: 'k5'}, 'cells', 0],
          position: 'before',
          items: [{_type: 'cell', _key: 'k6'}],
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
          value: [],
        },
        {
          type: 'setIfMissing',
          path: [
            {_key: tableKey},
            'rows',
            {_key: 'k5'},
            'cells',
            {_key: 'k6'},
            'content',
          ],
          value: [],
        },
        {
          type: 'insert',
          path: [
            {_key: tableKey},
            'rows',
            {_key: 'k5'},
            'cells',
            {_key: 'k6'},
            'content',
            0,
          ],
          position: 'before',
          items: [
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
          <RendererPlugin renderers={calloutRenderers} />
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
        {type: 'set', path: [{_key: calloutKey}, 'content'], value: []},
        {
          type: 'setIfMissing',
          path: [{_key: calloutKey}, 'content'],
          value: [],
        },
        {
          type: 'insert',
          path: [{_key: calloutKey}, 'content', 0],
          position: 'before',
          items: [
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
      children: <RendererPlugin renderers={tableRenderers} />,
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
          <RendererPlugin renderers={calloutRenderers} />
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
      children: <RendererPlugin renderers={tableRenderers} />,
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
      children: <RendererPlugin renderers={calloutRenderers} />,
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
        <RendererPlugin renderers={[...tableRenderers, ...calloutRenderers]} />
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
      children: <RendererPlugin renderers={calloutRenderers} />,
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
      // No RendererPlugin: table is treated as a void block object
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
      children: <RendererPlugin renderers={tableRenderers} />,
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

  test('remote value update with deeply nested childless block is normalized', async () => {
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
                          text: 'world',
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
      children: <RendererPlugin renderers={tableRenderers} />,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toHaveLength(2)
    })

    // Simulate a remote value update that replaces the table's rows
    // with a new row whose cell has a block missing children.
    // This goes through sync machine -> applySetNode({rows: [...]})
    // which triggers the set_node case in getDirtyPaths.
    editor.send({
      type: 'update value',
      value: [
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
              _key: 'new-row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'new-cell',
                  content: [
                    {
                      _type: 'block',
                      _key: 'new-block',
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
              _key: 'new-row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'new-cell',
                  content: [
                    {
                      _type: 'block',
                      _key: 'new-block',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k9',
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
      children: <RendererPlugin renderers={calloutRenderers} />,
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

  test('late renderer registration normalizes existing void container', async () => {
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
      // No RendererPlugin initially: callout is void
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

    // Late-register a renderer for callout
    ;(editor as unknown as InternalEditor)._internal.editorActor.send({
      type: 'register renderer',
      rendererConfig: {
        renderer: {
          type: 'callout',
          render: ({children}: {children: React.ReactNode}) => <>{children}</>,
        },
      },
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
})
