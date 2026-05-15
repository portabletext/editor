import {describe, expect, test} from 'vitest'
import {buildTableBlock} from '../src/insert-dialog'

describe('buildTableBlock', () => {
  test('produces a table with the requested dimensions and one empty paragraph per cell', () => {
    let counter = 0
    const keyGen = () => `k${counter++}`
    const block = buildTableBlock({
      rows: 3,
      columns: 2,
      headerRows: 1,
      keyGen,
    }) as {headerRows: number; rows: Array<unknown>}
    expect(block.headerRows).toBe(1)
    const rows = block.rows
    expect(rows).toHaveLength(3)
    for (const row of rows) {
      const r = row as {_type: string; cells: Array<unknown>}
      expect(r._type).toBe('row')
      expect(r.cells).toHaveLength(2)
      for (const cell of r.cells) {
        const c = cell as {
          _type: string
          content: Array<{_type: string; children: Array<{text: string}>}>
        }
        expect(c._type).toBe('cell')
        expect(c.content).toHaveLength(1)
        expect(c.content[0]._type).toBe('block')
        expect(c.content[0].children[0].text).toBe('')
      }
    }
  })

  test('clamps row/column counts inside the dialog bounds at the call site', () => {
    let counter = 0
    const keyGen = () => `k${counter++}`
    const block = buildTableBlock({rows: 1, columns: 1, headerRows: 0, keyGen})
    expect((block as unknown as {rows: Array<unknown>}).rows).toHaveLength(1)
    const firstRow = (
      block as unknown as {rows: Array<{cells: Array<unknown>}>}
    ).rows[0]
    expect(firstRow.cells).toHaveLength(1)
  })
})
