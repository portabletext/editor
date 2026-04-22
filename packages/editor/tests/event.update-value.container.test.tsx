import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {safeParse, safeStringify} from '../src/internal-utils/safe-json'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
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
      name: 'code-block',
      fields: [
        {
          name: 'lines',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [{name: 'code'}],
              decorators: [],
              annotations: [],
              lists: [],
              inlineObjects: [],
            },
          ],
        },
      ],
    },
  ],
})

const calloutContainer = [
  defineContainer<typeof schemaDefinition>({
    scope: '$..callout',
    field: 'content',
    render: ({children}) => <>{children}</>,
  }),
]

const codeBlockContainer = [
  defineContainer<typeof schemaDefinition>({
    scope: '$..code-block',
    field: 'lines',
    render: ({children}) => <>{children}</>,
  }),
]

describe('event.update value with containers', () => {
  test('Scenario: Update text inside a container line', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      children: <ContainerPlugin containers={calloutContainer} />,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'goodbye', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'goodbye', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('Scenario: Add a new line to a container', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const span1Key = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      children: <ContainerPlugin containers={codeBlockContainer} />,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: line1Key,
              children: [
                {_type: 'span', _key: span1Key, text: 'first', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ],
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: line1Key,
              children: [
                {_type: 'span', _key: span1Key, text: 'first', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
            {
              _type: 'block',
              _key: 'newLine',
              children: [
                {_type: 'span', _key: 'newSpan', text: 'second', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: line1Key,
              children: [
                {_type: 'span', _key: span1Key, text: 'first', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
            {
              _type: 'block',
              _key: 'newLine',
              children: [
                {_type: 'span', _key: 'newSpan', text: 'second', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ])
    })
  })

  test('Scenario: Remove a line from a container', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const span1Key = keyGenerator()
    const line2Key = keyGenerator()
    const span2Key = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      children: <ContainerPlugin containers={codeBlockContainer} />,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: line1Key,
              children: [
                {_type: 'span', _key: span1Key, text: 'first', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
            {
              _type: 'block',
              _key: line2Key,
              children: [
                {_type: 'span', _key: span2Key, text: 'second', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ],
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: line1Key,
              children: [
                {_type: 'span', _key: span1Key, text: 'first', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: line1Key,
              children: [
                {_type: 'span', _key: span1Key, text: 'first', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ])
    })
  })

  test('Scenario: Reorder lines within a container', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const span1Key = keyGenerator()
    const line2Key = keyGenerator()
    const span2Key = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      children: <ContainerPlugin containers={codeBlockContainer} />,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: line1Key,
              children: [
                {_type: 'span', _key: span1Key, text: 'first', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
            {
              _type: 'block',
              _key: line2Key,
              children: [
                {_type: 'span', _key: span2Key, text: 'second', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ],
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: line2Key,
              children: [
                {_type: 'span', _key: span2Key, text: 'second', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
            {
              _type: 'block',
              _key: line1Key,
              children: [
                {_type: 'span', _key: span1Key, text: 'first', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: line2Key,
              children: [
                {_type: 'span', _key: span2Key, text: 'second', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
            {
              _type: 'block',
              _key: line1Key,
              children: [
                {_type: 'span', _key: span1Key, text: 'first', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ])
    })
  })

  test('Scenario: Replace a container with a text block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      children: <ContainerPlugin containers={codeBlockContainer} />,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'code here', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ],
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'block',
          _key: 'newBlock',
          children: [
            {
              _type: 'span',
              _key: 'newSpan',
              text: 'now a paragraph',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'newBlock',
          children: [
            {
              _type: 'span',
              _key: 'newSpan',
              text: 'now a paragraph',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Replace a text block with a container', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      children: <ContainerPlugin containers={codeBlockContainer} />,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'paragraph', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'code-block',
          _key: 'cb',
          lines: [
            {
              _type: 'block',
              _key: 'ln',
              children: [
                {_type: 'span', _key: 'sp', text: 'now code', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'code-block',
          _key: 'cb',
          lines: [
            {
              _type: 'block',
              _key: 'ln',
              children: [
                {_type: 'span', _key: 'sp', text: 'now code', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ])
    })
  })

  test('Scenario: Change a line inside a container (keyed diff)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      children: <ContainerPlugin containers={codeBlockContainer} />,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'original', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ],
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'updated', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'updated', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ])
    })
  })

  test('Scenario: Update non-block-array property on a container', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      children: <ContainerPlugin containers={calloutContainer} />,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          tone: 'info',
          content: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'callout',
          _key: calloutKey,
          tone: 'warning',
          content: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          tone: 'warning',
          content: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('Scenario: Deep-nested update inside a table cell', async () => {
    const deepSchema = defineSchema({
      blockObjects: [
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
    const tableContainers = [
      defineContainer<typeof deepSchema>({
        scope: '$..table',
        field: 'rows',
        render: ({children}) => <>{children}</>,
      }),
      defineContainer<typeof deepSchema>({
        scope: '$..table.row',
        field: 'cells',
        render: ({children}) => <>{children}</>,
      }),
      defineContainer<typeof deepSchema>({
        scope: '$..table.row.cell',
        field: 'content',
        render: ({children}) => <>{children}</>,
      }),
    ]

    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: deepSchema,
      children: <ContainerPlugin containers={tableContainers} />,
      initialValue: [
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
                      _key: blockKey,
                      children: [
                        {_type: 'span', _key: spanKey, text: 'cell', marks: []},
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
    })

    editor.send({
      type: 'update value',
      value: [
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
                      _key: blockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: spanKey,
                          text: 'updated cell',
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
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
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
                      _key: blockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: spanKey,
                          text: 'updated cell',
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

  test('Scenario: Syncing the same container is a noop (equality check)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const spanKey = keyGenerator()

    const value = [
      {
        _type: 'code-block' as const,
        _key: codeBlockKey,
        lines: [
          {
            _type: 'block',
            _key: lineKey,
            children: [{_type: 'span', _key: spanKey, text: 'code', marks: []}],
            markDefs: [],
            style: 'code',
          },
        ],
      },
    ]

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      children: <ContainerPlugin containers={codeBlockContainer} />,
      initialValue: value,
    })

    // Send a deep clone of the same value (different references, same shape).
    editor.send({
      type: 'update value',
      value: safeParse(safeStringify(value)) as typeof value,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(value)
    })
  })

  test('Scenario: Selection is preserved when container lines change around it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const span1Key = keyGenerator()
    const line2Key = keyGenerator()
    const span2Key = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      children: <ContainerPlugin containers={codeBlockContainer} />,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: line1Key,
              children: [
                {_type: 'span', _key: span1Key, text: 'first', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
            {
              _type: 'block',
              _key: line2Key,
              children: [
                {_type: 'span', _key: span2Key, text: 'second', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ],
    })

    // Put caret inside line2
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: line2Key},
            'children',
            {_key: span2Key},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: line2Key},
            'children',
            {_key: span2Key},
          ],
          offset: 3,
        },
      },
    })

    // Remotely add a new line at the END (should preserve selection in line2)
    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: line1Key,
              children: [
                {_type: 'span', _key: span1Key, text: 'first', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
            {
              _type: 'block',
              _key: line2Key,
              children: [
                {_type: 'span', _key: span2Key, text: 'second', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
            {
              _type: 'block',
              _key: 'line3',
              children: [
                {_type: 'span', _key: 'span3', text: 'third', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: line1Key,
              children: [
                {_type: 'span', _key: span1Key, text: 'first', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
            {
              _type: 'block',
              _key: line2Key,
              children: [
                {_type: 'span', _key: span2Key, text: 'second', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
            {
              _type: 'block',
              _key: 'line3',
              children: [
                {_type: 'span', _key: 'span3', text: 'third', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ])
    })

    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [
          {_key: codeBlockKey},
          'lines',
          {_key: line2Key},
          'children',
          {_key: span2Key},
        ],
        offset: 3,
      },
      focus: {
        path: [
          {_key: codeBlockKey},
          'lines',
          {_key: line2Key},
          'children',
          {_key: span2Key},
        ],
        offset: 3,
      },
      backward: false,
    })
  })

  test('Scenario: Changing container type (same key, different _type)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const sharedKey = keyGenerator()
    const lineKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      children: (
        <ContainerPlugin
          containers={[...calloutContainer, ...codeBlockContainer]}
        />
      ),
      initialValue: [
        {
          _type: 'callout',
          _key: sharedKey,
          content: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
    })

    // Swap _type to code-block at the same _key, with different field name (lines vs content)
    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'code-block',
          _key: sharedKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'code-block',
          _key: sharedKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ])
    })
  })

  test('Scenario: Line key changes while editor has selection in that line (remote rewrite)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const oldLineKey = keyGenerator()
    const oldSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      children: <ContainerPlugin containers={codeBlockContainer} />,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: oldLineKey,
              children: [
                {_type: 'span', _key: oldSpanKey, text: 'code', marks: []},
              ],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ],
    })

    // Put caret inside the existing line
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: oldLineKey},
            'children',
            {_key: oldSpanKey},
          ],
          offset: 2,
        },
        focus: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: oldLineKey},
            'children',
            {_key: oldSpanKey},
          ],
          offset: 2,
        },
      },
    })

    // Remote replaces the line with a new one (fresh keys). The editor must not crash.
    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: 'newLineKey',
              children: [
                {
                  _type: 'span',
                  _key: 'newSpanKey',
                  text: 'brand new',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: 'newLineKey',
              children: [
                {
                  _type: 'span',
                  _key: 'newSpanKey',
                  text: 'brand new',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ])
    })
  })

  test('Scenario: Insert a block object INSIDE the container lines array (heterogeneous children)', async () => {
    // Schema where a code-block's lines can be blocks OR inline-ish block objects
    const heteroSchema = defineSchema({
      blockObjects: [
        {name: 'separator'},
        {
          name: 'code-block',
          fields: [
            {
              name: 'lines',
              type: 'array',
              of: [{type: 'block'}, {type: 'separator'}],
            },
          ],
        },
      ],
    })

    const heteroContainer = [
      defineContainer<typeof heteroSchema>({
        scope: '$..code-block',
        field: 'lines',
        render: ({children}) => <>{children}</>,
      }),
    ]

    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: heteroSchema,
      children: <ContainerPlugin containers={heteroContainer} />,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'line one', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'line one', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {_type: 'separator', _key: 'sepKey'},
          ],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'line one', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {_type: 'separator', _key: 'sepKey'},
          ],
        },
      ])
    })
  })
})
