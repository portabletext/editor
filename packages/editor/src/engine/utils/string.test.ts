import {describe, expect, test} from 'vitest'
import {getCharacterDistance} from './string'

describe(getCharacterDistance.name, () => {
  // GB9c: do not break within an Indic conjunct cluster, i.e.
  // Consonant + (Extend | Linker)* + Linker + (Extend | Linker)* + Consonant.
  test('KA, VIRAMA, TA stays one grapheme', () => {
    const string = '\u0915\u094d\u0924'
    expect(getCharacterDistance(string)).toBe(string.length)
    expect(getCharacterDistance(string, true)).toBe(string.length)
  })

  test('KA, VIRAMA, ZWJ, TA stays one grapheme', () => {
    const string = '\u0915\u094d\u200d\u0924'
    expect(getCharacterDistance(string)).toBe(string.length)
    expect(getCharacterDistance(string, true)).toBe(string.length)
  })

  test('KA, VIRAMA, TA, VIRAMA, YA stays one grapheme', () => {
    const string = '\u0915\u094d\u0924\u094d\u092f'
    expect(getCharacterDistance(string)).toBe(string.length)
    expect(getCharacterDistance(string, true)).toBe(string.length)
  })

  test('two consonants with no linker between them still break', () => {
    const string = '\u0915\u0924'
    expect(getCharacterDistance(string)).toBe('\u0915'.length)
    expect(getCharacterDistance(string, true)).toBe('\u0924'.length)
  })
})

describe('Hangul syllable classification', () => {
  const choseongKiyeok = '\u1100'
  const jungseongA = '\u1161'
  const jongseongKiyeok = '\u11a8'

  test.each([
    ['ABFF', [1, 1, 1]],
    ['AC00', [2, 2, 2]],
    ['AC01', [1, 2, 2]],
    ['AC1B', [1, 2, 2]],
    ['AC1C', [2, 2, 2]],
    ['D788', [2, 2, 2]],
    ['D7A3', [1, 2, 2]],
    ['D7A4', [1, 1, 1]],
  ])(
    'U+%s joins a following V, a following T and a preceding L as %j',
    (hex, expected) => {
      const syllable = String.fromCodePoint(Number.parseInt(hex, 16))
      expect([
        getCharacterDistance(syllable + jungseongA),
        getCharacterDistance(syllable + jongseongKiyeok),
        getCharacterDistance(choseongKiyeok + syllable),
      ]).toEqual(expected)
    },
  )

  test('only syllables without a trailing consonant join a following V', () => {
    for (let leading = 0; leading < 19; leading++) {
      for (let vowel = 0; vowel < 21; vowel++) {
        for (let trailing = 0; trailing < 28; trailing++) {
          const codepoint = 0xac00 + (leading * 21 + vowel) * 28 + trailing
          const syllable = String.fromCodePoint(codepoint)
          expect(
            [
              getCharacterDistance(syllable + jungseongA),
              getCharacterDistance(syllable + jongseongKiyeok),
            ],
            `U+${codepoint.toString(16).toUpperCase()}`,
          ).toEqual(trailing === 0 ? [2, 2] : [1, 2])
        }
      }
    }
  })
})
