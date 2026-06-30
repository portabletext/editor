import {defineSchema} from '@portabletext/editor'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {TablePlugin} from '../plugin.table'

const schemaDefinition = defineSchema({
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
                          name: 'value',
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

const existingRow = {
  _type: 'row',
  _key: 'r0',
  cells: [
    {
      _type: 'cell',
      _key: 'c0',
      value: [
        {
          _type: 'block',
          _key: 'b0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 's0', text: '', marks: []}],
        },
      ],
    },
  ],
}

const initialValue = [
  {
    _type: 'table',
    _key: 't0',
    rows: [existingRow],
  },
]

const twoByTwoR0C0 = {
  _type: 'cell',
  _key: 'r0c0',
  value: [
    {
      _type: 'block',
      _key: 'r0c0b',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'r0c0s', text: '', marks: []}],
    },
  ],
}

const twoByTwoR0C1 = {
  _type: 'cell',
  _key: 'r0c1',
  value: [
    {
      _type: 'block',
      _key: 'r0c1b',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'r0c1s', text: '', marks: []}],
    },
  ],
}

const twoByTwoR1C0 = {
  _type: 'cell',
  _key: 'r1c0',
  value: [
    {
      _type: 'block',
      _key: 'r1c0b',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'r1c0s', text: '', marks: []}],
    },
  ],
}

const twoByTwoR1C1 = {
  _type: 'cell',
  _key: 'r1c1',
  value: [
    {
      _type: 'block',
      _key: 'r1c1b',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'r1c1s', text: '', marks: []}],
    },
  ],
}

const twoByTwoR0 = {
  _type: 'row',
  _key: 'r0',
  cells: [twoByTwoR0C0, twoByTwoR0C1],
}

const twoByTwoR1 = {
  _type: 'row',
  _key: 'r1',
  cells: [twoByTwoR1C0, twoByTwoR1C1],
}

const twoByTwoValue = [
  {
    _type: 'table',
    _key: 't0',
    rows: [twoByTwoR0, twoByTwoR1],
  },
]

describe('custom.unset.row', () => {
  test('unsets a row when `at` points to the row', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: twoByTwoValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.unset.row',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [twoByTwoR1],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(twoByTwoValue)
    })
  })

  test('finds the closest row when `at` points to a cell', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: twoByTwoValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.unset.row',
      at: [{_key: 't0'}, 'rows', {_key: 'r1'}, 'cells', {_key: 'r1c0'}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [twoByTwoR0],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(twoByTwoValue)
    })
  })
})

describe('custom.unset.column', () => {
  test('unsets a column when `at` points to a cell', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: twoByTwoValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.unset.column',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'r0c0'}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {
              ...twoByTwoR0,
              cells: [twoByTwoR0C1],
            },
            {
              ...twoByTwoR1,
              cells: [twoByTwoR1C1],
            },
          ],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(twoByTwoValue)
    })
  })
})

const threeRowR0C0 = {
  _type: 'cell',
  _key: 'r0c0',
  value: [
    {
      _type: 'block',
      _key: 'r0c0b',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'r0c0s', text: '', marks: []}],
    },
  ],
}

const threeRowR0C1 = {
  _type: 'cell',
  _key: 'r0c1',
  value: [
    {
      _type: 'block',
      _key: 'r0c1b',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'r0c1s', text: '', marks: []}],
    },
  ],
}

const threeRowR1C0 = {
  _type: 'cell',
  _key: 'r1c0',
  value: [
    {
      _type: 'block',
      _key: 'r1c0b',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'r1c0s', text: '', marks: []}],
    },
  ],
}

const threeRowR1C1 = {
  _type: 'cell',
  _key: 'r1c1',
  value: [
    {
      _type: 'block',
      _key: 'r1c1b',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'r1c1s', text: '', marks: []}],
    },
  ],
}

const threeRowR2C0 = {
  _type: 'cell',
  _key: 'r2c0',
  value: [
    {
      _type: 'block',
      _key: 'r2c0b',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'r2c0s', text: '', marks: []}],
    },
  ],
}

const threeRowR2C1 = {
  _type: 'cell',
  _key: 'r2c1',
  value: [
    {
      _type: 'block',
      _key: 'r2c1b',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'r2c1s', text: '', marks: []}],
    },
  ],
}

const threeRowR0 = {
  _type: 'row',
  _key: 'r0',
  cells: [threeRowR0C0, threeRowR0C1],
}

const threeRowR1 = {
  _type: 'row',
  _key: 'r1',
  cells: [threeRowR1C0, threeRowR1C1],
}

const threeRowR2 = {
  _type: 'row',
  _key: 'r2',
  cells: [threeRowR2C0, threeRowR2C1],
}

const threeRowValue = [
  {
    _type: 'table',
    _key: 't0',
    rows: [threeRowR0, threeRowR1, threeRowR2],
  },
]

