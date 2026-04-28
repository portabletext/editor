import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {userEvent} from 'vitest/browser'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'code-block',
      fields: [{name: 'lines', type: 'array', of: [{type: 'block'}]}],
    },
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

const containers = [
  defineContainer<typeof schemaDefinition>({
    scope: '$..code-block',
    field: 'lines',
    render: ({attributes, children}) => <pre {...attributes}>{children}</pre>,
  }),
  defineContainer<typeof schemaDefinition>({
    scope: '$..callout',
    field: 'content',
    render: ({attributes, children}) => <div {...attributes}>{children}</div>,
  }),
  defineContainer<typeof schemaDefinition>({
    scope: '$..table',
    field: 'rows',
    render: ({attributes, children}) => (
      <table {...attributes}>
        <tbody>{children}</tbody>
      </table>
    ),
  }),
  defineContainer<typeof schemaDefinition>({
    scope: '$..table.row',
    field: 'cells',
    render: ({attributes, children}) => <tr {...attributes}>{children}</tr>,
  }),
  defineContainer<typeof schemaDefinition>({
    scope: '$..table.row.cell',
    field: 'content',
    render: ({attributes, children}) => <td {...attributes}>{children}</td>,
  }),
]

describe('cross-container range delete with edge promotion', () => {
  test('select-all from root foo offset 0 to deep table fizz offset 4 empties the document', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlock = keyGenerator()
    const fooSpan = keyGenerator()
    const codeBlockKey = keyGenerator()
    const codeLine = keyGenerator()
    const codeSpan = keyGenerator()
    const bazBlock = keyGenerator()
    const bazSpan = keyGenerator()
    const tableKey = keyGenerator()
    const row1 = keyGenerator()
    const cell1a = keyGenerator()
    const block1a = keyGenerator()
    const span1a = keyGenerator()
    const cell1b = keyGenerator()
    const block1b = keyGenerator()
    const span1b = keyGenerator()
    const row2 = keyGenerator()
    const cell2a = keyGenerator()
    const block2a = keyGenerator()
    const span2a = keyGenerator()
    const cell2b = keyGenerator()
    const block2b = keyGenerator()
    const span2b = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: fooBlock,
          children: [{_type: 'span', _key: fooSpan, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: codeLine,
              children: [
                {_type: 'span', _key: codeSpan, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: bazBlock,
          children: [{_type: 'span', _key: bazSpan, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: row1,
              cells: [
                {
                  _type: 'cell',
                  _key: cell1a,
                  content: [
                    {
                      _type: 'block',
                      _key: block1a,
                      children: [
                        {_type: 'span', _key: span1a, text: '', marks: []},
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: cell1b,
                  content: [
                    {
                      _type: 'block',
                      _key: block1b,
                      children: [
                        {_type: 'span', _key: span1b, text: '', marks: []},
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
              _key: row2,
              cells: [
                {
                  _type: 'cell',
                  _key: cell2a,
                  content: [
                    {
                      _type: 'block',
                      _key: block2a,
                      children: [
                        {_type: 'span', _key: span2a, text: '', marks: []},
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: cell2b,
                  content: [
                    {
                      _type: 'block',
                      _key: block2b,
                      children: [
                        {_type: 'span', _key: span2b, text: 'fizz', marks: []},
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
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: fooBlock}, 'children', {_key: fooSpan}],
          offset: 0,
        },
        focus: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: row2},
            'cells',
            {_key: cell2b},
            'content',
            {_key: block2b},
            'children',
            {_key: span2b},
          ],
          offset: 4,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    // Edge promotion: foo at offset 0 -> entire foo deleted; fizz offset 4 = truly-last of table -> entire table deleted.
    // Document collapses to a single empty placeholder block (the editor's normalization).
    await new Promise((r) => setTimeout(r, 50))
    const value = editor.getSnapshot().context.value
    // Expect a single empty placeholder block remains (any key).
    expect(value.length).toBe(1)
    expect(value[0]?._type).toBe('block')
    // It should have a single empty span.
    const block0 = value[0] as {children?: Array<{text: string}>}
    expect(block0.children?.length).toBe(1)
    expect(block0.children?.[0]?.text).toBe('')
  })

  test('cross-parent partial-start partial-end keeps both block shells with trimmed text', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlock = keyGenerator()
    const fooSpan = keyGenerator()
    const codeBlockKey = keyGenerator()
    const codeLine = keyGenerator()
    const codeSpan = keyGenerator()
    const bazBlock = keyGenerator()
    const bazSpan = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: fooBlock,
          children: [{_type: 'span', _key: fooSpan, text: 'foofoo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: codeLine,
              children: [
                {_type: 'span', _key: codeSpan, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: bazBlock,
          children: [{_type: 'span', _key: bazSpan, text: 'bazbaz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    await userEvent.click(locator)
    // anchor at foo offset 3 (mid), focus at code-line offset 1 (mid).
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: fooBlock}, 'children', {_key: fooSpan}],
          offset: 3,
        },
        focus: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: codeLine},
            'children',
            {_key: codeSpan},
          ],
          offset: 1,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    await new Promise((r) => setTimeout(r, 50))
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: fooBlock,
        children: [{_type: 'span', _key: fooSpan, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'code-block',
        _key: codeBlockKey,
        lines: [
          {
            _type: 'block',
            _key: codeLine,
            children: [{_type: 'span', _key: codeSpan, text: 'ar', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
      {
        _type: 'block',
        _key: bazBlock,
        children: [{_type: 'span', _key: bazSpan, text: 'bazbaz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('cross-parent end-fully-selected (focus at truly-last of code-block) deletes the code-block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlock = keyGenerator()
    const fooSpan = keyGenerator()
    const codeBlockKey = keyGenerator()
    const codeLine = keyGenerator()
    const codeSpan = keyGenerator()
    const bazBlock = keyGenerator()
    const bazSpan = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: fooBlock,
          children: [{_type: 'span', _key: fooSpan, text: 'foofoo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: codeLine,
              children: [
                {_type: 'span', _key: codeSpan, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: bazBlock,
          children: [{_type: 'span', _key: bazSpan, text: 'bazbaz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    await userEvent.click(locator)
    // anchor at foo offset 3 (mid), focus at end of "bar" = end of code-line = end of code-block.
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: fooBlock}, 'children', {_key: fooSpan}],
          offset: 3,
        },
        focus: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: codeLine},
            'children',
            {_key: codeSpan},
          ],
          offset: 3,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    await new Promise((r) => setTimeout(r, 50))
    // foo trimmed to "foo", code-block deleted, baz untouched.
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: fooBlock,
        children: [{_type: 'span', _key: fooSpan, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: bazBlock,
        children: [{_type: 'span', _key: bazSpan, text: 'bazbaz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('cross-parent start-fully-selected (anchor at truly-first of code-block) deletes the code-block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlock = keyGenerator()
    const fooSpan = keyGenerator()
    const codeBlockKey = keyGenerator()
    const codeLine = keyGenerator()
    const codeSpan = keyGenerator()
    const bazBlock = keyGenerator()
    const bazSpan = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: fooBlock,
          children: [{_type: 'span', _key: fooSpan, text: 'foofoo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: codeLine,
              children: [
                {_type: 'span', _key: codeSpan, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: bazBlock,
          children: [{_type: 'span', _key: bazSpan, text: 'bazbaz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    await userEvent.click(locator)
    // anchor at start of "bar" (= truly-first of code-block), focus at baz offset 3.
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: codeLine},
            'children',
            {_key: codeSpan},
          ],
          offset: 0,
        },
        focus: {
          path: [{_key: bazBlock}, 'children', {_key: bazSpan}],
          offset: 3,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    await new Promise((r) => setTimeout(r, 50))
    // foo untouched, code-block deleted, baz trimmed to "baz".
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: fooBlock,
        children: [{_type: 'span', _key: fooSpan, text: 'foofoo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: bazBlock,
        children: [{_type: 'span', _key: bazSpan, text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('select-all inside a fact-box (root selects content of fact-box) deletes everything inside fact-box', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fbKey = keyGenerator()
    const fbBlock1 = keyGenerator()
    const fbSpan1 = keyGenerator()
    const innerCalloutKey = keyGenerator()
    const innerCalloutBlock = keyGenerator()
    const innerCalloutSpan = keyGenerator()
    const fbBlock2 = keyGenerator()
    const fbSpan2 = keyGenerator()

    const factBoxSchema = defineSchema({
      blockObjects: [
        {
          name: 'fact-box',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [
                {type: 'block'},
                {
                  type: 'callout',
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
    })

    const factBoxContainers = [
      defineContainer<typeof factBoxSchema>({
        scope: '$..fact-box',
        field: 'content',
        render: ({attributes, children}) => (
          <section {...attributes}>{children}</section>
        ),
      }),
      defineContainer<typeof factBoxSchema>({
        scope: '$..fact-box.callout',
        field: 'content',
        render: ({attributes, children}) => (
          <div {...attributes}>{children}</div>
        ),
      }),
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: factBoxSchema,
      initialValue: [
        {
          _type: 'fact-box',
          _key: fbKey,
          content: [
            {
              _type: 'block',
              _key: fbBlock1,
              children: [
                {_type: 'span', _key: fbSpan1, text: 'one', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'callout',
              _key: innerCalloutKey,
              content: [
                {
                  _type: 'block',
                  _key: innerCalloutBlock,
                  children: [
                    {
                      _type: 'span',
                      _key: innerCalloutSpan,
                      text: 'inner',
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
              _key: fbBlock2,
              children: [
                {_type: 'span', _key: fbSpan2, text: 'three', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={factBoxContainers} />,
    })

    await userEvent.click(locator)
    // anchor at start of "one" (= start of fact-box).
    // focus at end of "three" (= end of fact-box).
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: fbKey},
            'content',
            {_key: fbBlock1},
            'children',
            {_key: fbSpan1},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: fbKey},
            'content',
            {_key: fbBlock2},
            'children',
            {_key: fbSpan2},
          ],
          offset: 5,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    await new Promise((r) => setTimeout(r, 50))
    // Selection covers fact-box edge-to-edge -> fact-box itself deleted.
    // Document collapses to the empty placeholder block.
    const value = editor.getSnapshot().context.value
    expect(value.length).toBe(1)
    expect(value[0]?._type).toBe('block')
  })

  test('cross-fact-box-content + nested callout: anchor mid-block-1, focus at truly-last of nested callout deletes intermediate block + callout', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fbKey = keyGenerator()
    const fbBlock1 = keyGenerator()
    const fbSpan1 = keyGenerator()
    const innerCalloutKey = keyGenerator()
    const innerCalloutBlock = keyGenerator()
    const innerCalloutSpan = keyGenerator()

    const factBoxSchema = defineSchema({
      blockObjects: [
        {
          name: 'fact-box',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [
                {type: 'block'},
                {
                  type: 'callout',
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
    })

    const factBoxContainers = [
      defineContainer<typeof factBoxSchema>({
        scope: '$..fact-box',
        field: 'content',
        render: ({attributes, children}) => (
          <section {...attributes}>{children}</section>
        ),
      }),
      defineContainer<typeof factBoxSchema>({
        scope: '$..fact-box.callout',
        field: 'content',
        render: ({attributes, children}) => (
          <div {...attributes}>{children}</div>
        ),
      }),
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: factBoxSchema,
      initialValue: [
        {
          _type: 'fact-box',
          _key: fbKey,
          content: [
            {
              _type: 'block',
              _key: fbBlock1,
              children: [
                {_type: 'span', _key: fbSpan1, text: 'oneone', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'callout',
              _key: innerCalloutKey,
              content: [
                {
                  _type: 'block',
                  _key: innerCalloutBlock,
                  children: [
                    {
                      _type: 'span',
                      _key: innerCalloutSpan,
                      text: 'inner',
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
      children: <ContainerPlugin containers={factBoxContainers} />,
    })

    await userEvent.click(locator)
    // anchor at fbBlock1 offset 3 (mid).
    // focus at end of "inner" (= truly-last of nested callout, which IS the
    // last entry of fact-box.content -> truly-last of fact-box too).
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: fbKey},
            'content',
            {_key: fbBlock1},
            'children',
            {_key: fbSpan1},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: fbKey},
            'content',
            {_key: innerCalloutKey},
            'content',
            {_key: innerCalloutBlock},
            'children',
            {_key: innerCalloutSpan},
          ],
          offset: 5,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    await new Promise((r) => setTimeout(r, 50))
    // fact-box is the truly-last container reached (callout fully covered,
    // and that's the LAST entry of fact-box -> fact-box also fully covered).
    // BUT anchor is mid of fbBlock1, so fact-box is NOT fully covered.
    // Result: fact-box stays with fbBlock1 trimmed to "one" + nothing else.
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'fact-box',
        _key: fbKey,
        content: [
          {
            _type: 'block',
            _key: fbBlock1,
            children: [{_type: 'span', _key: fbSpan1, text: 'one', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
  })

  test('selection across cells preserves cell shells but clears content (row.cells does not accept text blocks)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const row1 = keyGenerator()
    const cell1a = keyGenerator()
    const block1a = keyGenerator()
    const span1a = keyGenerator()
    const cell1b = keyGenerator()
    const block1b = keyGenerator()
    const span1b = keyGenerator()
    const cell1c = keyGenerator()
    const block1c = keyGenerator()
    const span1c = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: row1,
              cells: [
                {
                  _type: 'cell',
                  _key: cell1a,
                  content: [
                    {
                      _type: 'block',
                      _key: block1a,
                      children: [
                        {_type: 'span', _key: span1a, text: 'aaa', marks: []},
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: cell1b,
                  content: [
                    {
                      _type: 'block',
                      _key: block1b,
                      children: [
                        {_type: 'span', _key: span1b, text: 'bbb', marks: []},
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: cell1c,
                  content: [
                    {
                      _type: 'block',
                      _key: block1c,
                      children: [
                        {_type: 'span', _key: span1c, text: 'ccc', marks: []},
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
    // anchor at cell1a 'aaa' offset 1 (mid).
    // focus at cell1c 'ccc' offset 2 (mid).
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: row1},
            'cells',
            {_key: cell1a},
            'content',
            {_key: block1a},
            'children',
            {_key: span1a},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: row1},
            'cells',
            {_key: cell1c},
            'content',
            {_key: block1c},
            'children',
            {_key: span1c},
          ],
          offset: 2,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    await new Promise((r) => setTimeout(r, 50))
    // cell1a trimmed (trailing); cell1b's content cleared (cell shell stays
    // because row.cells does not accept text blocks, but the inner content
    // is wiped because the selection covers it); cell1c trimmed (leading).
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: tableKey,
        rows: [
          {
            _type: 'row',
            _key: row1,
            cells: [
              {
                _type: 'cell',
                _key: cell1a,
                content: [
                  {
                    _type: 'block',
                    _key: block1a,
                    children: [
                      {_type: 'span', _key: span1a, text: 'a', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                ],
              },
              {
                _type: 'cell',
                _key: cell1b,
                content: [
                  {
                    _type: 'block',
                    _key: 'k13',
                    children: [
                      {_type: 'span', _key: 'k14', text: '', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                ],
              },
              {
                _type: 'cell',
                _key: cell1c,
                content: [
                  {
                    _type: 'block',
                    _key: block1c,
                    children: [
                      {_type: 'span', _key: span1c, text: 'c', marks: []},
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

  test('select-all inside table edge-to-edge does NOT delete the table (cells preserved, content cleared)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const row1 = keyGenerator()
    const cell1a = keyGenerator()
    const block1a = keyGenerator()
    const span1a = keyGenerator()
    const cell1b = keyGenerator()
    const block1b = keyGenerator()
    const span1b = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: row1,
              cells: [
                {
                  _type: 'cell',
                  _key: cell1a,
                  content: [
                    {
                      _type: 'block',
                      _key: block1a,
                      children: [
                        {_type: 'span', _key: span1a, text: 'foo', marks: []},
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: cell1b,
                  content: [
                    {
                      _type: 'block',
                      _key: block1b,
                      children: [
                        {_type: 'span', _key: span1b, text: 'bar', marks: []},
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
    // Selection edge-to-edge inside table. NOT extending past it.
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: row1},
            'cells',
            {_key: cell1a},
            'content',
            {_key: block1a},
            'children',
            {_key: span1a},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: row1},
            'cells',
            {_key: cell1b},
            'content',
            {_key: block1b},
            'children',
            {_key: span1b},
          ],
          offset: 3,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    await new Promise((r) => setTimeout(r, 50))
    // Cells preserved, content cleared in both cells.
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: tableKey,
        rows: [
          {
            _type: 'row',
            _key: row1,
            cells: [
              {
                _type: 'cell',
                _key: cell1a,
                content: [
                  {
                    _type: 'block',
                    _key: block1a,
                    children: [
                      {_type: 'span', _key: span1a, text: '', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                ],
              },
              {
                _type: 'cell',
                _key: cell1b,
                content: [
                  {
                    _type: 'block',
                    _key: block1b,
                    children: [
                      {_type: 'span', _key: span1b, text: '', marks: []},
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
