import {describe, expect, test} from 'vitest'
import {toJsonSafe} from './json-safe.ts'

describe(toJsonSafe.name, () => {
  test('keeps an own `__proto__` key as data', () => {
    const value = JSON.parse('{"__proto__": {"foo": "bar"}, "baz": 1}')

    expect(JSON.stringify(toJsonSafe(value))).toEqual(
      '{"__proto__":{"foo":"bar"},"baz":1}',
    )
  })

  test('drops functions, maps, sets, symbols, and bigints', () => {
    expect(
      toJsonSafe({
        foo: 'bar',
        callback: () => {},
        map: new Map([['foo', 'bar']]),
        set: new Set(['foo']),
        symbol: Symbol('foo'),
        bigint: 1n,
        list: [() => {}, 'baz'],
      }),
    ).toEqual({foo: 'bar', list: [null, 'baz']})
  })

  test('drops cycles but keeps repeated references', () => {
    const shared = {foo: 'bar'}
    const value: Record<string, unknown> = {first: shared, second: shared}
    value['self'] = value

    expect(toJsonSafe(value)).toEqual({
      first: {foo: 'bar'},
      second: {foo: 'bar'},
    })
  })
})
