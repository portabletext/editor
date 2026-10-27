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

describe('custom.move.row', () => {
  test('Scenario: moving the first row to the last position reorders the rows', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: threeRowValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.move.row',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}],
      to: [{_key: 't0'}, 'rows', {_key: 'r2'}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [threeRowR1, threeRowR2, threeRowR0],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(threeRowValue)
    })
  })

  test('Scenario: moving the last row to the first position reorders the rows', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: threeRowValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.move.row',
      at: [{_key: 't0'}, 'rows', {_key: 'r2'}],
      to: [{_key: 't0'}, 'rows', {_key: 'r0'}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [threeRowR2, threeRowR0, threeRowR1],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(threeRowValue)
    })
  })

  test('Scenario: moving the middle row down reorders the rows', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: threeRowValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.move.row',
      at: [{_key: 't0'}, 'rows', {_key: 'r1'}],
      to: [{_key: 't0'}, 'rows', {_key: 'r2'}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [threeRowR0, threeRowR2, threeRowR1],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(threeRowValue)
    })
  })

  test('Scenario: moving the middle row up reorders the rows', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: threeRowValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.move.row',
      at: [{_key: 't0'}, 'rows', {_key: 'r1'}],
      to: [{_key: 't0'}, 'rows', {_key: 'r0'}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [threeRowR1, threeRowR0, threeRowR2],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(threeRowValue)
    })
  })

  test('Scenario: moving a row onto itself leaves the value unchanged', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: threeRowValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.move.row',
      at: [{_key: 't0'}, 'rows', {_key: 'r1'}],
      to: [{_key: 't0'}, 'rows', {_key: 'r1'}],
    })

    expect(editor.getSnapshot().context.value).toEqual(threeRowValue)
  })

  test('Scenario: an `at` pointing to a cell moves the closest row', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: threeRowValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.move.row',
      at: [{_key: 't0'}, 'rows', {_key: 'r1'}, 'cells', {_key: 'r1c0'}],
      to: [{_key: 't0'}, 'rows', {_key: 'r0'}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [threeRowR1, threeRowR0, threeRowR2],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(threeRowValue)
    })
  })

  test('Scenario: a `to` pointing to a cell moves the row to the closest row', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: threeRowValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.move.row',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}],
      to: [{_key: 't0'}, 'rows', {_key: 'r2'}, 'cells', {_key: 'r2c1'}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [threeRowR1, threeRowR2, threeRowR0],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(threeRowValue)
    })
  })
})

describe('custom.move.column', () => {
  test('Scenario: moving the first column to the last position reorders the cells', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: twoByTwoValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.move.column',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'r0c0'}],
      to: [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'r0c1'}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {...twoByTwoR0, cells: [twoByTwoR0C1, twoByTwoR0C0]},
            {...twoByTwoR1, cells: [twoByTwoR1C1, twoByTwoR1C0]},
          ],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(twoByTwoValue)
    })
  })

  test('Scenario: moving the last column to the first position reorders the cells', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: twoByTwoValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.move.column',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'r0c1'}],
      to: [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'r0c0'}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {...twoByTwoR0, cells: [twoByTwoR0C1, twoByTwoR0C0]},
            {...twoByTwoR1, cells: [twoByTwoR1C1, twoByTwoR1C0]},
          ],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(twoByTwoValue)
    })
  })

  test('Scenario: moving a column onto itself leaves the value unchanged', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: twoByTwoValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.move.column',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'r0c0'}],
      to: [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'r0c0'}],
    })

    expect(editor.getSnapshot().context.value).toEqual(twoByTwoValue)
  })

  test('Scenario: cell paths in different rows move the columns they belong to', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: twoByTwoValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.move.column',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'r0c0'}],
      to: [{_key: 't0'}, 'rows', {_key: 'r1'}, 'cells', {_key: 'r1c1'}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {...twoByTwoR0, cells: [twoByTwoR0C1, twoByTwoR0C0]},
            {...twoByTwoR1, cells: [twoByTwoR1C1, twoByTwoR1C0]},
          ],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(twoByTwoValue)
    })
  })

  test('Scenario: an `at` pointing inside a cell moves the closest column', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: twoByTwoValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.move.column',
      at: [
        {_key: 't0'},
        'rows',
        {_key: 'r0'},
        'cells',
        {_key: 'r0c0'},
        'value',
        {_key: 'r0c0b'},
      ],
      to: [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'r0c1'}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {...twoByTwoR0, cells: [twoByTwoR0C1, twoByTwoR0C0]},
            {...twoByTwoR1, cells: [twoByTwoR1C1, twoByTwoR1C0]},
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

describe('custom.move.row — selection recovery', () => {
  test('Scenario: a cursor inside the moved row follows it to the new position', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: threeRowValue,
      children: <TablePlugin />,
    })

    const cursor = pointInSpan('r0', 'r0c1')
    editor.send({type: 'select', at: {anchor: cursor, focus: cursor}})

    editor.send({
      type: 'custom.move.row',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}],
      to: [{_key: 't0'}, 'rows', {_key: 'r2'}],
    })

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(snapshot.context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [threeRowR1, threeRowR2, threeRowR0],
        },
      ])
      expect(snapshot.context.selection).toEqual({
        anchor: cursor,
        focus: cursor,
        backward: false,
      })
    })
  })

  test('Scenario: a cursor outside the moved row is preserved', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: threeRowValue,
      children: <TablePlugin />,
    })

    const cursor = pointInSpan('r2', 'r2c0')
    editor.send({type: 'select', at: {anchor: cursor, focus: cursor}})

    editor.send({
      type: 'custom.move.row',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}],
      to: [{_key: 't0'}, 'rows', {_key: 'r1'}],
    })

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(snapshot.context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [threeRowR1, threeRowR0, threeRowR2],
        },
      ])
      expect(snapshot.context.selection).toEqual({
        anchor: cursor,
        focus: cursor,
        backward: false,
      })
    })
  })
})

describe('custom.move.column — selection recovery', () => {
  test('Scenario: a cursor inside the moved column follows it to the new position', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: twoByTwoValue,
      children: <TablePlugin />,
    })

    const cursor = pointInSpan('r1', 'r1c0')
    editor.send({type: 'select', at: {anchor: cursor, focus: cursor}})

    editor.send({
      type: 'custom.move.column',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'r0c0'}],
      to: [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'r0c1'}],
    })

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(snapshot.context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {...twoByTwoR0, cells: [twoByTwoR0C1, twoByTwoR0C0]},
            {...twoByTwoR1, cells: [twoByTwoR1C1, twoByTwoR1C0]},
          ],
        },
      ])
      expect(snapshot.context.selection).toEqual({
        anchor: cursor,
        focus: cursor,
        backward: false,
      })
    })
  })
})
