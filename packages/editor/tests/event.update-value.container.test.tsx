import {applyAll, type Patch} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {makeDiff, makePatches, stringifyPatches} from '@sanity/diff-match-patch'
import {describe, expect, test, vi} from 'vitest'
import type {PortableTextBlock} from '../src'
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

  test('Scenario: A repeated container key with a keyless span in the later container publishes patches that replay to the editor value', async () => {
    const keyGenerator = createTestKeyGenerator()
    const bazKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const fooKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barKey = keyGenerator()
    const incoming = [
      callout(calloutKey, [textBlock(fooKey, fooSpanKey, 'foo')]),
      callout(calloutKey, [keylessTextBlock(barKey, 'bar')]),
      textBlock(bazKey, bazSpanKey, 'baz'),
    ]
    const patches: Array<Patch> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [textBlock(bazKey, bazSpanKey, 'baz')],
      children: (
        <>
          <NodePlugin nodes={calloutContainer} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
        </>
      ),
    })

    editor.send({type: 'update value', value: incoming})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        callout(calloutKey, [textBlock(fooKey, fooSpanKey, 'foo')]),
        callout('k8', [textBlock(barKey, 'k9', 'bar')]),
        textBlock(bazKey, bazSpanKey, 'baz'),
      ])
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    const sentinelPatch: Patch = {
      type: 'diffMatchPatch',
      path: [{_key: bazKey}, 'children', {_key: bazSpanKey}, 'text'],
      value: stringifyPatches(makePatches(makeDiff('baz', 'baz!'))),
      origin: 'local',
    }

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {type: 'set', path: [1, '_key'], value: 'k8', origin: 'local'},
        {
          type: 'set',
          path: [
            {_key: 'k8'},
            'content',
            {_key: barKey},
            'children',
            0,
            '_key',
          ],
          value: 'k9',
          origin: 'local',
        },
        sentinelPatch,
      ])
    })
    expect(applyAll(incoming, patches)).toEqual(
      editor.getSnapshot().context.value,
    )
    expect(editor.getSnapshot().context.value).toEqual([
      callout(calloutKey, [textBlock(fooKey, fooSpanKey, 'foo')]),
      callout('k8', [textBlock(barKey, 'k9', 'bar')]),
      textBlock(bazKey, bazSpanKey, 'baz!'),
    ])
  })

  test('Scenario: A repeated container key whose lines also repeat a key, with a keyless span in the later container, publishes patches that replay to the editor value', async () => {
    const keyGenerator = createTestKeyGenerator()
    const bazKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const lineKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const incoming = [
      callout(calloutKey, [textBlock(lineKey, fooSpanKey, 'foo')]),
      callout(calloutKey, [keylessTextBlock(lineKey, 'bar')]),
      textBlock(bazKey, bazSpanKey, 'baz'),
    ]
    const patches: Array<Patch> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [textBlock(bazKey, bazSpanKey, 'baz')],
      children: (
        <>
          <NodePlugin nodes={calloutContainer} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
        </>
      ),
    })

    editor.send({type: 'update value', value: incoming})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        callout(calloutKey, [textBlock(lineKey, fooSpanKey, 'foo')]),
        callout('k7', [textBlock(lineKey, 'k8', 'bar')]),
        textBlock(bazKey, bazSpanKey, 'baz'),
      ])
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    const sentinelPatch: Patch = {
      type: 'diffMatchPatch',
      path: [{_key: bazKey}, 'children', {_key: bazSpanKey}, 'text'],
      value: stringifyPatches(makePatches(makeDiff('baz', 'baz!'))),
      origin: 'local',
    }

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {type: 'set', path: [1, '_key'], value: 'k7', origin: 'local'},
        {
          type: 'set',
          path: [
            {_key: 'k7'},
            'content',
            {_key: lineKey},
            'children',
            0,
            '_key',
          ],
          value: 'k8',
          origin: 'local',
        },
        sentinelPatch,
      ])
    })
    expect(applyAll(incoming, patches)).toEqual(
      editor.getSnapshot().context.value,
    )
    expect(editor.getSnapshot().context.value).toEqual([
      callout(calloutKey, [textBlock(lineKey, fooSpanKey, 'foo')]),
      callout('k7', [textBlock(lineKey, 'k8', 'bar')]),
      textBlock(bazKey, bazSpanKey, 'baz!'),
    ])
  })

  test('Scenario: A repeated container key with a keyless span two containers deep in the later container publishes patches that replay to the editor value', async () => {
    const nestedCalloutSchema = defineSchema({
      blockObjects: [
        {
          name: 'callout',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [
                {type: 'block'},
                {
                  type: 'object',
                  name: 'callout',
                  fields: [
                    {name: 'content', type: 'array', of: [{type: 'block'}]},
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
    const keyGenerator = createTestKeyGenerator()
    const bazKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const fooKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const innerCalloutKey = keyGenerator()
    const barKey = keyGenerator()
    const incoming = [
      callout(calloutKey, [textBlock(fooKey, fooSpanKey, 'foo')]),
      callout(calloutKey, [
        callout(innerCalloutKey, [keylessTextBlock(barKey, 'bar')]),
      ]),
      textBlock(bazKey, bazSpanKey, 'baz'),
    ]
    const patches: Array<Patch> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: nestedCalloutSchema,
      initialValue: [textBlock(bazKey, bazSpanKey, 'baz')],
      children: (
        <>
          <NodePlugin nodes={calloutContainer} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
        </>
      ),
    })

    editor.send({type: 'update value', value: incoming})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        callout(calloutKey, [textBlock(fooKey, fooSpanKey, 'foo')]),
        callout('k9', [
          callout(innerCalloutKey, [textBlock(barKey, 'k10', 'bar')]),
        ]),
        textBlock(bazKey, bazSpanKey, 'baz'),
      ])
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    const sentinelPatch: Patch = {
      type: 'diffMatchPatch',
      path: [{_key: bazKey}, 'children', {_key: bazSpanKey}, 'text'],
      value: stringifyPatches(makePatches(makeDiff('baz', 'baz!'))),
      origin: 'local',
    }

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {type: 'set', path: [1, '_key'], value: 'k9', origin: 'local'},
        {
          type: 'set',
          path: [
            {_key: 'k9'},
            'content',
            {_key: innerCalloutKey},
            'content',
            {_key: barKey},
            'children',
            0,
            '_key',
          ],
          value: 'k10',
          origin: 'local',
        },
        sentinelPatch,
      ])
    })
    expect(applyAll(incoming, patches)).toEqual(
      editor.getSnapshot().context.value,
    )
    expect(editor.getSnapshot().context.value).toEqual([
      callout(calloutKey, [textBlock(fooKey, fooSpanKey, 'foo')]),
      callout('k9', [
        callout(innerCalloutKey, [textBlock(barKey, 'k10', 'bar')]),
      ]),
      textBlock(bazKey, bazSpanKey, 'baz!'),
    ])
  })

  test('Scenario: Repeated block keys and a keyless span inside Portable Text in a non-container field are left as they are', async () => {
    const quoteSchema = defineSchema({
      blockObjects: [
        {
          name: 'quote',
          fields: [{name: 'body', type: 'array', of: [{type: 'block'}]}],
        },
      ],
    })
    const keyGenerator = createTestKeyGenerator()
    const bazKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const quoteKey = keyGenerator()
    const lineKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const incoming = [
      {
        _type: 'quote',
        _key: quoteKey,
        body: [
          textBlock(lineKey, fooSpanKey, 'foo'),
          keylessTextBlock(lineKey, 'bar'),
        ],
      },
      textBlock(bazKey, bazSpanKey, 'baz'),
    ]
    const patches: Array<Patch> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: quoteSchema,
      initialValue: [textBlock(bazKey, bazSpanKey, 'baz')],
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

    editor.send({type: 'update value', value: incoming})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'quote',
          _key: quoteKey,
          body: [
            textBlock(lineKey, fooSpanKey, 'foo'),
            keylessTextBlock(lineKey, 'bar'),
          ],
        },
        textBlock(bazKey, bazSpanKey, 'baz'),
      ])
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    const sentinelPatch: Patch = {
      type: 'diffMatchPatch',
      path: [{_key: bazKey}, 'children', {_key: bazSpanKey}, 'text'],
      value: stringifyPatches(makePatches(makeDiff('baz', 'baz!'))),
      origin: 'local',
    }

    await vi.waitFor(() => {
      expect(patches).toEqual([sentinelPatch])
    })
    expect(applyAll(incoming, patches)).toEqual(
      editor.getSnapshot().context.value,
    )
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'quote',
        _key: quoteKey,
        body: [
          textBlock(lineKey, fooSpanKey, 'foo'),
          keylessTextBlock(lineKey, 'bar'),
        ],
      },
      textBlock(bazKey, bazSpanKey, 'baz!'),
    ])
  })
})

function textBlock(
  key: string,
  spanKey: string,
  text: string,
): PortableTextBlock {
  return {
    _type: 'block',
    _key: key,
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
    markDefs: [],
    style: 'normal',
  }
}

function keylessTextBlock(key: string, text: string): PortableTextBlock {
  return {
    _type: 'block',
    _key: key,
    children: [{_type: 'span', text, marks: []}],
    markDefs: [],
    style: 'normal',
  }
}

function callout(
  key: string,
  content: Array<PortableTextBlock>,
): PortableTextBlock {
  return {_type: 'callout', _key: key, content}
}
