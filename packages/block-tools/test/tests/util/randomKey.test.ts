import {describe, expect, it} from 'vitest'
import {randomKey} from '../../../src/util/randomKey'

describe('randomKey', () => {
  it('returns a random string of specified length', () => {
    expect(randomKey(0)).toBe('')
    expect(randomKey(1).length).toBe(1)
    expect(randomKey(5).length).toBe(5)
    expect(randomKey(12).length).toBe(12)
    expect(randomKey(32).length).toBe(32)
    expect(randomKey(100).length).toBe(100)
  })

  it('returns unique values on multiple calls', () => {
    const keys = new Set<string>()
    for (let i = 0; i < 100; i++) {
      keys.add(randomKey(16))
    }
    expect(keys.size).toBeGreaterThan(95) // allow for extremely rare collisions
  })

  it('returns valid hex characters only', () => {
    const hexPattern = /^[0-9a-f]*$/
    expect(randomKey(20)).toMatch(hexPattern)
  })
})
