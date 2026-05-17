import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

/**
 * Same `_type` declared in two different structural positions in one schema.
 *
 * Schema declares an inline `cell` object under `table.rows[*].cells[*]`
 * AND a separate inline `cell` object under `organism.parts[*]`. Both have
 * the same `_type: 'cell'` and the same structural shape
 * (arrayField: 'content').
 *
 * Registrations are entirely nested: `table.of.row.of.cell` and
 * `organism.of.cell`. No top-level `cell` registration exists. The PR's
 * test matrix promises that two registrations for the same `_type` should
 * coexist by parent.
 *
 * The test feeds the editor a SHALLOW initial value - a table with no
 * rows, an organism with no parts - and asserts normalization expands
 * each one down to an empty cell holding an empty text block. If `cell`
 * is unrecognized as a container by normalization, the expansion stops
 * at `cells: []` / `parts: []` and there is no cell-with-block subtree.
 */

const sharedShapeSchema = defineSchema({
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
    {
      name: 'organism',
      fields: [
        {
          name: 'parts',
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

describe('same _type in two different lexical positions', () => {
  test('shallow table and organism normalize all the way down to a cell holding an empty text block', async () => {
    const keyGenerator = createTestKeyGenerator()

    const tableContainer = defineContainer({
      type: 'table',
      arrayField: 'rows',
      of: [
        defineContainer({
          type: 'row',
          arrayField: 'cells',
          of: [
            defineContainer({
              type: 'cell',
              arrayField: 'content',
            }),
          ],
        }),
      ],
    })

    const organismContainer = defineContainer({
      type: 'organism',
      arrayField: 'parts',
      of: [
        defineContainer({
          type: 'cell',
          arrayField: 'content',
        }),
      ],
    })

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: sharedShapeSchema,
      initialValue: [
        {_type: 'table', _key: 't0', rows: []},
        {_type: 'organism', _key: 'o0', parts: []},
      ],
      children: <NodePlugin nodes={[tableContainer, organismContainer]} />,
    })

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(snapshot.context.value).toEqual([
        {
          _key: 't0',
          _type: 'table',
          rows: [
            {
              _key: expect.any(String),
              _type: 'row',
              cells: [
                {
                  _key: expect.any(String),
                  _type: 'cell',
                  content: [
                    {
                      _key: expect.any(String),
                      _type: 'block',
                      children: [
                        {
                          _key: expect.any(String),
                          _type: 'span',
                          marks: [],
                          text: '',
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
          _key: 'o0',
          _type: 'organism',
          parts: [
            {
              _key: expect.any(String),
              _type: 'cell',
              content: [
                {
                  _key: expect.any(String),
                  _type: 'block',
                  children: [
                    {
                      _key: expect.any(String),
                      _type: 'span',
                      marks: [],
                      text: '',
                    },
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ])
    })
  })
})
