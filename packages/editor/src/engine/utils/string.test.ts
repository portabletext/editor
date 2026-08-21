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
