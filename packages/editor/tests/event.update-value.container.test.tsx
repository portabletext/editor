import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import type {MutationEvent, Patch} from '../src'
import {safeParse, safeStringify} from '../src/internal-utils/safe-json'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {NodePlugin} from '../src/plugins/plugin.node'
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
  defineContainer({
    type: 'callout',
    arrayField: 'content',
    render: ({children}) => <>{children}</>,
  }),
]

const codeBlockContainer = [
  defineContainer({
    type: 'code-block',
    arrayField: 'lines',
    render: ({children}) => <>{children}</>,
  }),
]

const tableSchemaDefinition = defineSchema({
  blockObjects: [
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

describe('event.update value with containers', () => {
  test('Scenario: Update text inside a container line', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      children: <NodePlugin nodes={calloutContainer} />,
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: goodbye'].join('\n'),
      )
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
      children: <NodePlugin nodes={codeBlockContainer} />,
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'CODE-BLOCK:',
          '  B style="code": first',
          '  B style="code": second',
        ].join('\n'),
      )
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
      children: <NodePlugin nodes={codeBlockContainer} />,
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CODE-BLOCK:', '  B style="code": first'].join('\n'),
      )
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
      children: <NodePlugin nodes={codeBlockContainer} />,
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'CODE-BLOCK:',
          '  B style="code": second',
          '  B style="code": first',
        ].join('\n'),
      )
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
      children: <NodePlugin nodes={codeBlockContainer} />,
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: now a paragraph',
      )
    })
  })

  test('Scenario: Replace a text block with a container', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      children: <NodePlugin nodes={codeBlockContainer} />,
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CODE-BLOCK:', '  B style="code": now code'].join('\n'),
      )
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
      children: <NodePlugin nodes={codeBlockContainer} />,
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CODE-BLOCK:', '  B style="code": updated'].join('\n'),
      )
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
      children: <NodePlugin nodes={calloutContainer} />,
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: hello'].join('\n'),
      )
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

    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: deepSchema,
      children: <NodePlugin nodes={tableContainers} />,
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['TABLE:', '  ROW:', '    CELL:', '      B: updated cell'].join('\n'),
      )
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
      children: <NodePlugin nodes={codeBlockContainer} />,
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
      children: <NodePlugin nodes={codeBlockContainer} />,
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'CODE-BLOCK:',
          '  B style="code": first',
          '  B style="code": sec|ond',
          '  B style="code": third',
        ].join('\n'),
      )
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
        <NodePlugin nodes={[...calloutContainer, ...codeBlockContainer]} />
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CODE-BLOCK:', '  B style="code": hello'].join('\n'),
      )
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
      children: <NodePlugin nodes={codeBlockContainer} />,
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CODE-BLOCK:', '  B style="code": brand new'].join('\n'),
      )
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
      defineContainer({
        type: 'code-block',
        arrayField: 'lines',
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
      children: <NodePlugin nodes={heteroContainer} />,
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CODE-BLOCK:', '  B: line one', '  {SEPARATOR}'].join('\n'),
      )
    })
  })
})

