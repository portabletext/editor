import {makePatches, stringifyPatches} from '@sanity/diff-match-patch'
import {describe, expect, test} from 'vitest'
import {applyPatchOperations} from './apply-sanity-patch-operations'

function dmp(before: string, after: string): string {
  return stringifyPatches(makePatches(before, after))
}

describe('applyPatchOperations', () => {
  test('sets by key path', () => {
    const doc = {
      content: [{_key: 'b1', children: [{_key: 's1', text: 'hello'}]}],
    }
    const result = applyPatchOperations(doc, {
      set: {'content[_key=="b1"].children[_key=="s1"].text': 'bye'},
    })
    expect(result).toEqual({
      content: [{_key: 'b1', children: [{_key: 's1', text: 'bye'}]}],
    })
  })

  test('set with an unmatched key constraint creates the item', () => {
    const doc = {content: [{_key: 'b1', text: 'hello'}]}
    const result = applyPatchOperations(doc, {
      set: {'content[_key=="b2"]': {_key: 'b2', text: 'bye'}},
    })
    expect(result).toEqual({
      content: [
        {_key: 'b1', text: 'hello'},
        {_key: 'b2', text: 'bye'},
      ],
    })
  })

  test('unset with an unresolvable path is a no-op', () => {
    const doc = {content: [{_key: 'b1', text: 'hello'}]}
    const result = applyPatchOperations(doc, {
      unset: ['content[_key=="nope"]'],
    })
    expect(result).toEqual(doc)
  })

  test('insert after a negative index appends', () => {
    const doc = {content: [{_key: 'a'}, {_key: 'b'}]}
    const result = applyPatchOperations(doc, {
      insert: {after: 'content[-1]', items: [{_key: 'c'}]},
    })
    expect(result).toEqual({content: [{_key: 'a'}, {_key: 'b'}, {_key: 'c'}]})
  })

  test('insert before a keyed sibling', () => {
    const doc = {content: [{_key: 'a'}, {_key: 'c'}]}
    const result = applyPatchOperations(doc, {
      insert: {before: 'content[_key=="c"]', items: [{_key: 'b'}]},
    })
    expect(result).toEqual({content: [{_key: 'a'}, {_key: 'b'}, {_key: 'c'}]})
  })

  test('unset by key', () => {
    const doc = {content: [{_key: 'a'}, {_key: 'b'}, {_key: 'c'}]}
    const result = applyPatchOperations(doc, {
      unset: ['content[_key=="b"]'],
    })
    expect(result).toEqual({content: [{_key: 'a'}, {_key: 'c'}]})
  })

  test('diffMatchPatch merges concurrent inserts into the same string', () => {
    // the fuzzy dmp application is why two clients typing into the same
    // span can both survive at the server
    const base = 'The quick brown fox'
    const doc = {text: base}
    const afterA = applyPatchOperations(doc, {
      diffMatchPatch: {text: dmp(base, 'The {A}0quick brown fox')},
    }) as {text: string}
    expect(afterA.text).toBe('The {A}0quick brown fox')

    const afterB = applyPatchOperations(afterA, {
      diffMatchPatch: {text: dmp(base, 'The quick brown fox {B}0')},
    }) as {text: string}
    expect(afterB.text).toBe('The {A}0quick brown fox {B}0')
  })

  test('diffMatchPatch against a non-string throws (transaction rejected)', () => {
    const doc = {text: 42}
    expect(() =>
      applyPatchOperations(doc, {
        diffMatchPatch: {text: dmp('abc', 'abd')},
      }),
    ).toThrow()
  })

  test('operations within one patch apply in content-lake order', () => {
    // set runs before insert regardless of key order in the record
    const doc = {content: [{_key: 'a', n: 1}]}
    const result = applyPatchOperations(doc, {
      insert: {after: 'content[-1]', items: [{_key: 'b'}]},
      set: {'content[_key=="a"].n': 2},
    })
    expect(result).toEqual({content: [{_key: 'a', n: 2}, {_key: 'b'}]})
  })
})
