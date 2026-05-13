import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'
import {toTextspec} from '../test-utils/to-textspec'

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
                              type: 'object',
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
    type: 'code-block',
    childField: 'lines',
    render: ({children}) => <>{children}</>,
  }),
  defineContainer({
    type: 'fact-box',
    childField: 'content',
    render: ({children}) => <>{children}</>,
  }),
  defineContainer({
    type: 'callout',
    childField: 'content',
    render: ({children}) => <>{children}</>,
  }),
  defineContainer({
    type: 'table',
    childField: 'rows',
    render: ({children}) => <>{children}</>,
  }),
  defineContainer({
    type: 'row',
    childField: 'cells',
    render: ({children}) => <>{children}</>,
  }),
  defineContainer({
    type: 'cell',
    childField: 'content',
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'B: [@link href="https://example.com":^foo]',
          'CODE-BLOCK:',
          '  B: bar|',
        ].join('\n'),
      )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: [strong:^foo]', 'FACT-BOX:', '  B: [strong:bar]'].join('\n'),
      )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'B listItem="number": ^foo',
          'FACT-BOX:',
          '  B listItem="number": bar|',
        ].join('\n'),
      )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'B listItem="bullet": ^foo',
          'CALLOUT:',
          '  B listItem="bullet": bar|',
        ].join('\n'),
      )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B listItem="number": ^foo', 'CALLOUT:', '  B: bar|'].join('\n'),
      )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'B: [strong:^foo]',
          'TABLE:',
          '  ROW:',
          '    CELL:',
          '      B: [strong:cell]',
          '      CALLOUT:',
          '        B: [strong:callout]',
          'B: [strong:tail|]',
        ].join('\n'),
      )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'B: [em:^foo]',
          'TABLE:',
          '  ROW:',
          '    CELL:',
          '      B: [em:cell]',
          '      CALLOUT:',
          '        B: callout',
          'B: [em:tail|]',
        ].join('\n'),
      )
    })
  })
})
