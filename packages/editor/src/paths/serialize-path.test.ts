import {describe, expect, test} from 'vitest'
import {deserializePath} from './deserialize-path'
import {serializePath} from './serialize-path'

describe(serializePath.name, () => {
  test('single key segment', () => {
    expect(serializePath([{_key: 'k0'}])).toBe('[_key=="k0"]')
  })

  test('block and span', () => {
    expect(serializePath([{_key: 'k0'}, 'children', {_key: 's0'}])).toBe(
      '[_key=="k0"].children[_key=="s0"]',
    )
  })

  test('container path', () => {
    expect(
      serializePath([
        {_key: 'tableKey'},
        'rows',
        {_key: 'rowKey'},
        'cells',
        {_key: 'cellKey'},
        'content',
        {_key: 'blockKey'},
        'children',
        {_key: 'spanKey'},
      ]),
    ).toBe(
      '[_key=="tableKey"].rows[_key=="rowKey"].cells[_key=="cellKey"].content[_key=="blockKey"].children[_key=="spanKey"]',
    )
  })

  test('key with dot', () => {
    expect(serializePath([{_key: 'my.key'}, 'children', {_key: 's0'}])).toBe(
      '[_key=="my.key"].children[_key=="s0"]',
    )
  })
})

describe(deserializePath.name, () => {
  test('single key segment', () => {
    expect(deserializePath('[_key=="k0"]')).toEqual([{_key: 'k0'}])
  })

  test('block and span', () => {
    expect(deserializePath('[_key=="k0"].children[_key=="s0"]')).toEqual([
      {_key: 'k0'},
      'children',
      {_key: 's0'},
    ])
  })

  test('container path', () => {
    expect(
      deserializePath(
        '[_key=="tableKey"].rows[_key=="rowKey"].cells[_key=="cellKey"].content[_key=="blockKey"].children[_key=="spanKey"]',
      ),
    ).toEqual([
      {_key: 'tableKey'},
      'rows',
      {_key: 'rowKey'},
      'cells',
      {_key: 'cellKey'},
      'content',
      {_key: 'blockKey'},
      'children',
      {_key: 'spanKey'},
    ])
  })

  test('key with dot', () => {
    expect(deserializePath('[_key=="my.key"].children[_key=="s0"]')).toEqual([
      {_key: 'my.key'},
      'children',
      {_key: 's0'},
    ])
  })
})

describe('roundtrip', () => {
  test('single key segment', () => {
    const path = [{_key: 'k0'}] as const
    expect(deserializePath(serializePath([...path]))).toEqual([...path])
  })

  test('block and span', () => {
    const path = [{_key: 'k0'}, 'children', {_key: 's0'}] as const
    expect(deserializePath(serializePath([...path]))).toEqual([...path])
  })

  test('container path', () => {
    const path = [
      {_key: 'tableKey'},
      'rows',
      {_key: 'rowKey'},
      'cells',
      {_key: 'cellKey'},
      'content',
      {_key: 'blockKey'},
      'children',
      {_key: 'spanKey'},
    ] as const
    expect(deserializePath(serializePath([...path]))).toEqual([...path])
  })

  test('key with dot', () => {
    const path = [{_key: 'my.key'}, 'children', {_key: 's0'}] as const
    expect(deserializePath(serializePath([...path]))).toEqual([...path])
  })

  test('key with dots and hyphens', () => {
    const path = [{_key: 'key-with.dots'}, 'children', {_key: 's0'}] as const
    expect(deserializePath(serializePath([...path]))).toEqual([...path])
  })
})
