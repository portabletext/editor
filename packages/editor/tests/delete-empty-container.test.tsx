import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'
import {toTextspec} from '../test-utils/to-textspec'

/**
 * Pressing Backspace or Delete inside an empty callout should remove the
 * callout entirely. The structural-container heuristic kicks in only when the
 * callout has *content* — empty containers don't earn preservation.
 */

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
  ],
})

const containers = [
  defineContainer<typeof schemaDefinition>({
    scope: '$..callout',
    field: 'content',
  }),
]

describe('delete on empty container', () => {
  test('Backspace in empty callout with text block before unwraps to root', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
        },
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'cb0',
              children: [{_type: 'span', _key: 'cs0', text: '', marks: []}],
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'cb0'},
            'children',
            {_key: 'cs0'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'cb0'},
            'children',
            {_key: 'cs0'},
          ],
          offset: 0,
        },
      },
    })

    editor.send({type: 'delete', direction: 'backward'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo\nB: |')
    })
  })

  test('Backspace in empty callout with text block after unwraps to root', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'cb0',
              children: [{_type: 'span', _key: 'cs0', text: '', marks: []}],
            },
          ],
        },
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'cb0'},
            'children',
            {_key: 'cs0'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'cb0'},
            'children',
            {_key: 'cs0'},
          ],
          offset: 0,
        },
      },
    })

    editor.send({type: 'delete', direction: 'backward'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: |\nB: foo')
    })
  })

  test('Backspace in empty callout that is the only block leaves a placeholder text block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'cb0',
              children: [{_type: 'span', _key: 'cs0', text: '', marks: []}],
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'cb0'},
            'children',
            {_key: 'cs0'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'cb0'},
            'children',
            {_key: 'cs0'},
          ],
          offset: 0,
        },
      },
    })

    editor.send({type: 'delete', direction: 'backward'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: |')
    })
  })

  test('Delete in empty callout with text block after unwraps to root', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'cb0',
              children: [{_type: 'span', _key: 'cs0', text: '', marks: []}],
            },
          ],
        },
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'cb0'},
            'children',
            {_key: 'cs0'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'cb0'},
            'children',
            {_key: 'cs0'},
          ],
          offset: 0,
        },
      },
    })

    editor.send({type: 'delete'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: |\nB: foo')
    })
  })
})

/**
 * Cascade rule: a Backspace or Delete that starts inside a lonely empty
 * editable container walks up the ancestor chain looking for the first
 * ancestor whose parent field accepts the payload (the original empty
 * text block). When found, every container from origin up through that
 * ancestor is unset and the payload lands at the ancestor's sibling
 * position. If a non-lonely ancestor is hit before an accepting parent
 * is found, the whole cascade no-ops.
 *
 * In practice we only ever cascade with an empty text block as payload,
 * so the gate is "does this level's parent's of include {type: 'block'}".
 */

const tableSchemaPermissive = defineSchema({
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
  ],
})

const tableContainersPermissive = [
  defineContainer<typeof tableSchemaPermissive>({
    scope: '$..table',
    field: 'rows',
  }),
  defineContainer<typeof tableSchemaPermissive>({
    scope: '$..table.row',
    field: 'cells',
  }),
  defineContainer<typeof tableSchemaPermissive>({
    scope: '$..table.row.cell',
    field: 'content',
  }),
  defineContainer<typeof tableSchemaPermissive>({
    scope: '$..table.row.cell.callout',
    field: 'content',
  }),
]

