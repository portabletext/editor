import {makeDiff, makePatches, type Patch} from '@sanity/diff-match-patch'
import {describe, expect, test} from 'vitest'
import {applyPatchesStrictly, mergeSpanText} from './span-text-merge'

describe(mergeSpanText.name, () => {
  test('orders concurrent insertions at the same boundary consistently', () => {
    expect(mergeSpanText('ab', 'aXb', 'aYb')).toBe('aXYb')
    expect(mergeSpanText('ab', 'aYb', 'aXb')).toBe('aXYb')
  })

  test('keeps identical insertions once', () => {
    expect(mergeSpanText('ab', 'aXb', 'aXb')).toBe('aXb')
  })

  test('keeps an insertion inside text deleted by the other branch', () => {
    expect(mergeSpanText('abcdef', 'abXcdef', 'adef')).toBe('aXdef')
  })

  test('combines overlapping deletions', () => {
    expect(mergeSpanText('abcdef', 'adef', 'abef')).toBe('aef')
  })

  test('orders concurrent replacements consistently', () => {
    expect(mergeSpanText('abc', 'aXc', 'aYc')).toBe('aXYc')
    expect(mergeSpanText('abc', 'aYc', 'aXc')).toBe('aXYc')
  })

  test('combines multiple changes', () => {
    expect(mergeSpanText('abcde', 'Abcde!', 'abCde')).toBe('AbCde!')
  })

  test('preserves Unicode characters while combining changes', () => {
    expect(mergeSpanText('a🙂b', 'a🙂éb', 'A🙂b')).toBe('A🙂éb')
  })
})

describe(applyPatchesStrictly.name, () => {
  test('applies an exact patch and returns its matched source range', () => {
    const patches = createPatches('hello world', 'hello brave world')

    expect(applyPatchesStrictly(patches, 'hello world')).toEqual({
      ok: true,
      matchedRanges: [{start: 0, end: 11}],
      text: 'hello brave world',
    })
  })

  test('applies patches using UTF-8 coordinates', () => {
    const patches = createPatches('🙂 café', '🙂 small café')
    const result = applyPatchesStrictly(patches, '🙂 café')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.text).toBe('🙂 small café')
    }
  })

  test('finds an exact source near the expected offset', () => {
    const patches = createPatches(
      'prefix target suffix',
      'prefix changed suffix',
    )

    expect(applyPatchesStrictly(patches, 'local prefix target suffix')).toEqual(
      {
        ok: true,
        matchedRanges: [{start: 9, end: 23}],
        text: 'local prefix changed suffix',
      },
    )
  })

  test('keeps a shifted coordinate across multiple patches', () => {
    const unchangedMiddle = 'x'.repeat(100)
    const sourceText = `start ${unchangedMiddle} end`
    const targetText = `begin ${unchangedMiddle} finish`
    const patches = createPatches(sourceText, targetText)

    expect(patches.length).toBeGreaterThan(1)
    expect(applyPatchesStrictly(patches, `local ${sourceText}`)).toEqual({
      ok: true,
      matchedRanges: [
        {start: 6, end: 15},
        {start: 109, end: 116},
      ],
      text: `local ${targetText}`,
    })
  })

  test('reports equal-distance repeated context as ambiguous', () => {
    const [patch] = createPatches('target', 'changed')
    const ambiguousPatch: Patch = {
      ...patch!,
      start1: 4,
      start2: 4,
      utf8Start1: 4,
      utf8Start2: 4,
    }

    expect(applyPatchesStrictly([ambiguousPatch], 'target__target')).toEqual({
      ok: false,
      reason: 'ambiguous',
    })
  })

  test('reports a missing exact source', () => {
    const patches = createPatches('before', 'after')

    expect(applyPatchesStrictly(patches, 'unrelated')).toEqual({
      ok: false,
      reason: 'missing',
    })
  })
})

function createPatches(sourceText: string, targetText: string): Array<Patch> {
  return makePatches(makeDiff(sourceText, targetText))
}
