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

  test('a path through a primitive throws', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo')

    expect(() =>
      applyWithContentLakeSemantics(value, [
        set('x', [{_key: 'k0'}, 'style', 'name']),
      ]),
    ).toThrow(`Can't follow "name" into a string`)
    expect(() =>
      applyWithContentLakeSemantics(value, [
        unset([{_key: 'k0'}, 'children', {_key: 'k1'}, 'text', 0]),
      ]),
    ).toThrow(`Can't follow 0 into a string`)
    expect(() =>
      applyWithContentLakeSemantics(value, [
        set('x', [{_key: 'k0'}, 'style', 'name', 'first']),
      ]),
    ).toThrow(`Can't follow "name" into a string`)
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
  })
})
