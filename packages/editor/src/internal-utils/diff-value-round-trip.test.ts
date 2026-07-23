import {applyAll} from '@portabletext/patches'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {diffValueToPatches} from '../../test-utils/diff-value-patches'
import {generateValuePair} from '../../test-utils/generate-value-pairs'

/**
 * Store-side round-trip property for the revised patch pipeline (the
 * transport `update value` will ride): diffing two values into patches and
 * applying them to the first value must reproduce the second, byte-equal.
 * `applyAll` is the reference application every patch consumer shares.
 */
describe('diffValue round-trip: applyAll', () => {
  const seeds = Array.from({length: 500}, (_, index) => index + 1)

  test.each(seeds)('seed %i', (seed) => {
    const keyGenerator = createTestKeyGenerator(`seed${seed}-`)
    const {fromValue, toValue} = generateValuePair(seed, keyGenerator)

    const patches = diffValueToPatches(fromValue, toValue)
    const roundTripped = applyAll(fromValue, patches)

    expect(roundTripped).toEqual(toValue)
  })
})