describe('event.update value with containers: intake repairs', () => {
  test('Scenario: a loaded container with a missing child array materializes its default child in one repair mutation', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const patches: Array<Patch> = []
    const mutations: Array<MutationEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      children: (
        <>
          <NodePlugin nodes={calloutContainer} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
              if (event.type === 'mutation') {
                mutations.push(event)
              }
            }}
          />
        </>
      ),
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
        } as never,
      ],
    })

    const repairPatch = {
      type: 'set',
      path: [{_key: calloutKey}, 'content'],
      value: [
        {
          _type: 'block',
          _key: 'k3',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
        },
      ],
      origin: 'local',
    }

    await vi.waitFor(() => {
      expect(patches).toEqual([repairPatch])
      expect(mutations.map((mutation) => mutation.patches)).toEqual([
        [repairPatch],
      ])
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: repairPatch.value,
        },
      ])
    })

    // The host echoes back the pre-repair snapshot: `content` is still
    // missing. An unrelated new sibling block makes this a genuine new
    // value, so the machine reconciles it instead of no-opping, giving a
    // deterministic point to prove the echo alone minted nothing further.
    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'callout',
          _key: calloutKey,
        } as never,
        {
          _key: 'sibling',
          _type: 'block',
          children: [
            {_key: 'siblingSpan', _type: 'span', text: 'sibling', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(
      () => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'callout',
            _key: calloutKey,
            content: repairPatch.value,
          },
          {
            _key: 'sibling',
            _type: 'block',
            children: [
              {_key: 'siblingSpan', _type: 'span', text: 'sibling', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      },
      {timeout: 5000},
    )

    // No second repair: the echo was recognized, not re-repaired.
    expect(patches).toEqual([repairPatch])
    await vi.waitFor(() => {
      expect(mutations.map((mutation) => mutation.patches)).toEqual([
        [repairPatch],
      ])
    })
  })

  test('Scenario: a loaded container with a deep missing child key is repaired once, echo swallowed at block granularity', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const blockKey = keyGenerator()
    const patches: Array<Patch> = []
    const mutations: Array<MutationEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: tableSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={tableContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
              if (event.type === 'mutation') {
                mutations.push(event)
              }
            }}
          />
        </>
      ),
      initialValue: [
        deepTable({tableKey, rowKey, cellKey, blockKey, text: 'deep'}),
      ],
    })

    const repairPatch = deepSpanKeyRepairPatch({
      tableKey,
      rowKey,
      cellKey,
      blockKey,
      mintedKey: 'k6',
    })

    const repairedTable = deepTable({
      tableKey,
      rowKey,
      cellKey,
      blockKey,
      text: 'deep',
      spanKey: 'k6',
    })

    await vi.waitFor(() => {
      expect(patches).toEqual([repairPatch])
      expect(mutations.map((mutation) => mutation.patches)).toEqual([
        [repairPatch],
      ])
      expect(editor.getSnapshot().context.value).toEqual([repairedTable])
    })

    // The host echoes back the pre-repair snapshot: the deep span is
    // still keyless. An unrelated new sibling block makes this a genuine
    // new value, so the machine reconciles it instead of no-opping.
    editor.send({
      type: 'update value',
      value: [
        deepTable({tableKey, rowKey, cellKey, blockKey, text: 'deep'}),
        {
          _key: 'sibling',
          _type: 'block',
          children: [
            {_key: 'siblingSpan', _type: 'span', text: 'sibling', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(
      () => {
        expect(editor.getSnapshot().context.value).toEqual([
          repairedTable,
          {
            _key: 'sibling',
            _type: 'block',
            children: [
              {_key: 'siblingSpan', _type: 'span', text: 'sibling', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      },
      {timeout: 5000},
    )

    // No second repair: the echo was recognized at the top-level
    // container's own granularity, not re-repaired.
    expect(patches).toEqual([repairPatch])
    await vi.waitFor(() => {
      expect(mutations.map((mutation) => mutation.patches)).toEqual([
        [repairPatch],
      ])
    })
  })

  test("Scenario: two sibling containers with deep defects, one host-repaired and one still echoing, flush only the still-echoing container's repair", async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableAKey = keyGenerator()
    const rowAKey = keyGenerator()
    const cellAKey = keyGenerator()
    const blockAKey = keyGenerator()
    const tableBKey = keyGenerator()
    const rowBKey = keyGenerator()
    const cellBKey = keyGenerator()
    const blockBKey = keyGenerator()
    const patches: Array<Patch> = []
    const mutations: Array<MutationEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: tableSchemaDefinition,
      readOnly: true,
      children: (
        <>
          <NodePlugin nodes={tableContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
              if (event.type === 'mutation') {
                mutations.push(event)
              }
            }}
          />
        </>
      ),
      initialValue: [
        deepTable({
          tableKey: tableAKey,
          rowKey: rowAKey,
          cellKey: cellAKey,
          blockKey: blockAKey,
          text: 'alpha',
        }),
        deepTable({
          tableKey: tableBKey,
          rowKey: rowBKey,
          cellKey: cellBKey,
          blockKey: blockBKey,
          text: 'beta',
        }),
      ],
    })

    const repairPatchA = deepSpanKeyRepairPatch({
      tableKey: tableAKey,
      rowKey: rowAKey,
      cellKey: cellAKey,
      blockKey: blockAKey,
      mintedKey: 'k10',
    })
    const repairPatchB = deepSpanKeyRepairPatch({
      tableKey: tableBKey,
      rowKey: rowBKey,
      cellKey: cellBKey,
      blockKey: blockBKey,
      mintedKey: 'k11',
    })

    await vi.waitFor(() => {
      expect(patches).toEqual([repairPatchA, repairPatchB])
      expect(editor.getSnapshot().context.value).toEqual([
        deepTable({
          tableKey: tableAKey,
          rowKey: rowAKey,
          cellKey: cellAKey,
          blockKey: blockAKey,
          text: 'alpha',
          spanKey: 'k10',
        }),
        deepTable({
          tableKey: tableBKey,
          rowKey: rowBKey,
          cellKey: cellBKey,
          blockKey: blockBKey,
          text: 'beta',
          spanKey: 'k11',
        }),
      ])
    })

    // The host (e.g. Sanity Studio) persisted its own key for table A's
    // deep span, but never picked up table B's repair: table B still
    // echoes its pre-repair keyless shape. A control block makes this a
    // new value, so the machine reconciles it instead of no-opping.
    editor.send({
      type: 'update value',
      value: [
        deepTable({
          tableKey: tableAKey,
          rowKey: rowAKey,
          cellKey: cellAKey,
          blockKey: blockAKey,
          text: 'alpha',
          spanKey: 'hostKey',
        }),
        deepTable({
          tableKey: tableBKey,
          rowKey: rowBKey,
          cellKey: cellBKey,
          blockKey: blockBKey,
          text: 'beta',
        }),
        {
          _key: 'control',
          _type: 'block',
          children: [
            {_key: 'controlSpan', _type: 'span', text: 'control', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    const settledValue = [
      deepTable({
        tableKey: tableAKey,
        rowKey: rowAKey,
        cellKey: cellAKey,
        blockKey: blockAKey,
        text: 'alpha',
        spanKey: 'hostKey',
      }),
      deepTable({
        tableKey: tableBKey,
        rowKey: rowBKey,
        cellKey: cellBKey,
        blockKey: blockBKey,
        text: 'beta',
        spanKey: 'k11',
      }),
      {
        _key: 'control',
        _type: 'block',
        children: [
          {_key: 'controlSpan', _type: 'span', text: 'control', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(settledValue)
    })

    // No re-repair of either table: table A's repair was superseded by
    // the host's own key, not re-applied, and table B's echo was
    // recognized, not re-repaired.
    expect(patches).toEqual([repairPatchA, repairPatchB])

    editor.send({type: 'update readOnly', readOnly: false})

    // Only table B's repair flushes: table A's repair bulk was dropped as
    // superseded once the host's own key for table A landed.
    await vi.waitFor(() => {
      expect(mutations.map((mutation) => mutation.patches)).toEqual([
        [repairPatchB],
      ])
    })

    expect(editor.getSnapshot().context.value).toEqual(settledValue)
  })

  test('Scenario: a stale echo of a keyless container with a deep typeless block delivers every repair patch, none dropped', async () => {
    const keyGenerator = createTestKeyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const patches: Array<Patch> = []
    const mutations: Array<MutationEvent> = []

    // The table itself arrives without a `_key`, and the block nested
    // three levels down (table > row > cell > block) arrives without a
    // `_type` on top of that. `normalizeNode`'s missing-`_type` arm (the
    // second per-node arm) fires before its missing-`_key` arm (the
    // fourth), so the deep block gets its `_type` set, then its own
    // `_key` minted, while the table is still keyless: both of those
    // repair patches address the deep block through the table's own
    // still-numeric root index, so the mutation batcher can't resolve
    // either one to the table's block key yet. Only the table's own
    // `_key` mint, third and last, resolves once applied. That gives the
    // unresolved-then-resolved repair pair `dropSupersededRepairs` must
    // never let the cull silently swallow.
    const rawTable = {
      _type: 'table',
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
                  children: [{_type: 'span', text: 'deep', marks: []}],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ],
    } as never

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: tableSchemaDefinition,
      readOnly: true,
      children: (
        <>
          <NodePlugin nodes={tableContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
              if (event.type === 'mutation') {
                mutations.push(event)
              }
            }}
          />
        </>
      ),
      initialValue: [rawTable],
    })

    const deepTypeRepairPatch = {
      type: 'set',
      path: [
        0,
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        0,
        '_type',
      ],
      value: 'block',
      origin: 'local',
    }
    const deepKeyRepairPatch = {
      type: 'set',
      path: [
        0,
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        0,
        '_key',
      ],
      value: 'k4',
      origin: 'local',
    }
    const tableKeyRepairPatch = {
      type: 'set',
      path: [0, '_key'],
      value: 'k5',
      origin: 'local',
    }

    await vi.waitFor(() => {
      expect(patches).toEqual([
        deepTypeRepairPatch,
        deepKeyRepairPatch,
        tableKeyRepairPatch,
      ])
    })

    const repairedTable = {
      _type: 'table',
      _key: 'k5',
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
                  _key: 'k4',
                  children: [{_type: 'span', text: 'deep', marks: []}],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ],
    }

    expect(editor.getSnapshot().context.value).toEqual([repairedTable])

    // The host echoes back the pre-repair snapshot verbatim: the table is
    // still keyless and the deep block still lacks a `_type`. A control
    // block makes this a genuine new value, not a no-op.
    editor.send({
      type: 'update value',
      value: [
        rawTable,
        {
          _key: 'control',
          _type: 'block',
          children: [
            {_key: 'controlSpan', _type: 'span', text: 'control', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        repairedTable,
        {
          _key: 'control',
          _type: 'block',
          children: [
            {_key: 'controlSpan', _type: 'span', text: 'control', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    // The echo was recognized: no fourth repair patch.
    expect(patches).toEqual([
      deepTypeRepairPatch,
      deepKeyRepairPatch,
      tableKeyRepairPatch,
    ])

    editor.send({type: 'update readOnly', readOnly: false})

    // Every repair patch flushes once editable, none dropped by the
    // settle the stale echo triggered.
    await vi.waitFor(() => {
      expect(mutations.flatMap((mutation) => mutation.patches)).toEqual([
        deepTypeRepairPatch,
        deepKeyRepairPatch,
        tableKeyRepairPatch,
      ])
    })
  })
})

function deepTable(args: {
  tableKey: string
  rowKey: string
  cellKey: string
  blockKey: string
  text: string
  spanKey?: string
}) {
  return {
    _type: 'table',
    _key: args.tableKey,
    rows: [
      {
        _type: 'row',
        _key: args.rowKey,
        cells: [
          {
            _type: 'cell',
            _key: args.cellKey,
            content: [
              {
                _type: 'block',
                _key: args.blockKey,
                children: [
                  args.spanKey === undefined
                    ? ({_type: 'span', text: args.text, marks: []} as never)
                    : {
                        _type: 'span',
                        _key: args.spanKey,
                        text: args.text,
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
  }
}

function deepSpanKeyRepairPatch(args: {
  tableKey: string
  rowKey: string
  cellKey: string
  blockKey: string
  mintedKey: string
}) {
  return {
    type: 'set',
    path: [
      {_key: args.tableKey},
      'rows',
      {_key: args.rowKey},
      'cells',
      {_key: args.cellKey},
      'content',
      {_key: args.blockKey},
      'children',
      0,
      '_key',
    ],
    value: args.mintedKey,
    origin: 'local',
  }
}