const tableSchemaStructural = defineSchema({
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
                              type: 'callout',
                              fields: [
                                {
                                  name: 'content',
                                  type: 'array',
                                  of: [{type: 'block'}],
                                },
                              ],
                            },
                            {type: 'image'},
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

const tableContainersStructural = [
  defineContainer<typeof tableSchemaStructural>({
    scope: '$..table',
    field: 'rows',
  }),
  defineContainer<typeof tableSchemaStructural>({
    scope: '$..table.row',
    field: 'cells',
  }),
  defineContainer<typeof tableSchemaStructural>({
    scope: '$..table.row.cell',
    field: 'content',
  }),
  defineContainer<typeof tableSchemaStructural>({
    scope: '$..table.row.cell.callout',
    field: 'content',
  }),
]

const calloutInPermissiveCellSelection = {
  path: [
    {_key: 't0'},
    'rows',
    {_key: 'r0'},
    'cells',
    {_key: 'c0'},
    'content',
    {_key: 'co0'},
    'content',
    {_key: 'cb0'},
    'children',
    {_key: 'cs0'},
  ],
  offset: 0,
}

describe('delete on empty container - nested cascade', () => {
  test('Backspace in empty callout in permissive cell unwraps only the callout', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: tableSchemaPermissive,
      initialValue: [
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {
              _type: 'row',
              _key: 'r0',
              cells: [
                {
                  _type: 'cell',
                  _key: 'c0',
                  content: [
                    {
                      _type: 'callout',
                      _key: 'co0',
                      content: [
                        {
                          _type: 'block',
                          _key: 'cb0',
                          children: [
                            {_type: 'span', _key: 'cs0', text: '', marks: []},
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
      children: <ContainerPlugin containers={tableContainersPermissive} />,
    })

    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    editor.send({
      type: 'select',
      at: {
        anchor: calloutInPermissiveCellSelection,
        focus: calloutInPermissiveCellSelection,
      },
    })

    editor.send({type: 'delete', direction: 'backward'})

    await vi.waitFor(() => {
      // Cell accepts text blocks, so the cascade stops at the cell:
      // only the callout is unset. The callout's empty text block
      // takes its place inside the cell. Table and row stay intact.
      const value = editor.getSnapshot().context.value
      expect(value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {
              _type: 'row',
              _key: 'r0',
              cells: [
                {
                  _type: 'cell',
                  _key: 'c0',
                  content: [
                    {
                      _type: 'block',
                      _key: 'cb0',
                      children: [
                        {_type: 'span', _key: 'cs0', text: '', marks: []},
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

  test('Backspace in empty callout in lonely structural cell cascades all the way to root', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: tableSchemaStructural,
      initialValue: [
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {
              _type: 'row',
              _key: 'r0',
              cells: [
                {
                  _type: 'cell',
                  _key: 'c0',
                  content: [
                    {
                      _type: 'callout',
                      _key: 'co0',
                      content: [
                        {
                          _type: 'block',
                          _key: 'cb0',
                          children: [
                            {_type: 'span', _key: 'cs0', text: '', marks: []},
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
      children: <ContainerPlugin containers={tableContainersStructural} />,
    })

    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    editor.send({
      type: 'select',
      at: {
        anchor: calloutInPermissiveCellSelection,
        focus: calloutInPermissiveCellSelection,
      },
    })

    editor.send({type: 'delete', direction: 'backward'})

    await vi.waitFor(() => {
      // Cell rejects text blocks, row only accepts cell, table only
      // accepts row. Cascade promotes all the way to root, which does
      // accept text blocks. Table+row+cell+callout all unset, empty
      // text block becomes the lone block at root.
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: |')
    })
  })

  test('Backspace in empty callout in lonely structural cell with text block before lands payload after that text block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: tableSchemaStructural,
      initialValue: [
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
        },
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {
              _type: 'row',
              _key: 'r0',
              cells: [
                {
                  _type: 'cell',
                  _key: 'c0',
                  content: [
                    {
                      _type: 'callout',
                      _key: 'co0',
                      content: [
                        {
                          _type: 'block',
                          _key: 'cb0',
                          children: [
                            {_type: 'span', _key: 'cs0', text: '', marks: []},
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
      children: <ContainerPlugin containers={tableContainersStructural} />,
    })

    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    editor.send({
      type: 'select',
      at: {
        anchor: calloutInPermissiveCellSelection,
        focus: calloutInPermissiveCellSelection,
      },
    })

    editor.send({type: 'delete', direction: 'backward'})

    await vi.waitFor(() => {
      // Backspace direction = before; payload lands before the table's
      // sibling position (i.e. as the new second block, after foo).
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo\nB: |')
    })
  })

  test('Backspace in empty callout in structural cell with sibling cells is a no-op', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: tableSchemaStructural,
      initialValue: [
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {
              _type: 'row',
              _key: 'r0',
              cells: [
                {
                  _type: 'cell',
                  _key: 'c0',
                  content: [
                    {
                      _type: 'callout',
                      _key: 'co0',
                      content: [
                        {
                          _type: 'block',
                          _key: 'cb0',
                          children: [
                            {_type: 'span', _key: 'cs0', text: '', marks: []},
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: 'c1',
                  content: [
                    {
                      _type: 'callout',
                      _key: 'co1',
                      content: [
                        {
                          _type: 'block',
                          _key: 'cb1',
                          children: [
                            {
                              _type: 'span',
                              _key: 'cs1',
                              text: 'bar',
                              marks: [],
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
      children: <ContainerPlugin containers={tableContainersStructural} />,
    })

    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    const before = editor.getSnapshot().context.value

    editor.send({
      type: 'select',
      at: {
        anchor: calloutInPermissiveCellSelection,
        focus: calloutInPermissiveCellSelection,
      },
    })

    editor.send({type: 'delete', direction: 'backward'})

    await vi.waitFor(() => {
      // Cell rejects text blocks. Cascade tries to promote past cell,
      // but the cell has a sibling (c1), so promotion would damage
      // sibling content. Whole cascade no-ops; the table is unchanged.
      expect(editor.getSnapshot().context.value).toEqual(before)
    })
  })
})