function pointInSpan(rowKey: string, colKey: string) {
  return {
    path: [
      {_key: 't0'},
      'rows',
      {_key: rowKey},
      'cells',
      {_key: colKey},
      'value',
      {_key: `${colKey}b`},
      'children',
      {_key: `${colKey}s`},
    ],
    offset: 0,
  }
}

describe('custom.unset.row — selection recovery', () => {
  test('cursor inside the unset row moves to next row, same column', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: threeRowValue,
      children: <TablePlugin />,
    })

    const cursor = pointInSpan('r1', 'r1c1')
    editor.send({type: 'select', at: {anchor: cursor, focus: cursor}})

    editor.send({
      type: 'custom.unset.row',
      at: [{_key: 't0'}, 'rows', {_key: 'r1'}, 'cells', {_key: 'r1c1'}],
    })

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(snapshot.context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [threeRowR0, threeRowR2],
        },
      ])
      const recovered = pointInSpan('r2', 'r2c1')
      expect(snapshot.context.selection).toEqual({
        anchor: recovered,
        focus: recovered,
        backward: false,
      })
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(snapshot.context.value).toEqual(threeRowValue)
      expect(snapshot.context.selection).toEqual({
        anchor: cursor,
        focus: cursor,
        backward: false,
      })
    })
  })

  test('cursor in last row falls back to previous row, same column', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: threeRowValue,
      children: <TablePlugin />,
    })

    const cursor = pointInSpan('r2', 'r2c0')
    editor.send({type: 'select', at: {anchor: cursor, focus: cursor}})

    editor.send({
      type: 'custom.unset.row',
      at: [{_key: 't0'}, 'rows', {_key: 'r2'}, 'cells', {_key: 'r2c0'}],
    })

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(snapshot.context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [threeRowR0, threeRowR1],
        },
      ])
      const recovered = pointInSpan('r1', 'r1c0')
      expect(snapshot.context.selection).toEqual({
        anchor: recovered,
        focus: recovered,
        backward: false,
      })
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(snapshot.context.value).toEqual(threeRowValue)
      expect(snapshot.context.selection).toEqual({
        anchor: cursor,
        focus: cursor,
        backward: false,
      })
    })
  })

  test('cursor outside the unset row stays where it is', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: threeRowValue,
      children: <TablePlugin />,
    })

    const cursor = pointInSpan('r2', 'r2c1')
    editor.send({type: 'select', at: {anchor: cursor, focus: cursor}})

    editor.send({
      type: 'custom.unset.row',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}],
    })

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(snapshot.context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [threeRowR1, threeRowR2],
        },
      ])
      expect(snapshot.context.selection).toEqual({
        anchor: cursor,
        focus: cursor,
        backward: false,
      })
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(snapshot.context.value).toEqual(threeRowValue)
      expect(snapshot.context.selection).toEqual({
        anchor: cursor,
        focus: cursor,
        backward: false,
      })
    })
  })

  test('expanded selection spans the unset row — both endpoints survive, no corrective select', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: threeRowValue,
      children: <TablePlugin />,
    })

    const anchor = pointInSpan('r0', 'r0c0')
    const focus = pointInSpan('r2', 'r2c0')
    editor.send({type: 'select', at: {anchor, focus}})

    editor.send({
      type: 'custom.unset.row',
      at: [{_key: 't0'}, 'rows', {_key: 'r1'}],
    })

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(snapshot.context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [threeRowR0, threeRowR2],
        },
      ])
      expect(snapshot.context.selection).toEqual({
        anchor,
        focus,
        backward: false,
      })
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(snapshot.context.value).toEqual(threeRowValue)
      expect(snapshot.context.selection).toEqual({
        anchor,
        focus,
        backward: false,
      })
    })
  })

  test('guard refuses when there is only one row left', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.unset.row',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}],
    })

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(editor.getSnapshot().context.value).toEqual(initialValue)
  })
})

