import {diffMatchPatch, insert, set, unset} from '@portabletext/patches'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {parseTextspec} from '../fakes/document'
import {applyWithContentLakeSemantics, hasTarget} from './content-lake'

describe(applyWithContentLakeSemantics.name, () => {
  test('a patch whose parent is missing does nothing', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo')

    expect(
      applyWithContentLakeSemantics(value, [
        set('h1', [{_key: 'k9'}, 'style']),
        diffMatchPatch('bar', 'bary', [
          {_key: 'k0'},
          'children',
          {_key: 'k9'},
          'text',
        ]),
        set('x', [{_key: 'k0'}, 'markDefs', {_key: 'k9'}, 'href']),
      ]),
    ).toEqual(value)
    expect(
      applyWithContentLakeSemantics(undefined, [
        set('h1', [{_key: 'k0'}, 'style']),
        insert(value, 'before', [0]),
      ]),
    ).toEqual(undefined)
  })

  test('a `set` through a primitive replaces it with the structure the path names, and other patches through one do nothing', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo')

    expect(
      applyWithContentLakeSemantics(value, [
        set('x', [{_key: 'k0'}, 'style', 'name', 'first']),
      ]),
    ).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
        style: {name: {first: 'x'}},
      },
    ])
    expect(
      applyWithContentLakeSemantics(value, [
        set('x', [{_key: 'k0'}, 'style', {_key: 'k9'}]),
        unset([{_key: 'k0'}, 'children', {_key: 'k1'}, 'text', 0]),
        insert(['x'], 'after', [{_key: 'k0'}, 'style', 0]),
      ]),
    ).toEqual(value)
  })

  test('a `diffMatchPatch` on anything but a string fails, unless its keyed target is missing', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo')

    expect(() =>
      applyWithContentLakeSemantics(value, [
        diffMatchPatch('foo', 'foox', [{_key: 'k0'}, 'children']),
      ]),
    ).toThrow("Can't apply a `diffMatchPatch` to [")
    expect(() =>
      applyWithContentLakeSemantics(value, [
        diffMatchPatch('foo', 'foox', [{_key: 'k0'}, 'listItem']),
      ]),
    ).toThrow("Can't apply a `diffMatchPatch` to null")
    expect(() =>
      applyWithContentLakeSemantics(value, [
        diffMatchPatch('foo', 'foox', [{_key: 'k0'}, 'style', 'name']),
      ]),
    ).toThrow("Can't apply a `diffMatchPatch` through a string")
    expect(
      applyWithContentLakeSemantics(value, [
        diffMatchPatch('foo', 'foox', [{_key: 'k0'}, 'children', {_key: 'k9'}]),
      ]),
    ).toEqual(value)
  })
})

describe(hasTarget.name, () => {
  test('needs the named item, or an existing object for a field', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo')

    expect(hasTarget(value, set('h1', [{_key: 'k0'}, 'style']))).toEqual(true)
    expect(hasTarget(value, set('x', [{_key: 'k0'}, 'listItem']))).toEqual(true)
    expect(hasTarget(value, unset([{_key: 'k0'}]))).toEqual(true)
    expect(hasTarget(value, insert([], 'after', [{_key: 'k0'}]))).toEqual(true)
    expect(hasTarget(value, unset([{_key: 'k9'}]))).toEqual(false)
    expect(hasTarget(value, set('h1', [{_key: 'k9'}, 'style']))).toEqual(false)
    expect(hasTarget(undefined, insert([], 'after', [{_key: 'k0'}]))).toEqual(
      false,
    )
    expect(hasTarget(undefined, set([], []))).toEqual(true)
    expect(hasTarget(value, set('x', [{_key: 'k0'}, 'style', 'name']))).toEqual(
      true,
    )
    expect(hasTarget(value, unset([{_key: 'k0'}, 'style', 'name']))).toEqual(
      false,
    )
  })
})
