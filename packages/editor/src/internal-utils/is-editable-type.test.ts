import {describe, expect, test} from 'vitest'
import {isEditableType} from './is-editable-type'

describe(isEditableType.name, () => {
  test('direct match', () => {
    const editableTypes = new Set(['table', 'table.row', 'table.row.cell'])
    expect(isEditableType(editableTypes, 'table')).toBe(true)
  })

  test('scoped suffix match', () => {
    const editableTypes = new Set(['table', 'table.row', 'table.row.cell'])
    expect(isEditableType(editableTypes, 'row')).toBe(true)
  })

  test('deeply scoped suffix match', () => {
    const editableTypes = new Set(['table', 'table.row', 'table.row.cell'])
    expect(isEditableType(editableTypes, 'cell')).toBe(true)
  })

  test('no match', () => {
    const editableTypes = new Set(['table', 'table.row', 'table.row.cell'])
    expect(isEditableType(editableTypes, 'image')).toBe(false)
  })

  test('empty set', () => {
    const editableTypes = new Set<string>()
    expect(isEditableType(editableTypes, 'table')).toBe(false)
  })

  test('partial name does not match', () => {
    const editableTypes = new Set(['table', 'table.row'])
    expect(isEditableType(editableTypes, 'tab')).toBe(false)
  })

  test('suffix must follow a dot', () => {
    const editableTypes = new Set(['notable'])
    expect(isEditableType(editableTypes, 'table')).toBe(false)
  })
})
