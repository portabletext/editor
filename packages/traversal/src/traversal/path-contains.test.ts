import {describe, expect, test} from 'vitest'
import type {Path} from '../types/paths'
import {pathContains} from './path-contains'

describe(pathContains.name, () => {
  test('equal paths', () => {
    const a: Path = [{_key: 'b0'}, 'children', {_key: 's0'}]
    const b: Path = [{_key: 'b0'}, 'children', {_key: 's0'}]
    expect(pathContains(a, b)).toBe(true)
  })

  test('strict ancestor', () => {
    const ancestor: Path = [{_key: 'b0'}]
    const descendant: Path = [{_key: 'b0'}, 'children', {_key: 's0'}]
    expect(pathContains(ancestor, descendant)).toBe(true)
  })

  test('deep strict ancestor inside a container', () => {
    const ancestor: Path = [{_key: 't0'}, 'rows', {_key: 'r0'}]
    const descendant: Path = [
      {_key: 't0'},
      'rows',
      {_key: 'r0'},
      'cells',
      {_key: 'r0c0'},
      'content',
      {_key: 'r0c0b'},
    ]
    expect(pathContains(ancestor, descendant)).toBe(true)
  })

  test('sibling paths are not contained', () => {
    const a: Path = [{_key: 'b0'}]
    const b: Path = [{_key: 'b1'}]
    expect(pathContains(a, b)).toBe(false)
  })

  test('descendant does not contain its ancestor', () => {
    const ancestor: Path = [{_key: 'b0'}]
    const descendant: Path = [{_key: 'b0'}, 'children', {_key: 's0'}]
    expect(pathContains(descendant, ancestor)).toBe(false)
  })

  test('empty path contains every path', () => {
    expect(pathContains([], [{_key: 'b0'}])).toBe(true)
    expect(pathContains([], [])).toBe(true)
  })

  test('paths under different roots are not contained', () => {
    const a: Path = [{_key: 'b0'}, 'children']
    const b: Path = [{_key: 'b1'}, 'children']
    expect(pathContains(a, b)).toBe(false)
  })

  test('paths diverging mid-way are not contained', () => {
    const a: Path = [{_key: 'b0'}, 'children', {_key: 's0'}]
    const b: Path = [{_key: 'b0'}, 'children', {_key: 's1'}]
    expect(pathContains(a, b)).toBe(false)
  })
})
