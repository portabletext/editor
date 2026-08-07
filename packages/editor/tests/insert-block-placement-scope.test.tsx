import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

/**
 * `insert.block` with `placement: 'before' | 'after'` lands the block as a
 * sibling of the enclosing block at the destination, so its validation
 * scope is that block's parent array. Deriving the scope from the
 * destination path's own sub-schema view let a text block pass validation
 * against a table cell's content view and land inside `rows`.
 */

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'grid',
      fields: [
        {
          name: 'rows',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'gridRow',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      type: 'object',
                      name: 'gridCell',
                      fields: [
                        {name: 'value', type: 'array', of: [{type: 'block'}]},
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

const gridCell = (key: string) => ({
  _type: 'gridCell',
  _key: key,
  value: [
    {
      _type: 'block',
      _key: `b-${key}`,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: `s-${key}`, text: 'x', marks: []}],
    },
  ],
})

const gridValue = [
  {
    _type: 'grid',
    _key: 'g0',
    rows: [{_type: 'gridRow', _key: 'r0', cells: [gridCell('c00')]}],
  },
]

const rowPoint = {
  path: [{_key: 'g0'}, 'rows', {_key: 'r0'}],
  offset: 0,
}

const spanPoint = (offset: number) => ({
  path: [
    {_key: 'g0'},
    'rows',
    {_key: 'r0'},
    'cells',
    {_key: 'c00'},
    'value',
    {_key: 'b-c00'},
    'children',
    {_key: 's-c00'},
  ],
  offset,
})

async function createGridEditor() {
  const {editor, locator} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition,
    initialValue: gridValue,
    children: (
      <NodePlugin
        nodes={[
          defineContainer({
            type: 'grid',
            arrayField: 'rows',
            of: [
              defineContainer({
                type: 'gridRow',
                arrayField: 'cells',
                of: [defineContainer({type: 'gridCell', arrayField: 'value'})],
              }),
            ],
          }),
        ]}
      />
    ),
  })
  await vi.waitFor(() => expect.element(locator).toBeInTheDocument())
  editor.send({type: 'focus'})
  return editor
}

describe('insert.block sibling-placement validation scope', () => {
  test('a text block beside a row no-ops: `rows` does not accept it', async () => {
    const editor = await createGridEditor()

    editor.send({
      type: 'insert.block',
      block: {_type: 'block'},
      placement: 'before',
      at: {anchor: rowPoint, focus: rowPoint},
    })
    editor.send({
      type: 'insert.block',
      block: {_type: 'block'},
      placement: 'after',
      at: {anchor: rowPoint, focus: rowPoint},
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(gridValue)
    })
  })

  test('a row beside a row inserts: `rows` accepts it', async () => {
    const editor = await createGridEditor()

    editor.send({
      type: 'insert.block',
      block: {_type: 'gridRow', cells: [{_type: 'gridCell', value: []}]},
      placement: 'after',
      at: {anchor: rowPoint, focus: rowPoint},
    })

    await vi.waitFor(() => {
      const grid = editor.getSnapshot().context.value?.[0] as unknown as {
        rows: Array<{_type: string}>
      }
      expect(grid.rows.map((row) => row._type)).toEqual(['gridRow', 'gridRow'])
    })
  })

  test('a text block beside a cell block inserts: the cell accepts it', async () => {
    const editor = await createGridEditor()

    editor.send({
      type: 'insert.block',
      block: {_type: 'block'},
      placement: 'after',
      at: {anchor: spanPoint(1), focus: spanPoint(1)},
    })

    await vi.waitFor(() => {
      const grid = editor.getSnapshot().context.value?.[0] as unknown as {
        rows: Array<{cells: Array<{value: Array<{_type: string}>}>}>
      }
      expect(grid.rows[0]?.cells[0]?.value.map((block) => block._type)).toEqual(
        ['block', 'block'],
      )
    })
    expect(editor.getSnapshot().context.value).toHaveLength(1)
  })

  test('a text block beside the grid inserts at root', async () => {
    const editor = await createGridEditor()

    editor.send({
      type: 'insert.block',
      block: {_type: 'block'},
      placement: 'before',
      at: {
        anchor: {path: [{_key: 'g0'}], offset: 0},
        focus: {path: [{_key: 'g0'}], offset: 0},
      },
    })

    await vi.waitFor(() => {
      expect(
        editor.getSnapshot().context.value?.map((block) => block._type),
      ).toEqual(['block', 'grid'])
    })
  })
})
