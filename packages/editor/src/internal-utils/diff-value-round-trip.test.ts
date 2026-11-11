import {applyAll} from '@portabletext/patches'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {diffValueToPatches} from '../../test-utils/diff-value-patches'
import {generateValuePair} from '../../test-utils/generate-value-pairs'

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
