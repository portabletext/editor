import {describe, expect, it} from 'vitest'
import {getCaretColor} from './presence-caret'

describe('getCaretColor', () => {
  it('gives the same user the same colour every time', () => {
    expect(getCaretColor('user-abc')).toBe(getCaretColor('user-abc'))
  })

  it('always returns a colour, whatever the id looks like', () => {
    for (const id of [
      '',
      'a',
      'user-abc',
      'p8xDvUMxC',
      '你好',
      '0'.repeat(500),
    ]) {
      expect(getCaretColor(id)).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('spreads a realistic set of users across several colours', () => {
    const ids = Array.from({length: 12}, (_, index) => `user-${index}`)

    const colors = new Set(ids.map(getCaretColor))

    // Not one colour for everyone, which is what a broken hash would give.
    expect(colors.size).toBeGreaterThan(2)
  })

  it('does not collapse ids that differ only by order', () => {
    // A sum-of-characters hash would give these the same colour.
    expect(getCaretColor('ab')).not.toBe(getCaretColor('ba'))
  })
})
