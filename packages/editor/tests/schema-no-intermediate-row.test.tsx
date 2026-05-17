import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

/**
 * Normalisation walks registered container chains from the editor's
 * value root down to a placeholder text block - so a freshly-inserted
 * empty container can hold a caret without the caller having to
 * synthesise the chain manually.
 *
 * Pinned here:
 * 1. A two-level chain (table > cell, schema has no row) walks to
 *    a placeholder text block when the cell's content is empty.
 * 2. A three-level chain (table > row > cell) walks the full depth
 *    when the cell's content is empty.
 * 3. A degenerate value (`table > cell` directly when schema
 *    declares table > row > cell) - the cell is not in a valid
 *    container chain at this position (table.of does not declare
 *    cell positionally and the top-level entry for cell is gated by
 *    parent chain validity), so normalisation does NOT walk into it
 *    and the cell renders as a non-editable block-object placeholder.
 */
describe('normalisation walks registered container chains to completion', () => {
  test('table > cell (no row in schema): empty cell.content gets a placeholder text block', async () => {
    const keyGenerator = createTestKeyGenerator()

    const schemaNoRow = defineSchema({
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
    })

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: schemaNoRow,
      initialValue: [
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {
              _type: 'cell',
              _key: 'c0',
              // Empty - normalisation should fill a placeholder.
              content: [],
            },
          ],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'table',
              arrayField: 'rows',
              render: ({attributes, children}) => (
                <div data-testid="table" {...attributes}>
                  {children}
                </div>
              ),
              of: [
                defineContainer({
                  type: 'cell',
                  arrayField: 'content',
                  render: ({attributes, children}) => (
                    <div data-testid="cell" {...attributes}>
                      {children}
                    </div>
                  ),
                }),
              ],
            }),
          ]}
        />
      ),
    })

    expect(document.querySelector('[data-testid="table"]')).not.toEqual(null)
    expect(document.querySelector('[data-testid="cell"]')).not.toEqual(null)

    const snapshot = editor.getSnapshot()
    const table = snapshot.context.value[0] as unknown as {
      rows: ReadonlyArray<{
        _type: string
        content: ReadonlyArray<{
          _type: string
          children: ReadonlyArray<unknown>
        }>
      }>
    }
    expect(table.rows).toHaveLength(1)
    expect(table.rows[0]!._type).toBe('cell')
    expect(table.rows[0]!.content).toHaveLength(1)
    expect(table.rows[0]!.content[0]!._type).toBe('block')
  })

  test('table > row > cell (schema has row): empty cell.content gets a placeholder text block', async () => {
    const keyGenerator = createTestKeyGenerator()

    const schemaWithRow = defineSchema({
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

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: schemaWithRow,
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
                  content: [],
                },
              ],
            },
          ],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'table',
              arrayField: 'rows',
              render: ({attributes, children}) => (
                <div data-testid="table" {...attributes}>
                  {children}
                </div>
              ),
              of: [
                defineContainer({
                  type: 'row',
                  arrayField: 'cells',
                  render: ({attributes, children}) => (
                    <div data-testid="row" {...attributes}>
                      {children}
                    </div>
                  ),
                  of: [
                    defineContainer({
                      type: 'cell',
                      arrayField: 'content',
                      render: ({attributes, children}) => (
                        <div data-testid="cell" {...attributes}>
                          {children}
                        </div>
                      ),
                    }),
                  ],
                }),
              ],
            }),
          ]}
        />
      ),
    })

    expect(document.querySelector('[data-testid="row"]')).not.toEqual(null)
    expect(document.querySelector('[data-testid="cell"]')).not.toEqual(null)

    const snapshot = editor.getSnapshot()
    const table = snapshot.context.value[0] as unknown as {
      rows: ReadonlyArray<{
        cells: ReadonlyArray<{
          content: ReadonlyArray<{_type: string}>
        }>
      }>
    }
    expect(table.rows[0]!.cells[0]!.content).toHaveLength(1)
    expect(table.rows[0]!.cells[0]!.content[0]!._type).toBe('block')
  })

  test('schema has row, value skips it: cell directly under table.rows is not a registered container at this position', async () => {
    const keyGenerator = createTestKeyGenerator()

    const schemaWithRow = defineSchema({
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

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: schemaWithRow,
      initialValue: [
        {
          _type: 'table',
          _key: 't0',
          rows: [
            // Skipping row - this cell is in the wrong position
            // according to the schema (rows declares row, not cell).
            {
              _type: 'cell',
              _key: 'c0',
              content: [],
            },
          ],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'table',
              arrayField: 'rows',
              render: ({attributes, children}) => (
                <div data-testid="table" {...attributes}>
                  {children}
                </div>
              ),
              of: [
                defineContainer({
                  type: 'row',
                  arrayField: 'cells',
                  render: ({attributes, children}) => (
                    <div data-testid="row" {...attributes}>
                      {children}
                    </div>
                  ),
                  of: [
                    defineContainer({
                      type: 'cell',
                      arrayField: 'content',
                      render: ({attributes, children}) => (
                        <div data-testid="cell" {...attributes}>
                          {children}
                        </div>
                      ),
                    }),
                  ],
                }),
              ],
            }),
          ]}
        />
      ),
    })

    expect(document.querySelector('[data-testid="table"]')).not.toEqual(null)
    expect(document.querySelector('[data-testid="row"]')).toEqual(null)
    expect(document.querySelector('[data-testid="cell"]')).toEqual(null)

    // The cell node still lives in table.rows; normalisation did NOT
    // wrap it in a synthetic row. Its content stays empty because the
    // engine never recognises it as an editable container here.
    const snapshot = editor.getSnapshot()
    const table = snapshot.context.value[0] as unknown as {
      rows: ReadonlyArray<{
        _type: string
        _key: string
        content?: ReadonlyArray<unknown>
      }>
    }
    expect(table.rows).toHaveLength(1)
    expect(table.rows[0]!._type).toBe('cell')
    expect(table.rows[0]!.content).toHaveLength(0)
  })
})
