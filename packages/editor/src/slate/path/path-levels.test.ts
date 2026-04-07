import {describe, expect, test} from 'vitest'
import {pathLevels} from './path-levels'

describe(pathLevels.name, () => {
  test('empty path', () => {
    expect(pathLevels([])).toEqual([[]])
  })

  test('keyed block path', () => {
    expect(pathLevels([{_key: 'b1'}])).toEqual([[], [{_key: 'b1'}]])
  })

  test('keyed block and span', () => {
    expect(pathLevels([{_key: 'b1'}, 'children', {_key: 's1'}])).toEqual([
      [],
      [{_key: 'b1'}],
      [{_key: 'b1'}, 'children', {_key: 's1'}],
    ])
  })

  test('numeric path', () => {
    expect(pathLevels([0])).toEqual([[], [0]])
  })

  test('mixed numeric and keyed', () => {
    expect(pathLevels([0, 'children', {_key: 's1'}])).toEqual([
      [],
      [0],
      [0, 'children', {_key: 's1'}],
    ])
  })

  test('string-only segments are skipped', () => {
    expect(pathLevels(['children'])).toEqual([[]])
  })
})
