import {describe, expect, test} from 'vitest'
import {splitNodePath} from './split-node-path'

describe(splitNodePath.name, () => {
  test('block property path', () => {
    expect(splitNodePath([{_key: 'b1'}, 'style'])).toEqual({
      nodePath: [{_key: 'b1'}],
      propertyPath: ['style'],
    })
  })

  test('deep child path with no property trail', () => {
    expect(splitNodePath([{_key: 'b1'}, 'children', {_key: 's1'}])).toEqual({
      nodePath: [{_key: 'b1'}, 'children', {_key: 's1'}],
      propertyPath: [],
    })
  })

  test('nested property trail', () => {
    expect(
      splitNodePath([{_key: 'b1'}, 'children', {_key: 's1'}, 'text']),
    ).toEqual({
      nodePath: [{_key: 'b1'}, 'children', {_key: 's1'}],
      propertyPath: ['text'],
    })
  })

  test('numeric node segment', () => {
    expect(splitNodePath([3, 'style'])).toEqual({
      nodePath: [3],
      propertyPath: ['style'],
    })
  })

  test('all-string path has no node', () => {
    expect(splitNodePath(['style', 'level'])).toEqual({
      nodePath: [],
      propertyPath: ['style', 'level'],
    })
  })

  test('empty path', () => {
    expect(splitNodePath([])).toEqual({nodePath: [], propertyPath: []})
  })
})
