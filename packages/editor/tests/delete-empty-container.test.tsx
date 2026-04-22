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
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [
            {type: 'block'},
            {
              type: 'code-block',
              fields: [{name: 'lines', type: 'array', of: [{type: 'block'}]}],
            },
          ],
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
                },
              ],
            },
          ],
        },
      ],
    },
    {name: 'image'},
  ],
})

const containers = [
  defineContainer<typeof schemaDefinition>({
    scope: '$..code-block',
    field: 'lines',
    render: ({attributes, children}) => <pre {...attributes}>{children}</pre>,
  }),
  defineContainer<typeof schemaDefinition>({
    scope: '$..callout.code-block',
    field: 'lines',
    render: ({attributes, children}) => <pre {...attributes}>{children}</pre>,
  }),
  defineContainer<typeof schemaDefinition>({
    scope: '$..callout',
    field: 'content',
    render: ({attributes, children}) => <div {...attributes}>{children}</div>,
  }),
  defineContainer<typeof schemaDefinition>({
    scope: '$..table.row.cell.callout',
    field: 'content',
    render: ({attributes, children}) => <div {...attributes}>{children}</div>,
  }),
  defineContainer<typeof schemaDefinition>({
    scope: '$..table',
    field: 'rows',
    render: ({attributes, children}) => (
      <table>
        <tbody {...attributes}>{children}</tbody>
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

describe('delete empty container', () => {
  test('Backspace in an empty code-block between two text blocks removes the code-block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const textBlockKey = keyGenerator()
    const textSpanKey = keyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const lineSpanKey = keyGenerator()
    const nextBlockKey = keyGenerator()
    const nextSpanKey = keyGenerator()

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
        {
          _type: 'block',
          _key: nextBlockKey,
          children: [
            {_type: 'span', _key: nextSpanKey, text: 'bar', marks: []},
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

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: textBlockKey,
        children: [{_type: 'span', _key: textSpanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: nextBlockKey,
        children: [{_type: 'span', _key: nextSpanKey, text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: textBlockKey}, 'children', {_key: textSpanKey}],
        offset: 3,
      },
      focus: {
        path: [{_key: textBlockKey}, 'children', {_key: textSpanKey}],
        offset: 3,
      },
      backward: false,
    })
  })

  test('Delete in an empty code-block between two text blocks removes the code-block and selects the next block start', async () => {
    const keyGenerator = createTestKeyGenerator()
    const textBlockKey = keyGenerator()
    const textSpanKey = keyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const lineSpanKey = keyGenerator()
    const nextBlockKey = keyGenerator()
    const nextSpanKey = keyGenerator()

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
        {
          _type: 'block',
          _key: nextBlockKey,
          children: [
            {_type: 'span', _key: nextSpanKey, text: 'bar', marks: []},
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

    await userEvent.keyboard('{Delete}')

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: textBlockKey,
        children: [{_type: 'span', _key: textSpanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: nextBlockKey,
        children: [{_type: 'span', _key: nextSpanKey, text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: nextBlockKey}, 'children', {_key: nextSpanKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: nextBlockKey}, 'children', {_key: nextSpanKey}],
        offset: 0,
      },
      backward: false,
    })
  })

  test('Backspace in the only block (an empty code-block) leaves a fresh text block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const lineSpanKey = keyGenerator()

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

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k5',
        children: [{_type: 'span', _key: 'k6', text: '', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('Backspace in a non-empty code-block line does NOT remove the code-block', async () => {
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
                {_type: 'span', _key: lineSpanKey, text: 'hi', marks: []},
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
          offset: 1,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: textBlockKey,
        children: [{_type: 'span', _key: textSpanKey, text: 'foo', marks: []}],
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
              {_type: 'span', _key: lineSpanKey, text: 'i', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
  })

  test('Backspace in a callout containing an empty code-block removes the callout (ancestor walk)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const textBlockKey = keyGenerator()
    const textSpanKey = keyGenerator()
    const calloutKey = keyGenerator()
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
          _type: 'callout',
          _key: calloutKey,
          content: [
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
            {_key: calloutKey},
            'content',
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

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: textBlockKey,
        children: [{_type: 'span', _key: textSpanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('Backspace in a callout inside a table cell removes only the callout, leaving the table intact', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellAKey = keyGenerator()
    const cellBKey = keyGenerator()
    const cellABlockKey = keyGenerator()
    const cellASpanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const calloutBlockKey = keyGenerator()
    const calloutSpanKey = keyGenerator()

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
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellAKey,
                  content: [
                    {
                      _type: 'block',
                      _key: cellABlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: cellASpanKey,
                          text: 'hi',
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
                  _key: cellBKey,
                  content: [
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
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellBKey},
            'content',
            {_key: calloutKey},
            'content',
            {_key: calloutBlockKey},
            'children',
            {_key: calloutSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellBKey},
            'content',
            {_key: calloutKey},
            'content',
            {_key: calloutBlockKey},
            'children',
            {_key: calloutSpanKey},
          ],
          offset: 0,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

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
                _key: cellAKey,
                content: [
                  {
                    _type: 'block',
                    _key: cellABlockKey,
                    children: [
                      {
                        _type: 'span',
                        _key: cellASpanKey,
                        text: 'hi',
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
                _key: cellBKey,
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
    ])
  })
})
