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

const twoByTwoR0C0 = {
  _type: 'cell',
  _key: 'r0c0',
  content: [
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
  content: [
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
  content: [
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
  content: [
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
  content: [
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
  content: [
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
  content: [
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
  content: [
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
  content: [
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
  content: [
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
  test('moves first row to last position', async () => {
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

  test('moves last row to first position', async () => {
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

  test('moves middle row down', async () => {
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

  test('moves middle row up', async () => {
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

  test('is a no-op when at and to point to the same row', async () => {
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

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(editor.getSnapshot().context.value).toEqual(threeRowValue)
  })

  test('finds closest row when at points to a cell', async () => {
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

  test('finds closest row when to points to a cell', async () => {
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
  test('moves first column to last position', async () => {
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

  test('moves last column to first position', async () => {
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

  test('is a no-op when at and to point to the same column', async () => {
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

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(editor.getSnapshot().context.value).toEqual(twoByTwoValue)
  })

  test('resolves column from cell paths in different rows', async () => {
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

  test('finds closest cell when at points deeper', async () => {
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
        'content',
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
      'content',
      {_key: `${colKey}b`},
      'children',
      {_key: `${colKey}s`},
    ],
    offset: 0,
  }
}

describe('custom.move.row — selection recovery', () => {
  test('cursor inside the moved row follows it to the new position', async () => {
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

  test('cursor outside the moved row is preserved', async () => {
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
  test('cursor inside the moved column follows it to the new position', async () => {
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
