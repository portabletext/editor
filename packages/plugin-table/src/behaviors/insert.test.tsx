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

const insertedRow = {
  _type: 'row',
  _key: 'k3',
  cells: [
    {
      _type: 'cell',
      _key: 'k2',
      value: [
        {
          _type: 'block',
          _key: 'k4',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
        },
      ],
    },
  ],
}

describe('custom.insert.row', () => {
  test('Scenario: a row inserted after a row lands below it', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.insert.row',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}],
      position: 'after',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [existingRow, insertedRow],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test('Scenario: a row inserted before a row lands above it', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.insert.row',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}],
      position: 'before',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [insertedRow, existingRow],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test('Scenario: a row inserted after a cell lands below the closest row', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.insert.row',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'c0'}],
      position: 'after',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [existingRow, insertedRow],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test('Scenario: a row inserted before a cell lands above the closest row', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.insert.row',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'c0'}],
      position: 'before',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [insertedRow, existingRow],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test('Scenario: a row inserted after the table lands at the end', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.insert.row',
      at: [{_key: 't0'}],
      position: 'after',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [existingRow, insertedRow],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test('Scenario: a row inserted before the table lands at the start', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.insert.row',
      at: [{_key: 't0'}],
      position: 'before',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [insertedRow, existingRow],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })
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

const insertedCellInR0 = {
  _type: 'cell',
  _key: 'k2',
  value: [
    {
      _type: 'block',
      _key: 'k6',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k7', text: '', marks: []}],
    },
  ],
}

const insertedCellInR1 = {
  _type: 'cell',
  _key: 'k3',
  value: [
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
    },
  ],
}

describe('custom.insert.column', () => {
  test('Scenario: a column inserted after a cell lands to its right', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: twoByTwoValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.insert.column',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'r0c0'}],
      position: 'after',
    })

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot().context.value
      expect(snapshot).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {
              ...twoByTwoR0,
              cells: [twoByTwoR0C0, insertedCellInR0, twoByTwoR0C1],
            },
            {
              ...twoByTwoR1,
              cells: [twoByTwoR1C0, insertedCellInR1, twoByTwoR1C1],
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

  test('Scenario: a column inserted before a cell lands to its left', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: twoByTwoValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.insert.column',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'r0c1'}],
      position: 'before',
    })

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot().context.value
      expect(snapshot).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {
              ...twoByTwoR0,
              cells: [twoByTwoR0C0, insertedCellInR0, twoByTwoR0C1],
            },
            {
              ...twoByTwoR1,
              cells: [twoByTwoR1C0, insertedCellInR1, twoByTwoR1C1],
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

  test('Scenario: a column inserted after the table lands at the end', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: twoByTwoValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.insert.column',
      at: [{_key: 't0'}],
      position: 'after',
    })

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot().context.value
      expect(snapshot).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {
              ...twoByTwoR0,
              cells: [twoByTwoR0C0, twoByTwoR0C1, insertedCellInR0],
            },
            {
              ...twoByTwoR1,
              cells: [twoByTwoR1C0, twoByTwoR1C1, insertedCellInR1],
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

  test('Scenario: a column inserted before the table lands at the start', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: twoByTwoValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.insert.column',
      at: [{_key: 't0'}],
      position: 'before',
    })

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot().context.value
      expect(snapshot).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {
              ...twoByTwoR0,
              cells: [insertedCellInR0, twoByTwoR0C0, twoByTwoR0C1],
            },
            {
              ...twoByTwoR1,
              cells: [insertedCellInR1, twoByTwoR1C0, twoByTwoR1C1],
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
