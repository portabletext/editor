import {describe, expect, test} from 'vitest'
import {sortByPriority} from './priority.sort'
import {createEditorPriority} from './priority.types'

describe(sortByPriority.name, () => {
  test('empty array', () => {
    const result = sortByPriority([])
    expect(result).toEqual([])
  })

  test('single item', () => {
    const item = {priority: createEditorPriority({name: 'single'})}
    const result = sortByPriority([item])
    expect(result).toEqual([item])
  })

  test('two sets of priorities', () => {
    const a = createEditorPriority({name: 'a'})
    const b = createEditorPriority({
      name: 'b',
      reference: {priority: a, importance: 'higher'},
    })
    const b1 = createEditorPriority({
      name: 'b1',
      reference: {priority: b, importance: 'lower'},
    })
    const b2 = createEditorPriority({
      name: 'b2',
      reference: {priority: b, importance: 'lower'},
    })
    const c = createEditorPriority({
      name: 'c',
      reference: {priority: a, importance: 'higher'},
    })
    const c1 = createEditorPriority({
      name: 'c1',
      reference: {priority: c, importance: 'lower'},
    })
    const c2 = createEditorPriority({
      name: 'c2',
      reference: {priority: c, importance: 'lower'},
    })

    const items = [
      {priority: c1},
      {priority: c2},
      {priority: a},
      {priority: b1},
      {priority: b2},
      {priority: b},
      {priority: c},
    ]

    expect(sortByPriority(items).map((item) => item.priority.name)).toEqual([
      'b',
      'c',
      'b1',
      'b2',
      'c1',
      'c2',
      'a',
    ])
  })

  test('sub-priorities', () => {
    const a = createEditorPriority({name: 'a'})
    const b = createEditorPriority({
      name: 'b',
      reference: {priority: a, importance: 'lower'},
    })
    const b1 = createEditorPriority({
      name: 'b1',
      reference: {priority: b, importance: 'lower'},
    })
    const b2 = createEditorPriority({
      name: 'b2',
      reference: {priority: b1, importance: 'higher'},
    })

    const items = [{priority: b2}, {priority: b1}, {priority: a}]

    expect(sortByPriority(items).map((item) => item.priority.name)).toEqual([
      'a',
      'b2',
      'b1',
    ])
  })

  test('direct higher reference', () => {
    const a = createEditorPriority({
      name: 'a',
    })
    const b = createEditorPriority({
      name: 'b',
      reference: {priority: a, importance: 'higher'},
    })

    const items = [{priority: b}, {priority: a}]

    expect(sortByPriority(items).map((item) => item.priority.name)).toEqual([
      'b',
      'a',
    ])
  })

  test('direct lower reference', () => {
    const a = createEditorPriority({name: 'a'})
    const b = createEditorPriority({
      name: 'b',
      reference: {priority: a, importance: 'lower'},
    })

    const items = [{priority: b}, {priority: a}]

    expect(sortByPriority(items).map((item) => item.priority.name)).toEqual([
      'a',
      'b',
    ])
  })

  test('transitive references', () => {
    const a = createEditorPriority({name: 'a'})
    const b = createEditorPriority({
      name: 'b',
      reference: {priority: a, importance: 'lower'},
    })
    const c = createEditorPriority({
      name: 'c',
      reference: {priority: b, importance: 'higher'},
    })

    const items = [{priority: c}, {priority: b}, {priority: a}]

    expect(sortByPriority(items).map((item) => item.priority.name)).toEqual([
      'a',
      'c',
      'b',
    ])
  })

  test('transitive references #2', () => {
    const a = createEditorPriority({name: 'a'})
    const b = createEditorPriority({
      name: 'b',
      reference: {priority: a, importance: 'higher'},
    })
    const c = createEditorPriority({
      name: 'c',
      reference: {priority: b, importance: 'lower'},
    })

    const items = [{priority: c}, {priority: b}, {priority: a}]

    expect(sortByPriority(items).map((item) => item.priority.name)).toEqual([
      'b',
      'c',
      'a',
    ])
  })

  test('references to missing priorities', () => {
    const a = createEditorPriority({name: 'a'})
    const b = createEditorPriority({
      name: 'b',
      reference: {priority: a, importance: 'lower'},
    })
    const c = createEditorPriority({
      name: 'c',
      reference: {priority: b, importance: 'higher'},
    })
    const items = [{priority: a}, {priority: c}]

    expect(sortByPriority(items).map((item) => item.priority.name)).toEqual([
      'a',
      'c',
    ])
  })

  test('references to missing priorities #2', () => {
    const a = createEditorPriority({name: 'a'})
    const b = createEditorPriority({
      name: 'b',
      reference: {priority: a, importance: 'higher'},
    })
    const c = createEditorPriority({
      name: 'c',
      reference: {priority: b, importance: 'lower'},
    })
    const items = [{priority: a}, {priority: c}]

    expect(sortByPriority(items).map((item) => item.priority.name)).toEqual([
      'c',
      'a',
    ])
  })

  test('complex reference chains', () => {
    const a = createEditorPriority({
      name: 'a',
    })
    const b = createEditorPriority({
      name: 'b',
      reference: {priority: a, importance: 'lower'},
    })
    const c = createEditorPriority({
      name: 'c',
      reference: {priority: b, importance: 'higher'},
    })
    const d = createEditorPriority({
      name: 'd',
      reference: {priority: c, importance: 'lower'},
    })

    const items = [{priority: d}, {priority: c}, {priority: b}, {priority: a}]

    const result = sortByPriority(items)
    expect(result.map((item) => item.priority.name)).toEqual([
      'a',
      'c',
      'd',
      'b',
    ])
  })

  test('complex reference chains #2', () => {
    const a = createEditorPriority({
      name: 'a',
    })
    const b = createEditorPriority({
      name: 'b',
      reference: {priority: a, importance: 'higher'},
    })
    const c = createEditorPriority({
      name: 'c',
      reference: {priority: b, importance: 'lower'},
    })
    const d = createEditorPriority({
      name: 'd',
      reference: {priority: c, importance: 'higher'},
    })

    const items = [{priority: d}, {priority: c}, {priority: b}, {priority: a}]

    const result = sortByPriority(items)
    expect(result.map((item) => item.priority.name)).toEqual([
      'b',
      'd',
      'c',
      'a',
    ])
  })

  test('multiple independent chains', () => {
    const a1 = createEditorPriority({name: 'a1'})
    const a2 = createEditorPriority({
      name: 'a2',
      reference: {priority: a1, importance: 'lower'},
    })

    const b1 = createEditorPriority({name: 'b1'})
    const b2 = createEditorPriority({
      name: 'b2',
      reference: {priority: b1, importance: 'lower'},
    })

    const items = [
      {priority: a2},
      {priority: b1},
      {priority: a1},
      {priority: b2},
    ]

    const result = sortByPriority(items)
    const names = result.map((item) => item.priority.name)

    // Verify that a1 comes before a2 and b1 comes before b2
    expect(names.indexOf('a1')).toBeLessThan(names.indexOf('a2'))
    expect(names.indexOf('b1')).toBeLessThan(names.indexOf('b2'))
  })

  test('cyclic references', () => {
    const a = createEditorPriority({name: 'a'})
    const b = createEditorPriority({
      name: 'b',
      reference: {priority: a, importance: 'lower'},
    })
    const c = createEditorPriority({
      name: 'c',
      reference: {priority: b, importance: 'lower'},
    })
    a.reference = {priority: c, importance: 'lower'}

    const items = [{priority: a}, {priority: b}, {priority: c}]

    expect(() => sortByPriority(items)).toThrow()
  })

  test('missing priorities', () => {
    const a = createEditorPriority({name: 'a'})
    const b = createEditorPriority({
      name: 'b',
      reference: {priority: a, importance: 'lower'},
    })

    const items = [
      {name: 'd'},
      {name: 'c'},
      {priority: a, name: 'a'},
      {priority: b, name: 'b'},
    ]

    expect(sortByPriority(items).map((item) => item.name)).toEqual([
      'a',
      'b',
      'd',
      'c',
    ])
  })
})
