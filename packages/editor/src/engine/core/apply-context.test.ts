import {describe, expect, test} from 'vitest'
import {getOrigin} from './apply-context'

describe('getOrigin', () => {
  test('`placeholder` frames never affect the origin', () => {
    expect(getOrigin([{kind: 'placeholder'}])).toEqual('local')
    expect(
      getOrigin([
        {kind: 'remote', source: 'patches'},
        {kind: 'normalization'},
        {kind: 'placeholder'},
      ]),
    ).toEqual('remote')
    expect(getOrigin([{kind: 'normalization'}, {kind: 'placeholder'}])).toEqual(
      'normalization',
    )
  })
})
