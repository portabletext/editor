import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

/**
 * Container archetype permutations.
 *
 * Four archetypes, each chosen to exercise a distinct class of behaviour:
 *
 *   - `code-block`     locked-down. Every dimension empty.
 *   - `fact-box`       full inheritance. Mirrors root.
 *   - `callout`        selective subsets. ONE-OF in each dimension,
 *                       `bullet` only (no `number`).
 *   - `table.cell`     deep structural + heterogeneous depth. Cell
 *                       narrows decorators; callout-in-cell narrows
 *                       differently again.
 */

const matrixSchema = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
  annotations: [
    {name: 'link', fields: [{name: 'href', type: 'string'}]},
    {name: 'comment', fields: [{name: 'text', type: 'string'}]},
  ],
  lists: [{name: 'bullet'}, {name: 'number'}],
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
              annotations: [],
              lists: [],
              styles: [],
            },
          ],
        },
      ],
    },
    {
      name: 'fact-box',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [
            {
              type: 'block',
              decorators: [{name: 'strong'}, {name: 'em'}],
              annotations: [
                {name: 'link', fields: [{name: 'href', type: 'string'}]},
                {name: 'comment', fields: [{name: 'text', type: 'string'}]},
              ],
              lists: [{name: 'bullet'}, {name: 'number'}],
              styles: [{name: 'normal'}, {name: 'h1'}],
            },
          ],
        },
      ],
    },
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [
            {
              type: 'block',
              decorators: [{name: 'strong'}],
              annotations: [
                {name: 'comment', fields: [{name: 'text', type: 'string'}]},
              ],
              lists: [{name: 'bullet'}],
              styles: [{name: 'normal'}],
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
                            {
                              type: 'block',
                              decorators: [{name: 'strong'}, {name: 'em'}],
                              annotations: [
                                {
                                  name: 'link',
                                  fields: [{name: 'href', type: 'string'}],
                                },
                              ],
                              lists: [],
                              styles: [{name: 'normal'}],
                            },
                            {
                              type: 'callout',
                              fields: [
                                {
                                  name: 'content',
                                  type: 'array',
                                  of: [
                                    {
                                      type: 'block',
                                      decorators: [{name: 'strong'}],
                                      annotations: [
                                        {
                                          name: 'comment',
                                          fields: [
                                            {name: 'text', type: 'string'},
                                          ],
                                        },
                                      ],
                                      lists: [{name: 'bullet'}],
                                      styles: [{name: 'normal'}],
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

const matrixContainers = [
  defineContainer({
    scope: '$..code-block',
    field: 'lines',
    render: ({children}) => <>{children}</>,
  }),
  defineContainer({
    scope: '$..fact-box',
    field: 'content',
    render: ({children}) => <>{children}</>,
  }),
  defineContainer({
    scope: '$..callout',
    field: 'content',
    render: ({children}) => <>{children}</>,
  }),
  defineContainer({
    scope: '$..table',
    field: 'rows',
    render: ({children}) => <>{children}</>,
  }),
  defineContainer({
    scope: '$..table.row',
    field: 'cells',
    render: ({children}) => <>{children}</>,
  }),
  defineContainer({
    scope: '$..table.row.cell',
    field: 'content',
    render: ({children}) => <>{children}</>,
  }),
]

describe('container archetype permutations', () => {
  // ============================================================
  // ARCHETYPE 1   code-block (locked-down)
  // ============================================================

  test('code-block: toggle annotation across root + code-block only annotates root', async () => {
    const keyGenerator = createTestKeyGenerator()
    const rootKey = keyGenerator()
    const rootSpan = keyGenerator()
    const cbKey = keyGenerator()
    const lineKey = keyGenerator()
    const lineSpan = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: matrixSchema,
      initialValue: [
        {
          _type: 'block',
          _key: rootKey,
          children: [{_type: 'span', _key: rootSpan, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'code-block',
          _key: cbKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: lineSpan, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={matrixContainers} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: rootKey}, 'children', {_key: rootSpan}],
          offset: 0,
        },
        focus: {
          path: [
            {_key: cbKey},
            'lines',
            {_key: lineKey},
            'children',
            {_key: lineSpan},
          ],
          offset: 3,
        },
      },
    })

    editor.send({
      type: 'annotation.toggle',
      annotation: {name: 'link', value: {href: 'https://example.com'}},
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: rootKey,
          children: [
            {_type: 'span', _key: rootSpan, text: 'foo', marks: ['k7']},
          ],
          markDefs: [{_type: 'link', _key: 'k7', href: 'https://example.com'}],
          style: 'normal',
        },
        {
          _type: 'code-block',
          _key: cbKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: lineSpan, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  // ============================================================
  // ARCHETYPE 2   fact-box (mirrors root)
  // ============================================================

  test('fact-box: toggle bold across root + fact-box bolds both', async () => {
    const keyGenerator = createTestKeyGenerator()
    const rootKey = keyGenerator()
    const rootSpan = keyGenerator()
    const fbKey = keyGenerator()
    const fbBlockKey = keyGenerator()
    const fbSpan = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: matrixSchema,
      initialValue: [
        {
          _type: 'block',
          _key: rootKey,
          children: [{_type: 'span', _key: rootSpan, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'fact-box',
          _key: fbKey,
          content: [
            {
              _type: 'block',
              _key: fbBlockKey,
              children: [{_type: 'span', _key: fbSpan, text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={matrixContainers} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: rootKey}, 'children', {_key: rootSpan}],
          offset: 0,
        },
        focus: {
          path: [
            {_key: fbKey},
            'content',
            {_key: fbBlockKey},
            'children',
            {_key: fbSpan},
          ],
          offset: 3,
        },
      },
    })

    editor.send({type: 'decorator.toggle', decorator: 'strong'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: rootKey,
          children: [
            {_type: 'span', _key: rootSpan, text: 'foo', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'fact-box',
          _key: fbKey,
          content: [
            {
              _type: 'block',
              _key: fbBlockKey,
              children: [
                {_type: 'span', _key: fbSpan, text: 'bar', marks: ['strong']},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('fact-box: toggle numbered list across root + fact-box applies to both', async () => {
    const keyGenerator = createTestKeyGenerator()
    const rootKey = keyGenerator()
    const rootSpan = keyGenerator()
    const fbKey = keyGenerator()
    const fbBlockKey = keyGenerator()
    const fbSpan = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: matrixSchema,
      initialValue: [
        {
          _type: 'block',
          _key: rootKey,
          children: [{_type: 'span', _key: rootSpan, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'fact-box',
          _key: fbKey,
          content: [
            {
              _type: 'block',
              _key: fbBlockKey,
              children: [{_type: 'span', _key: fbSpan, text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={matrixContainers} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: rootKey}, 'children', {_key: rootSpan}],
          offset: 0,
        },
        focus: {
          path: [
            {_key: fbKey},
            'content',
            {_key: fbBlockKey},
            'children',
            {_key: fbSpan},
          ],
          offset: 3,
        },
      },
    })

    editor.send({type: 'list item.toggle', listItem: 'number'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: rootKey,
          children: [{_type: 'span', _key: rootSpan, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'number',
          level: 1,
        },
        {
          _type: 'fact-box',
          _key: fbKey,
          content: [
            {
              _type: 'block',
              _key: fbBlockKey,
              children: [{_type: 'span', _key: fbSpan, text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
              listItem: 'number',
              level: 1,
            },
          ],
        },
      ])
    })
  })

  // ============================================================
  // ARCHETYPE 3   callout (narrowed list: bullet only)
  // ============================================================

  test('callout: toggle bullet across root + callout applies to both', async () => {
    const keyGenerator = createTestKeyGenerator()
    const rootKey = keyGenerator()
    const rootSpan = keyGenerator()
    const coKey = keyGenerator()
    const coBlockKey = keyGenerator()
    const coSpan = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: matrixSchema,
      initialValue: [
        {
          _type: 'block',
          _key: rootKey,
          children: [{_type: 'span', _key: rootSpan, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: coKey,
          content: [
            {
              _type: 'block',
              _key: coBlockKey,
              children: [{_type: 'span', _key: coSpan, text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={matrixContainers} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: rootKey}, 'children', {_key: rootSpan}],
          offset: 0,
        },
        focus: {
          path: [
            {_key: coKey},
            'content',
            {_key: coBlockKey},
            'children',
            {_key: coSpan},
          ],
          offset: 3,
        },
      },
    })

    editor.send({type: 'list item.toggle', listItem: 'bullet'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: rootKey,
          children: [{_type: 'span', _key: rootSpan, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'bullet',
          level: 1,
        },
        {
          _type: 'callout',
          _key: coKey,
          content: [
            {
              _type: 'block',
              _key: coBlockKey,
              children: [{_type: 'span', _key: coSpan, text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
              listItem: 'bullet',
              level: 1,
            },
          ],
        },
      ])
    })
  })

  test('callout: toggle number across root + callout only applies at root (callout out of scope for number)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const rootKey = keyGenerator()
    const rootSpan = keyGenerator()
    const coKey = keyGenerator()
    const coBlockKey = keyGenerator()
    const coSpan = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: matrixSchema,
      initialValue: [
        {
          _type: 'block',
          _key: rootKey,
          children: [{_type: 'span', _key: rootSpan, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: coKey,
          content: [
            {
              _type: 'block',
              _key: coBlockKey,
              children: [{_type: 'span', _key: coSpan, text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={matrixContainers} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: rootKey}, 'children', {_key: rootSpan}],
          offset: 0,
        },
        focus: {
          path: [
            {_key: coKey},
            'content',
            {_key: coBlockKey},
            'children',
            {_key: coSpan},
          ],
          offset: 3,
        },
      },
    })

    editor.send({type: 'list item.toggle', listItem: 'number'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: rootKey,
          children: [{_type: 'span', _key: rootSpan, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
          listItem: 'number',
          level: 1,
        },
        {
          _type: 'callout',
          _key: coKey,
          content: [
            {
              _type: 'block',
              _key: coBlockKey,
              children: [{_type: 'span', _key: coSpan, text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  // ============================================================
  // ARCHETYPE 4   table.cell with nested callout (heterogeneous depth)
  // ============================================================

  test('table.cell + nested callout: toggle strong across root + cell + nested callout bolds all three', async () => {
    const keyGenerator = createTestKeyGenerator()
    const rootKey = keyGenerator()
    const rootSpan = keyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const cellBlockKey = keyGenerator()
    const cellSpan = keyGenerator()
    const calloutKey = keyGenerator()
    const calloutBlockKey = keyGenerator()
    const calloutSpan = keyGenerator()
    const tailKey = keyGenerator()
    const tailSpan = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: matrixSchema,
      initialValue: [
        {
          _type: 'block',
          _key: rootKey,
          children: [{_type: 'span', _key: rootSpan, text: 'foo', marks: []}],
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
                          _key: cellSpan,
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
                      content: [
                        {
                          _type: 'block',
                          _key: calloutBlockKey,
                          children: [
                            {
                              _type: 'span',
                              _key: calloutSpan,
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
          _key: tailKey,
          children: [{_type: 'span', _key: tailSpan, text: 'tail', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <ContainerPlugin containers={matrixContainers} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: rootKey}, 'children', {_key: rootSpan}],
          offset: 0,
        },
        focus: {
          path: [{_key: tailKey}, 'children', {_key: tailSpan}],
          offset: 4,
        },
      },
    })

    editor.send({type: 'decorator.toggle', decorator: 'strong'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: rootKey,
          children: [
            {_type: 'span', _key: rootSpan, text: 'foo', marks: ['strong']},
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
                          _key: cellSpan,
                          text: 'cell',
                          marks: ['strong'],
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
                          _key: calloutBlockKey,
                          children: [
                            {
                              _type: 'span',
                              _key: calloutSpan,
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
          _key: tailKey,
          children: [
            {_type: 'span', _key: tailSpan, text: 'tail', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('table.cell + nested callout: toggle em applies to root + cell, NOT to nested callout (callout-in-cell narrows em out)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const rootKey = keyGenerator()
    const rootSpan = keyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const cellBlockKey = keyGenerator()
    const cellSpan = keyGenerator()
    const calloutKey = keyGenerator()
    const calloutBlockKey = keyGenerator()
    const calloutSpan = keyGenerator()
    const tailKey = keyGenerator()
    const tailSpan = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: matrixSchema,
      initialValue: [
        {
          _type: 'block',
          _key: rootKey,
          children: [{_type: 'span', _key: rootSpan, text: 'foo', marks: []}],
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
                          _key: cellSpan,
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
                      content: [
                        {
                          _type: 'block',
                          _key: calloutBlockKey,
                          children: [
                            {
                              _type: 'span',
                              _key: calloutSpan,
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
          _key: tailKey,
          children: [{_type: 'span', _key: tailSpan, text: 'tail', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <ContainerPlugin containers={matrixContainers} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: rootKey}, 'children', {_key: rootSpan}],
          offset: 0,
        },
        focus: {
          path: [{_key: tailKey}, 'children', {_key: tailSpan}],
          offset: 4,
        },
      },
    })

    editor.send({type: 'decorator.toggle', decorator: 'em'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: rootKey,
          children: [
            {_type: 'span', _key: rootSpan, text: 'foo', marks: ['em']},
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
                          _key: cellSpan,
                          text: 'cell',
                          marks: ['em'],
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
                          _key: calloutBlockKey,
                          children: [
                            {
                              _type: 'span',
                              _key: calloutSpan,
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
          _key: tailKey,
          children: [
            {_type: 'span', _key: tailSpan, text: 'tail', marks: ['em']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })
})