describe('custom.unset.column — selection recovery', () => {
  test('cursor inside the unset column moves to next column, same row', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: twoByTwoValue,
      children: <TablePlugin />,
    })

    const cursor = pointInSpan('r0', 'r0c0')
    editor.send({type: 'select', at: {anchor: cursor, focus: cursor}})

    editor.send({
      type: 'custom.unset.column',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'r0c0'}],
    })

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(snapshot.context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {
              ...twoByTwoR0,
              cells: [twoByTwoR0C1],
            },
            {
              ...twoByTwoR1,
              cells: [twoByTwoR1C1],
            },
          ],
        },
      ])
      const recovered = pointInSpan('r0', 'r0c1')
      expect(snapshot.context.selection).toEqual({
        anchor: recovered,
        focus: recovered,
        backward: false,
      })
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(snapshot.context.value).toEqual(twoByTwoValue)
      expect(snapshot.context.selection).toEqual({
        anchor: cursor,
        focus: cursor,
        backward: false,
      })
    })
  })

  test('cursor in the last column falls back to previous column', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: twoByTwoValue,
      children: <TablePlugin />,
    })

    const cursor = pointInSpan('r1', 'r1c1')
    editor.send({type: 'select', at: {anchor: cursor, focus: cursor}})

    editor.send({
      type: 'custom.unset.column',
      at: [{_key: 't0'}, 'rows', {_key: 'r1'}, 'cells', {_key: 'r1c1'}],
    })

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(snapshot.context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {
              ...twoByTwoR0,
              cells: [twoByTwoR0C0],
            },
            {
              ...twoByTwoR1,
              cells: [twoByTwoR1C0],
            },
          ],
        },
      ])
      const recovered = pointInSpan('r1', 'r1c0')
      expect(snapshot.context.selection).toEqual({
        anchor: recovered,
        focus: recovered,
        backward: false,
      })
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(snapshot.context.value).toEqual(twoByTwoValue)
      expect(snapshot.context.selection).toEqual({
        anchor: cursor,
        focus: cursor,
        backward: false,
      })
    })
  })

  test('guard refuses when there is only one column left', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.unset.column',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'c0'}],
    })

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(editor.getSnapshot().context.value).toEqual(initialValue)
  })
})

const preBlock = {
  _type: 'block',
  _key: 'pre',
  style: 'normal',
  markDefs: [],
  children: [{_type: 'span', _key: 'pres', text: 'before', marks: []}],
}

const postBlock = {
  _type: 'block',
  _key: 'post',
  style: 'normal',
  markDefs: [],
  children: [{_type: 'span', _key: 'posts', text: 'after', marks: []}],
}

const twoByTwoTable = {
  _type: 'table',
  _key: 't0',
  rows: [twoByTwoR0, twoByTwoR1],
}

const sandwichedTableValue = [preBlock, twoByTwoTable, postBlock]

const tableLastValue = [preBlock, twoByTwoTable]

const onlyPreValue = [preBlock]

const prePoint = {
  path: [{_key: 'pre'}, 'children', {_key: 'pres'}],
  offset: 0,
}

const postPoint = {
  path: [{_key: 'post'}, 'children', {_key: 'posts'}],
  offset: 0,
}

// When the table is the only block, the engine normalizes the empty document
// to a single empty text block. Keys are issued by createTestKeyGenerator after
// the initial editor setup consumed k0 and k1.
const placeholderBlock = {
  _type: 'block',
  _key: 'k2',
  style: 'normal',
  markDefs: [],
  children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
}

describe('custom.unset.table', () => {
  test('unsets the table when `at` points to the table', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: twoByTwoValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.unset.table',
      at: [{_key: 't0'}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([placeholderBlock])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(twoByTwoValue)
    })
  })

  test('unsets the table when `at` points to a row', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: twoByTwoValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.unset.table',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([placeholderBlock])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(twoByTwoValue)
    })
  })

  test('unsets the table when `at` points to a cell', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: twoByTwoValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.unset.table',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'r0c0'}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([placeholderBlock])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(twoByTwoValue)
    })
  })

  test('is a no-op when `at` does not resolve to a table', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: onlyPreValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.unset.table',
      at: [{_key: 'pre'}],
    })

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(editor.getSnapshot().context.value).toEqual(onlyPreValue)
  })
})

describe('custom.unset.table — selection recovery', () => {
  test('cursor inside the unset table moves to next sibling block', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: sandwichedTableValue,
      children: <TablePlugin />,
    })

    const cursor = pointInSpan('r0', 'r0c0')
    editor.send({type: 'select', at: {anchor: cursor, focus: cursor}})

    editor.send({
      type: 'custom.unset.table',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'r0c0'}],
    })

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(snapshot.context.value).toEqual([preBlock, postBlock])
      expect(snapshot.context.selection).toEqual({
        anchor: postPoint,
        focus: postPoint,
        backward: false,
      })
    })
  })

  test('cursor inside the unset table moves to previous sibling when no next exists', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: tableLastValue,
      children: <TablePlugin />,
    })

    const cursor = pointInSpan('r0', 'r0c0')
    editor.send({type: 'select', at: {anchor: cursor, focus: cursor}})

    editor.send({
      type: 'custom.unset.table',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'r0c0'}],
    })

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(snapshot.context.value).toEqual([preBlock])
      expect(snapshot.context.selection).toEqual({
        anchor: prePoint,
        focus: prePoint,
        backward: false,
      })
    })
  })

  test('cursor outside the table is preserved', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: sandwichedTableValue,
      children: <TablePlugin />,
    })

    editor.send({type: 'select', at: {anchor: prePoint, focus: prePoint}})

    editor.send({
      type: 'custom.unset.table',
      at: [{_key: 't0'}],
    })

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(snapshot.context.value).toEqual([preBlock, postBlock])
      expect(snapshot.context.selection).toEqual({
        anchor: prePoint,
        focus: prePoint,
        backward: false,
      })
    })
  })
})
