import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
  blockObjects: [
    {
      name: 'cell',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [
            {
              type: 'block',
              decorators: [{name: 'strong'}],
            },
          ],
        },
      ],
    },
  ],
})

const cellContainer = [
  defineContainer({
    scope: '$..cell',
    field: 'content',
    render: ({children}) => <>{children}</>,
  }),
]

describe('decorator operations inside a container with narrowed decorators', () => {
  test(`adding "em" to a span inside a cell is a no-op (sub-schema doesn't declare em)`, async () => {
    const keyGenerator = createTestKeyGenerator()
    const cellKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'cell',
          _key: cellKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={cellContainer} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: cellKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: cellKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 5,
        },
      },
    })

    editor.send({type: 'decorator.add', decorator: 'em'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'cell',
          _key: cellKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test(`adding "strong" to a span inside a cell applies (sub-schema declares it)`, async () => {
    const keyGenerator = createTestKeyGenerator()
    const cellKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'cell',
          _key: cellKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={cellContainer} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: cellKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: cellKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 5,
        },
      },
    })

    editor.send({type: 'decorator.add', decorator: 'strong'})

    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      const cell = value?.[0]
      expect(cell).toEqual({
        _type: 'cell',
        _key: cellKey,
        content: [
          {
            _type: 'block',
            _key: innerBlockKey,
            children: [
              {
                _type: 'span',
                _key: innerSpanKey,
                text: 'hello',
                marks: ['strong'],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })
    })
  })

  test('select all + toggle bold across root + code-block container only bolds root text blocks; toggle again clears', async () => {
    const keyGenerator = createTestKeyGenerator()
    const block1Key = keyGenerator()
    const span1Key = keyGenerator()
    const codeBlockKey = keyGenerator()
    const codeLineKey = keyGenerator()
    const codeSpanKey = keyGenerator()
    const block2Key = keyGenerator()
    const span2Key = keyGenerator()

    const codeBlockSchema = defineSchema({
      decorators: [{name: 'strong'}, {name: 'em'}],
      blockObjects: [
        {
          name: 'code-block',
          fields: [
            {
              name: 'lines',
              type: 'array',
              of: [
                {
                  type: 'block',
                  decorators: [],
                  styles: [],
                  lists: [],
                },
              ],
            },
          ],
        },
      ],
    })

    const codeBlockContainer = [
      defineContainer({
        scope: '$..code-block',
        field: 'lines',
        render: ({children}) => <>{children}</>,
      }),
    ]

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: codeBlockSchema,
      initialValue: [
        {
          _type: 'block',
          _key: block1Key,
          children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: codeLineKey,
              children: [
                {_type: 'span', _key: codeSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: block2Key,
          children: [{_type: 'span', _key: span2Key, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <ContainerPlugin containers={codeBlockContainer} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: block1Key}, 'children', {_key: span1Key}],
          offset: 0,
        },
        focus: {
          path: [{_key: block2Key}, 'children', {_key: span2Key}],
          offset: 3,
        },
      },
    })

    editor.send({type: 'decorator.toggle', decorator: 'strong'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: block1Key,
          children: [
            {_type: 'span', _key: span1Key, text: 'foo', marks: ['strong']},
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
              _key: codeLineKey,
              children: [
                {_type: 'span', _key: codeSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: block2Key,
          children: [
            {_type: 'span', _key: span2Key, text: 'baz', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({type: 'decorator.toggle', decorator: 'strong'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: block1Key,
          children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: codeLineKey,
              children: [
                {_type: 'span', _key: codeSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: block2Key,
          children: [{_type: 'span', _key: span2Key, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('select all + toggle annotation across root + code-block container only annotates root text blocks; toggle again clears', async () => {
    const keyGenerator = createTestKeyGenerator()
    const block1Key = keyGenerator()
    const span1Key = keyGenerator()
    const codeBlockKey = keyGenerator()
    const codeLineKey = keyGenerator()
    const codeSpanKey = keyGenerator()
    const block2Key = keyGenerator()
    const span2Key = keyGenerator()

    const linkSchema = defineSchema({
      annotations: [
        {
          name: 'link',
          fields: [{name: 'href', type: 'string'}],
        },
      ],
      blockObjects: [
        {
          name: 'code-block',
          fields: [
            {
              name: 'lines',
              type: 'array',
              of: [
                {
                  type: 'block',
                  decorators: [],
                  styles: [],
                  lists: [],
                  annotations: [],
                },
              ],
            },
          ],
        },
      ],
    })

    const codeBlockContainer = [
      defineContainer({
        scope: '$..code-block',
        field: 'lines',
        render: ({children}) => <>{children}</>,
      }),
    ]

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: linkSchema,
      initialValue: [
        {
          _type: 'block',
          _key: block1Key,
          children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: codeLineKey,
              children: [
                {_type: 'span', _key: codeSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: block2Key,
          children: [{_type: 'span', _key: span2Key, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <ContainerPlugin containers={codeBlockContainer} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: block1Key}, 'children', {_key: span1Key}],
          offset: 0,
        },
        focus: {
          path: [{_key: block2Key}, 'children', {_key: span2Key}],
          offset: 3,
        },
      },
    })

    editor.send({
      type: 'annotation.toggle',
      annotation: {name: 'link', value: {href: 'https://example.com'}},
    })

    const fooLinkKey = 'k9'
    const bazLinkKey = 'k10'

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: block1Key,
          children: [
            {_type: 'span', _key: span1Key, text: 'foo', marks: [fooLinkKey]},
          ],
          markDefs: [
            {_type: 'link', _key: fooLinkKey, href: 'https://example.com'},
          ],
          style: 'normal',
        },
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: codeLineKey,
              children: [
                {_type: 'span', _key: codeSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: block2Key,
          children: [
            {_type: 'span', _key: span2Key, text: 'baz', marks: [bazLinkKey]},
          ],
          markDefs: [
            {_type: 'link', _key: bazLinkKey, href: 'https://example.com'},
          ],
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'annotation.toggle',
      annotation: {name: 'link', value: {href: 'https://example.com'}},
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: block1Key,
          children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: codeLineKey,
              children: [
                {_type: 'span', _key: codeSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: block2Key,
          children: [{_type: 'span', _key: span2Key, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('select all + toggle list across root + code-block container only applies list to root text blocks; toggle again clears', async () => {
    const keyGenerator = createTestKeyGenerator()
    const block1Key = keyGenerator()
    const span1Key = keyGenerator()
    const codeBlockKey = keyGenerator()
    const codeLineKey = keyGenerator()
    const codeSpanKey = keyGenerator()
    const block2Key = keyGenerator()
    const span2Key = keyGenerator()

    const listSchema = defineSchema({
      lists: [{name: 'bullet'}],
      blockObjects: [
        {
          name: 'code-block',
          fields: [
            {
              name: 'lines',
              type: 'array',
              of: [
                {
                  type: 'block',
                  decorators: [],
                  styles: [],
                  lists: [],
                  annotations: [],
                },
              ],
            },
          ],
        },
      ],
    })

    const codeBlockContainer = [
      defineContainer({
        scope: '$..code-block',
        field: 'lines',
        render: ({children}) => <>{children}</>,
      }),
    ]

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: listSchema,
      initialValue: [
        {
          _type: 'block',
          _key: block1Key,
          children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: codeLineKey,
              children: [
                {_type: 'span', _key: codeSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: block2Key,
          children: [{_type: 'span', _key: span2Key, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <ContainerPlugin containers={codeBlockContainer} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: block1Key}, 'children', {_key: span1Key}],
          offset: 0,
        },
        focus: {
          path: [{_key: block2Key}, 'children', {_key: span2Key}],
          offset: 3,
        },
      },
    })

    editor.send({type: 'list item.toggle', listItem: 'bullet'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: block1Key,
          children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'bullet',
          level: 1,
        },
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: codeLineKey,
              children: [
                {_type: 'span', _key: codeSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: block2Key,
          children: [{_type: 'span', _key: span2Key, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'bullet',
          level: 1,
        },
      ])
    })

    editor.send({type: 'list item.toggle', listItem: 'bullet'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: block1Key,
          children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: codeLineKey,
              children: [
                {_type: 'span', _key: codeSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: block2Key,
          children: [{_type: 'span', _key: span2Key, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('select all + toggle style across root + code-block container only restyles root text blocks; toggle again restores default', async () => {
    const keyGenerator = createTestKeyGenerator()
    const block1Key = keyGenerator()
    const span1Key = keyGenerator()
    const codeBlockKey = keyGenerator()
    const codeLineKey = keyGenerator()
    const codeSpanKey = keyGenerator()
    const block2Key = keyGenerator()
    const span2Key = keyGenerator()

    const styleSchema = defineSchema({
      styles: [{name: 'normal'}, {name: 'h1'}],
      blockObjects: [
        {
          name: 'code-block',
          fields: [
            {
              name: 'lines',
              type: 'array',
              of: [
                {
                  type: 'block',
                  decorators: [],
                  styles: [],
                  lists: [],
                  annotations: [],
                },
              ],
            },
          ],
        },
      ],
    })

    const codeBlockContainer = [
      defineContainer({
        scope: '$..code-block',
        field: 'lines',
        render: ({children}) => <>{children}</>,
      }),
    ]

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: styleSchema,
      initialValue: [
        {
          _type: 'block',
          _key: block1Key,
          children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: codeLineKey,
              children: [
                {_type: 'span', _key: codeSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: block2Key,
          children: [{_type: 'span', _key: span2Key, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <ContainerPlugin containers={codeBlockContainer} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: block1Key}, 'children', {_key: span1Key}],
          offset: 0,
        },
        focus: {
          path: [{_key: block2Key}, 'children', {_key: span2Key}],
          offset: 3,
        },
      },
    })

    editor.send({type: 'style.toggle', style: 'h1'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: block1Key,
          children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
          markDefs: [],
          style: 'h1',
        },
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: codeLineKey,
              children: [
                {_type: 'span', _key: codeSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: block2Key,
          children: [{_type: 'span', _key: span2Key, text: 'baz', marks: []}],
          markDefs: [],
          style: 'h1',
        },
      ])
    })

    editor.send({type: 'style.toggle', style: 'h1'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: block1Key,
          children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: codeLineKey,
              children: [
                {_type: 'span', _key: codeSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
            },
          ],
        },
        {
          _type: 'block',
          _key: block2Key,
          children: [{_type: 'span', _key: span2Key, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('select all + toggle bold across root + table cells (no bold) + nested callout (bold) only bolds in-scope spans', async () => {
    const keyGenerator = createTestKeyGenerator()
    const block1Key = keyGenerator()
    const span1Key = keyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const cellBlockKey = keyGenerator()
    const cellSpanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const calloutBlockKey = keyGenerator()
    const calloutSpanKey = keyGenerator()
    const block2Key = keyGenerator()
    const span2Key = keyGenerator()

    const nestedSchema = defineSchema({
      decorators: [{name: 'strong'}],
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
                              of: [
                                {
                                  type: 'block',
                                  decorators: [],
                                  styles: [{name: 'normal'}],
                                  lists: [],
                                  annotations: [],
                                },
                                {
                                  type: 'callout',
                                  fields: [
                                    {
                                      name: 'children',
                                      type: 'array',
                                      of: [
                                        {
                                          type: 'block',
                                          decorators: [{name: 'strong'}],
                                          styles: [{name: 'normal'}],
                                          lists: [],
                                          annotations: [],
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
        },
      ],
    })

    const containers = [
      defineContainer({
        scope: '$..table',
        field: 'rows',
        render: ({children}) => <>{children}</>,
      }),
      defineContainer({
        scope: '$..row',
        field: 'cells',
        render: ({children}) => <>{children}</>,
      }),
      defineContainer({
        scope: '$..cell',
        field: 'content',
        render: ({children}) => <>{children}</>,
      }),
      defineContainer({
        scope: '$..callout',
        field: 'children',
        render: ({children}) => <>{children}</>,
      }),
    ]

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: nestedSchema,
      initialValue: [
        {
          _type: 'block',
          _key: block1Key,
          children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
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
                      _key: cellBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: cellSpanKey,
                          text: 'cell',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    {
                      _type: 'callout',
                      _key: calloutKey,
                      children: [
                        {
                          _type: 'block',
                          _key: calloutBlockKey,
                          children: [
                            {
                              _type: 'span',
                              _key: calloutSpanKey,
                              text: 'callout',
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
        {
          _type: 'block',
          _key: block2Key,
          children: [{_type: 'span', _key: span2Key, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: block1Key}, 'children', {_key: span1Key}],
          offset: 0,
        },
        focus: {
          path: [{_key: block2Key}, 'children', {_key: span2Key}],
          offset: 3,
        },
      },
    })

    editor.send({type: 'decorator.toggle', decorator: 'strong'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: block1Key,
          children: [
            {_type: 'span', _key: span1Key, text: 'foo', marks: ['strong']},
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
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: cellBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: cellSpanKey,
                          text: 'cell',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    {
                      _type: 'callout',
                      _key: calloutKey,
                      children: [
                        {
                          _type: 'block',
                          _key: calloutBlockKey,
                          children: [
                            {
                              _type: 'span',
                              _key: calloutSpanKey,
                              text: 'callout',
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
        },
        {
          _type: 'block',
          _key: block2Key,
          children: [
            {_type: 'span', _key: span2Key, text: 'baz', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({type: 'decorator.toggle', decorator: 'strong'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: block1Key,
          children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
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
                      _key: cellBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: cellSpanKey,
                          text: 'cell',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    {
                      _type: 'callout',
                      _key: calloutKey,
                      children: [
                        {
                          _type: 'block',
                          _key: calloutBlockKey,
                          children: [
                            {
                              _type: 'span',
                              _key: calloutSpanKey,
                              text: 'callout',
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
        {
          _type: 'block',
          _key: block2Key,
          children: [{_type: 'span', _key: span2Key, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })
})
