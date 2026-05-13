import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {userEvent} from 'vitest/browser'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'
import {toTextspec} from '../test-utils/to-textspec'

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'code-block',
      fields: [{name: 'lines', type: 'array', of: [{type: 'block'}]}],
    },
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'image'}],
        },
      ],
    },
    {name: 'image'},
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

const containers = [
  defineContainer<typeof schemaDefinition>({
    type: 'code-block',
    childField: 'lines',
    render: ({attributes, children}) => <pre {...attributes}>{children}</pre>,
  }),
  defineContainer<typeof schemaDefinition>({
    type: 'callout',
    childField: 'content',
    render: ({attributes, children}) => <div {...attributes}>{children}</div>,
  }),
  defineContainer<typeof schemaDefinition>({
    type: 'table',
    childField: 'rows',
    render: ({attributes, children}) => <div {...attributes}>{children}</div>,
  }),
  defineContainer<typeof schemaDefinition>({
    type: 'row',
    childField: 'cells',
    render: ({attributes, children}) => <div {...attributes}>{children}</div>,
  }),
  defineContainer<typeof schemaDefinition>({
    type: 'cell',
    childField: 'content',
    render: ({attributes, children}) => <div {...attributes}>{children}</div>,
  }),
]

describe('cross-container range delete', () => {
  test('root text block -> code-block line', async () => {
    const keyGenerator = createTestKeyGenerator()
    const textBlockKey = keyGenerator()
    const textSpanKey = keyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const lineSpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: textBlockKey,
          children: [
            {_type: 'span', _key: textSpanKey, text: 'foo', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: lineSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: textBlockKey}, 'children', {_key: textSpanKey}],
          offset: 0,
        },
        focus: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: lineKey},
            'children',
            {_key: lineSpanKey},
          ],
          offset: 2,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['B: |', 'CODE-BLOCK:', '  B: r'].join('\n'),
    )
  })

  test('code-block line -> root text block below', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const lineSpanKey = keyGenerator()
    const textBlockKey = keyGenerator()
    const textSpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: lineSpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: textBlockKey,
          children: [
            {_type: 'span', _key: textSpanKey, text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: lineKey},
            'children',
            {_key: lineSpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [{_key: textBlockKey}, 'children', {_key: textSpanKey}],
          offset: 2,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CODE-BLOCK:', '  B: f|', 'B: r'].join('\n'),
    )
  })

  test('across three root siblings with a container in the middle merges outer text blocks (same parent)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const firstTextKey = keyGenerator()
    const firstSpanKey = keyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const lineSpanKey = keyGenerator()
    const lastTextKey = keyGenerator()
    const lastSpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: firstTextKey,
          children: [
            {_type: 'span', _key: firstSpanKey, text: 'foo', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: lineSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: lastTextKey,
          children: [
            {_type: 'span', _key: lastSpanKey, text: 'baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: firstTextKey}, 'children', {_key: firstSpanKey}],
          offset: 2,
        },
        focus: {
          path: [{_key: lastTextKey}, 'children', {_key: lastSpanKey}],
          offset: 2,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: fo|z')
  })

  test('across two sibling containers (callout - code-block)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const calloutBlockKey = keyGenerator()
    const calloutSpanKey = keyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const lineSpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: calloutBlockKey,
              children: [
                {_type: 'span', _key: calloutSpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: lineSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: calloutBlockKey},
            'children',
            {_key: calloutSpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: lineKey},
            'children',
            {_key: lineSpanKey},
          ],
          offset: 2,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CALLOUT:', '  B: f|', 'CODE-BLOCK:', '  B: r'].join('\n'),
    )
  })

  test('within same container across two lines still merges (same-parent path unchanged)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const firstLineKey = keyGenerator()
    const firstLineSpanKey = keyGenerator()
    const secondLineKey = keyGenerator()
    const secondLineSpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: firstLineKey,
              children: [
                {
                  _type: 'span',
                  _key: firstLineSpanKey,
                  text: 'foo',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: secondLineKey,
              children: [
                {
                  _type: 'span',
                  _key: secondLineSpanKey,
                  text: 'bar',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: firstLineKey},
            'children',
            {_key: firstLineSpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: secondLineKey},
            'children',
            {_key: secondLineSpanKey},
          ],
          offset: 2,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CODE-BLOCK:', '  B: f|r'].join('\n'),
    )
  })

  test('range selection covering a root void block merges outer text blocks (same parent)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const firstTextKey = keyGenerator()
    const firstSpanKey = keyGenerator()
    const imageKey = keyGenerator()
    const lastTextKey = keyGenerator()
    const lastSpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: firstTextKey,
          children: [
            {_type: 'span', _key: firstSpanKey, text: 'foo', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {_type: 'image', _key: imageKey},
        {
          _type: 'block',
          _key: lastTextKey,
          children: [
            {_type: 'span', _key: lastSpanKey, text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: firstTextKey}, 'children', {_key: firstSpanKey}],
          offset: 2,
        },
        focus: {
          path: [{_key: lastTextKey}, 'children', {_key: lastSpanKey}],
          offset: 1,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: fo|ar')
  })

  test('Backspace at start of an empty container line below a text block unwraps the line', async () => {
    const keyGenerator = createTestKeyGenerator()
    const textBlockKey = keyGenerator()
    const textSpanKey = keyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const lineSpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: textBlockKey,
          children: [
            {_type: 'span', _key: textSpanKey, text: 'foo', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: lineSpanKey, text: '', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: lineKey},
            'children',
            {_key: lineSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: lineKey},
            'children',
            {_key: lineSpanKey},
          ],
          offset: 0,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['B: foo', 'B: |'].join('\n'),
    )
  })

  test('start inside multi-line callout removes trailing lines, leaves callout shell with leading content', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
    const line2Key = keyGenerator()
    const line2SpanKey = keyGenerator()
    const line3Key = keyGenerator()
    const line3SpanKey = keyGenerator()
    const textBlockKey = keyGenerator()
    const textSpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: line1Key,
              children: [
                {_type: 'span', _key: line1SpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: line2Key,
              children: [
                {_type: 'span', _key: line2SpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: line3Key,
              children: [
                {_type: 'span', _key: line3SpanKey, text: 'baz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: textBlockKey,
          children: [
            {_type: 'span', _key: textSpanKey, text: 'qux', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: line1Key},
            'children',
            {_key: line1SpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [{_key: textBlockKey}, 'children', {_key: textSpanKey}],
          offset: 2,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CALLOUT:', '  B: f|', 'B: x'].join('\n'),
    )
  })

  test('end inside multi-line callout removes leading lines, leaves callout shell with trailing content', async () => {
    const keyGenerator = createTestKeyGenerator()
    const textBlockKey = keyGenerator()
    const textSpanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
    const line2Key = keyGenerator()
    const line2SpanKey = keyGenerator()
    const line3Key = keyGenerator()
    const line3SpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: textBlockKey,
          children: [
            {_type: 'span', _key: textSpanKey, text: 'foo', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: line1Key,
              children: [
                {_type: 'span', _key: line1SpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: line2Key,
              children: [
                {_type: 'span', _key: line2SpanKey, text: 'baz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: line3Key,
              children: [
                {_type: 'span', _key: line3SpanKey, text: 'qux', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: textBlockKey}, 'children', {_key: textSpanKey}],
          offset: 1,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: line3Key},
            'children',
            {_key: line3SpanKey},
          ],
          offset: 2,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['B: f|', 'CALLOUT:', '  B: x'].join('\n'),
    )
  })

  test('cross-parent selection removes fully-covered root sibling between containers', async () => {
    const keyGenerator = createTestKeyGenerator()
    const callout1Key = keyGenerator()
    const callout1LineKey = keyGenerator()
    const callout1SpanKey = keyGenerator()
    const middleTextKey = keyGenerator()
    const middleSpanKey = keyGenerator()
    const callout2Key = keyGenerator()
    const callout2LineKey = keyGenerator()
    const callout2SpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: callout1Key,
          content: [
            {
              _type: 'block',
              _key: callout1LineKey,
              children: [
                {_type: 'span', _key: callout1SpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: middleTextKey,
          children: [
            {_type: 'span', _key: middleSpanKey, text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: callout2Key,
          content: [
            {
              _type: 'block',
              _key: callout2LineKey,
              children: [
                {_type: 'span', _key: callout2SpanKey, text: 'baz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: callout1Key},
            'content',
            {_key: callout1LineKey},
            'children',
            {_key: callout1SpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: callout2Key},
            'content',
            {_key: callout2LineKey},
            'children',
            {_key: callout2SpanKey},
          ],
          offset: 2,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CALLOUT:', '  B: f|', 'CALLOUT:', '  B: z'].join('\n'),
    )
  })

  test('hanging range across a callout removes the callout entirely', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const calloutBlockKey = keyGenerator()
    const calloutSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: fooBlockKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: calloutBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: calloutSpanKey,
                  text: 'hello',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: barBlockKey,
          children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
          offset: 0,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: |bar')
  })
})

const tableSchemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
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
                          of: [
                            {type: 'block'},
                            {
                              type: 'object',
                              name: 'callout',
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
        },
      ],
    },
  ],
})

const tableContainers = [
  defineContainer<typeof tableSchemaDefinition>({
    type: 'table',
    childField: 'rows',
    render: ({attributes, children}) => <div {...attributes}>{children}</div>,
  }),
  defineContainer<typeof tableSchemaDefinition>({
    type: 'row',
    childField: 'cells',
    render: ({attributes, children}) => <div {...attributes}>{children}</div>,
  }),
  defineContainer<typeof tableSchemaDefinition>({
    type: 'cell',
    childField: 'content',
    render: ({attributes, children}) => <div {...attributes}>{children}</div>,
  }),
  defineContainer<typeof tableSchemaDefinition>({
    type: 'callout',
    childField: 'content',
    render: ({attributes, children}) => <div {...attributes}>{children}</div>,
  }),
]

describe('cross-container range delete: deep structures', () => {
  test('start mid-line in callout-in-cell-in-table, end in root text below table', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const calloutKey = keyGenerator()
    const lineKey = keyGenerator()
    const lineSpanKey = keyGenerator()
    const trailingLineKey = keyGenerator()
    const trailingLineSpanKey = keyGenerator()
    const trailingCellContentKey = keyGenerator()
    const trailingCellContentSpanKey = keyGenerator()
    const trailingCellKey = keyGenerator()
    const trailingCellInnerKey = keyGenerator()
    const trailingCellInnerSpanKey = keyGenerator()
    const textBlockKey = keyGenerator()
    const textSpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: tableSchemaDefinition,
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
                      _type: 'callout',
                      _key: calloutKey,
                      content: [
                        {
                          _type: 'block',
                          _key: lineKey,
                          children: [
                            {
                              _type: 'span',
                              _key: lineSpanKey,
                              text: 'foo',
                              marks: [],
                            },
                          ],
                          markDefs: [],
                          style: 'normal',
                        },
                        {
                          _type: 'block',
                          _key: trailingLineKey,
                          children: [
                            {
                              _type: 'span',
                              _key: trailingLineSpanKey,
                              text: 'TRAIL_LINE',
                              marks: [],
                            },
                          ],
                          markDefs: [],
                          style: 'normal',
                        },
                      ],
                    },
                    {
                      _type: 'block',
                      _key: trailingCellContentKey,
                      children: [
                        {
                          _type: 'span',
                          _key: trailingCellContentSpanKey,
                          text: 'TRAIL_CELL_CONTENT',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: trailingCellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: trailingCellInnerKey,
                      children: [
                        {
                          _type: 'span',
                          _key: trailingCellInnerSpanKey,
                          text: 'TRAIL_CELL',
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
        {
          _type: 'block',
          _key: textBlockKey,
          children: [
            {_type: 'span', _key: textSpanKey, text: 'qux', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <ContainerPlugin containers={tableContainers} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: calloutKey},
            'content',
            {_key: lineKey},
            'children',
            {_key: lineSpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [{_key: textBlockKey}, 'children', {_key: textSpanKey}],
          offset: 2,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'TABLE:',
        '  ROW:',
        '    CELL:',
        '      CALLOUT:',
        '        B: f|',
        '    CELL:',
        '      B: ',
        'B: x',
      ].join('\n'),
    )
  })

  test('start in root text, end mid-line in callout-in-cell-in-table', async () => {
    const keyGenerator = createTestKeyGenerator()
    const textBlockKey = keyGenerator()
    const textSpanKey = keyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const leadingCellKey = keyGenerator()
    const leadingCellInnerKey = keyGenerator()
    const leadingCellInnerSpanKey = keyGenerator()
    const cellKey = keyGenerator()
    const leadingCellContentKey = keyGenerator()
    const leadingCellContentSpanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const leadingLineKey = keyGenerator()
    const leadingLineSpanKey = keyGenerator()
    const lineKey = keyGenerator()
    const lineSpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: tableSchemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: textBlockKey,
          children: [
            {_type: 'span', _key: textSpanKey, text: 'foo', marks: []},
          ],
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
                  _key: leadingCellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: leadingCellInnerKey,
                      children: [
                        {
                          _type: 'span',
                          _key: leadingCellInnerSpanKey,
                          text: 'LEAD_CELL',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: leadingCellContentKey,
                      children: [
                        {
                          _type: 'span',
                          _key: leadingCellContentSpanKey,
                          text: 'LEAD_CELL_CONTENT',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    {
                      _type: 'callout',
                      _key: calloutKey,
                      content: [
                        {
                          _type: 'block',
                          _key: leadingLineKey,
                          children: [
                            {
                              _type: 'span',
                              _key: leadingLineSpanKey,
                              text: 'LEAD_LINE',
                              marks: [],
                            },
                          ],
                          markDefs: [],
                          style: 'normal',
                        },
                        {
                          _type: 'block',
                          _key: lineKey,
                          children: [
                            {
                              _type: 'span',
                              _key: lineSpanKey,
                              text: 'baz',
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
        },
      ],
      children: <ContainerPlugin containers={tableContainers} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: textBlockKey}, 'children', {_key: textSpanKey}],
          offset: 1,
        },
        focus: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: calloutKey},
            'content',
            {_key: lineKey},
            'children',
            {_key: lineSpanKey},
          ],
          offset: 2,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'B: f|',
        'TABLE:',
        '  ROW:',
        '    CELL:',
        '      B: ',
        '    CELL:',
        '      CALLOUT:',
        '        B: z',
      ].join('\n'),
    )
  })

  test('selection across cells in same row preserves intermediate cell shells with cleared content', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cell0Key = keyGenerator()
    const cell0BlockKey = keyGenerator()
    const cell0SpanKey = keyGenerator()
    const cell1Key = keyGenerator()
    const cell1BlockKey = keyGenerator()
    const cell1SpanKey = keyGenerator()
    const cell2Key = keyGenerator()
    const cell2BlockKey = keyGenerator()
    const cell2SpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: tableSchemaDefinition,
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
                  _key: cell0Key,
                  content: [
                    {
                      _type: 'block',
                      _key: cell0BlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: cell0SpanKey,
                          text: 'foo',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: cell1Key,
                  content: [
                    {
                      _type: 'block',
                      _key: cell1BlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: cell1SpanKey,
                          text: 'MIDDLE',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: cell2Key,
                  content: [
                    {
                      _type: 'block',
                      _key: cell2BlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: cell2SpanKey,
                          text: 'baz',
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
      children: <ContainerPlugin containers={tableContainers} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cell0Key},
            'content',
            {_key: cell0BlockKey},
            'children',
            {_key: cell0SpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cell2Key},
            'content',
            {_key: cell2BlockKey},
            'children',
            {_key: cell2SpanKey},
          ],
          offset: 2,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'TABLE:',
        '  ROW:',
        '    CELL:',
        '      B: f|',
        '    CELL:',
        '      B: ',
        '    CELL:',
        '      B: z',
      ].join('\n'),
    )
  })

  test('selection across rows in same table preserves intermediate row shells with cells cleared', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const row0Key = keyGenerator()
    const row0CellKey = keyGenerator()
    const row0BlockKey = keyGenerator()
    const row0SpanKey = keyGenerator()
    const row1Key = keyGenerator()
    const row1Cell0Key = keyGenerator()
    const row1Cell0BlockKey = keyGenerator()
    const row1Cell0SpanKey = keyGenerator()
    const row1Cell1Key = keyGenerator()
    const row1Cell1BlockKey = keyGenerator()
    const row1Cell1SpanKey = keyGenerator()
    const row2Key = keyGenerator()
    const row2CellKey = keyGenerator()
    const row2BlockKey = keyGenerator()
    const row2SpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: tableSchemaDefinition,
      initialValue: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: row0Key,
              cells: [
                {
                  _type: 'cell',
                  _key: row0CellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: row0BlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: row0SpanKey,
                          text: 'foo',
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
            {
              _type: 'row',
              _key: row1Key,
              cells: [
                {
                  _type: 'cell',
                  _key: row1Cell0Key,
                  content: [
                    {
                      _type: 'block',
                      _key: row1Cell0BlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: row1Cell0SpanKey,
                          text: 'MID0',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: row1Cell1Key,
                  content: [
                    {
                      _type: 'block',
                      _key: row1Cell1BlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: row1Cell1SpanKey,
                          text: 'MID1',
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
            {
              _type: 'row',
              _key: row2Key,
              cells: [
                {
                  _type: 'cell',
                  _key: row2CellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: row2BlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: row2SpanKey,
                          text: 'baz',
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
      children: <ContainerPlugin containers={tableContainers} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: row0Key},
            'cells',
            {_key: row0CellKey},
            'content',
            {_key: row0BlockKey},
            'children',
            {_key: row0SpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: row2Key},
            'cells',
            {_key: row2CellKey},
            'content',
            {_key: row2BlockKey},
            'children',
            {_key: row2SpanKey},
          ],
          offset: 2,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'TABLE:',
        '  ROW:',
        '    CELL:',
        '      B: f|',
        '  ROW:',
        '    CELL:',
        '      B: ',
        '    CELL:',
        '      B: ',
        '  ROW:',
        '    CELL:',
        '      B: z',
      ].join('\n'),
    )
  })

  test('Selecting an entire empty table and pressing Delete unsets the table', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const row1Key = keyGenerator()
    const cell00Key = keyGenerator()
    const block00Key = keyGenerator()
    const span00Key = keyGenerator()
    const cell01Key = keyGenerator()
    const block01Key = keyGenerator()
    const span01Key = keyGenerator()
    const cell02Key = keyGenerator()
    const block02Key = keyGenerator()
    const span02Key = keyGenerator()
    const row2Key = keyGenerator()
    const cell10Key = keyGenerator()
    const block10Key = keyGenerator()
    const span10Key = keyGenerator()
    const cell11Key = keyGenerator()
    const block11Key = keyGenerator()
    const span11Key = keyGenerator()
    const cell12Key = keyGenerator()
    const block12Key = keyGenerator()
    const span12Key = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: tableSchemaDefinition,
      initialValue: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: row1Key,
              cells: [
                {
                  _type: 'cell',
                  _key: cell00Key,
                  content: [
                    {
                      _type: 'block',
                      _key: block00Key,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: span00Key, text: '', marks: []},
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: cell01Key,
                  content: [
                    {
                      _type: 'block',
                      _key: block01Key,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: span01Key, text: '', marks: []},
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: cell02Key,
                  content: [
                    {
                      _type: 'block',
                      _key: block02Key,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: span02Key, text: '', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
            {
              _type: 'row',
              _key: row2Key,
              cells: [
                {
                  _type: 'cell',
                  _key: cell10Key,
                  content: [
                    {
                      _type: 'block',
                      _key: block10Key,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: span10Key, text: '', marks: []},
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: cell11Key,
                  content: [
                    {
                      _type: 'block',
                      _key: block11Key,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: span11Key, text: '', marks: []},
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: cell12Key,
                  content: [
                    {
                      _type: 'block',
                      _key: block12Key,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: span12Key, text: '', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={tableContainers} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: row1Key},
            'cells',
            {_key: cell00Key},
            'content',
            {_key: block00Key},
            'children',
            {_key: span00Key},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: row2Key},
            'cells',
            {_key: cell12Key},
            'content',
            {_key: block12Key},
            'children',
            {_key: span12Key},
          ],
          offset: 0,
        },
      },
    })

    await userEvent.keyboard('{Delete}')

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: |')
  })

  test('Selecting only the first two of three empty cells in a row is a no-op', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cell0Key = keyGenerator()
    const block0Key = keyGenerator()
    const span0Key = keyGenerator()
    const cell1Key = keyGenerator()
    const block1Key = keyGenerator()
    const span1Key = keyGenerator()
    const cell2Key = keyGenerator()
    const block2Key = keyGenerator()
    const span2Key = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: tableSchemaDefinition,
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
                  _key: cell0Key,
                  content: [
                    {
                      _type: 'block',
                      _key: block0Key,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: span0Key, text: '', marks: []},
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: cell1Key,
                  content: [
                    {
                      _type: 'block',
                      _key: block1Key,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: span1Key, text: '', marks: []},
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: cell2Key,
                  content: [
                    {
                      _type: 'block',
                      _key: block2Key,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: span2Key, text: '', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={tableContainers} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cell0Key},
            'content',
            {_key: block0Key},
            'children',
            {_key: span0Key},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cell1Key},
            'content',
            {_key: block1Key},
            'children',
            {_key: span1Key},
          ],
          offset: 0,
        },
      },
    })

    await userEvent.keyboard('{Delete}')

    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'TABLE:',
        '  ROW:',
        '    CELL:',
        '      B: ^',
        '    CELL:',
        '      B: |',
        '    CELL:',
        '      B: ',
      ].join('\n'),
    )
  })

  test('Selecting from the first cell to a middle cell of a 2x3 table preserves the trailing cells', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const row0Key = keyGenerator()
    const cell00Key = keyGenerator()
    const block00Key = keyGenerator()
    const span00Key = keyGenerator()
    const cell01Key = keyGenerator()
    const block01Key = keyGenerator()
    const span01Key = keyGenerator()
    const cell02Key = keyGenerator()
    const block02Key = keyGenerator()
    const span02Key = keyGenerator()
    const row1Key = keyGenerator()
    const cell10Key = keyGenerator()
    const block10Key = keyGenerator()
    const span10Key = keyGenerator()
    const cell11Key = keyGenerator()
    const block11Key = keyGenerator()
    const span11Key = keyGenerator()
    const cell12Key = keyGenerator()
    const block12Key = keyGenerator()
    const span12Key = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: tableSchemaDefinition,
      initialValue: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: row0Key,
              cells: [
                {
                  _type: 'cell',
                  _key: cell00Key,
                  content: [
                    {
                      _type: 'block',
                      _key: block00Key,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: span00Key, text: '', marks: []},
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: cell01Key,
                  content: [
                    {
                      _type: 'block',
                      _key: block01Key,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: span01Key, text: '', marks: []},
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: cell02Key,
                  content: [
                    {
                      _type: 'block',
                      _key: block02Key,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: span02Key, text: '', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
            {
              _type: 'row',
              _key: row1Key,
              cells: [
                {
                  _type: 'cell',
                  _key: cell10Key,
                  content: [
                    {
                      _type: 'block',
                      _key: block10Key,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: span10Key, text: '', marks: []},
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: cell11Key,
                  content: [
                    {
                      _type: 'block',
                      _key: block11Key,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: span11Key, text: '', marks: []},
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: cell12Key,
                  content: [
                    {
                      _type: 'block',
                      _key: block12Key,
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: span12Key, text: '', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={tableContainers} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: row0Key},
            'cells',
            {_key: cell00Key},
            'content',
            {_key: block00Key},
            'children',
            {_key: span00Key},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: row1Key},
            'cells',
            {_key: cell11Key},
            'content',
            {_key: block11Key},
            'children',
            {_key: span11Key},
          ],
          offset: 0,
        },
      },
    })

    await userEvent.keyboard('{Delete}')

    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'TABLE:',
        '  ROW:',
        '    CELL:',
        '      B: |',
        '    CELL:',
        '      B: ',
        '    CELL:',
        '      B: ',
        '  ROW:',
        '    CELL:',
        '      B: ',
        '    CELL:',
        '      B: ',
        '    CELL:',
        '      B: ',
      ].join('\n'),
    )
  })

  test('selecting all the text in an editable container preserves the shell', async () => {
    // Slash-command flow: typing `/im` inside a callout, selecting the
    // Image action emits `delete` of the pattern selection followed by
    // `insert.block`. The callout shell must remain in place so the
    // image lands inside its `content` field, not at the root.
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey, text: '/im', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    const spanPath = [
      {_key: calloutKey},
      'content',
      {_key: blockKey},
      'children',
      {_key: spanKey},
    ]

    editor.send({
      type: 'delete',
      at: {
        anchor: {path: spanPath, offset: 0},
        focus: {path: spanPath, offset: 3},
      },
    })

    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CALLOUT:', '  B: '].join('\n'),
    )
  })

  test('inserting a block after fully clearing the text inside a callout lands the block inside', async () => {
    // Slash-command flow: typing '/im' inside a callout, picking the
    // Image action raises 'delete' of the typed pattern then
    // 'insert.block' for the image. The image must land inside the
    // callout's 'content' field (replacing the empty placeholder
    // text block left by the delete), not as a root sibling after
    // the callout. Mirrors the playground's fact-box where a second
    // container is registered at the text-block scope
    // ('\$..callout.block') — the configuration that triggers the
    // bug, since the inner-container registration is what causes the
    // empty text block to be unset (leaving the editor selection
    // stale) instead of just emptied.
    const calloutBlockContainer = defineContainer<typeof schemaDefinition>({
      type: 'block',
      childField: 'children',
      render: ({attributes, children}) => <p {...attributes}>{children}</p>,
    })

    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey, text: '/im', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <ContainerPlugin containers={[...containers, calloutBlockContainer]} />
      ),
    })

    const spanPath = [
      {_key: calloutKey},
      'content',
      {_key: blockKey},
      'children',
      {_key: spanKey},
    ]

    // Place the caret in the span (matches state after the user types '/im').
    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 3},
        focus: {path: spanPath, offset: 3},
      },
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {path: spanPath, offset: 0},
        focus: {path: spanPath, offset: 3},
      },
    })

    editor.send({
      type: 'insert.block',
      block: {_type: 'image'},
      placement: 'auto',
      select: 'end',
    })

    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CALLOUT:', '  ^{IMAGE}|'].join('\n'),
    )
  })

  test('Cmd-A + Delete across two code-blocks removes both', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlock1Key = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
    const codeBlock2Key = keyGenerator()
    const line2Key = keyGenerator()
    const line2SpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      schemaDefinition,
      keyGenerator,
      initialValue: [
        {
          _key: codeBlock1Key,
          _type: 'code-block',
          lines: [
            {
              _key: line1Key,
              _type: 'block',
              children: [
                {_key: line1SpanKey, _type: 'span', text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _key: codeBlock2Key,
          _type: 'code-block',
          lines: [
            {
              _key: line2Key,
              _type: 'block',
              children: [
                {_key: line2SpanKey, _type: 'span', text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [
            {_key: codeBlock1Key},
            'lines',
            {_key: line1Key},
            'children',
            {_key: line1SpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: codeBlock2Key},
            'lines',
            {_key: line2Key},
            'children',
            {_key: line2SpanKey},
          ],
          offset: 3,
        },
      },
    })

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: |')
  })

  test('Cmd-A + Delete via keyboard across code-block, callout and table removes all', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const codeLineKey = keyGenerator()
    const codeSpanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const calloutBlockKey = keyGenerator()
    const calloutSpanKey = keyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cell1Key = keyGenerator()
    const cell1BlockKey = keyGenerator()
    const cell1SpanKey = keyGenerator()
    const cell2Key = keyGenerator()
    const cell2BlockKey = keyGenerator()
    const cell2SpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      schemaDefinition,
      keyGenerator,
      initialValue: [
        {
          _key: codeBlockKey,
          _type: 'code-block',
          lines: [
            {
              _key: codeLineKey,
              _type: 'block',
              children: [
                {_key: codeSpanKey, _type: 'span', text: '', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _key: calloutKey,
          _type: 'callout',
          content: [
            {
              _key: calloutBlockKey,
              _type: 'block',
              children: [
                {_key: calloutSpanKey, _type: 'span', text: '', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _key: tableKey,
          _type: 'table',
          rows: [
            {
              _key: rowKey,
              _type: 'row',
              cells: [
                {
                  _key: cell1Key,
                  _type: 'cell',
                  content: [
                    {
                      _key: cell1BlockKey,
                      _type: 'block',
                      children: [
                        {
                          _key: cell1SpanKey,
                          _type: 'span',
                          text: '',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
                {
                  _key: cell2Key,
                  _type: 'cell',
                  content: [
                    {
                      _key: cell2BlockKey,
                      _type: 'block',
                      children: [
                        {
                          _key: cell2SpanKey,
                          _type: 'span',
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
      children: <ContainerPlugin containers={containers} />,
    })

    await userEvent.click(locator)
    await userEvent.keyboard('{Control>}a{/Control}')
    await userEvent.keyboard('{Delete}')

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: |')
  })
})
