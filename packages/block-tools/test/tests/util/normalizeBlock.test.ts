import assert from 'node:assert'
import {describe, it} from 'vitest'
import {normalizeBlock} from '../../../src/util/normalizeBlock'
import {createTestKeyGenerator} from '../../test-key-generator'

describe('normalizeBlock', () => {
  it('will normalize a block', () => {
    const block = {
      _type: 'block',
      markDefs: [
        {
          _key: '123123',
          something: 'bogus',
        },
      ],
      children: [
        {
          _type: 'span',
          text: 'Foobar',
          marks: ['lala'],
        },
      ],
    }
    assert.deepStrictEqual(
      normalizeBlock(block, {keyGenerator: createTestKeyGenerator()}),
      {
        _key: 'randomKey0',
        _type: 'block',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            marks: ['lala'],
            text: 'Foobar',
          },
        ],
        markDefs: [],
      },
    )
    assert.deepEqual(
      normalizeBlock(block, {
        allowedDecorators: ['strong'],
        keyGenerator: createTestKeyGenerator(),
      }),
      {
        _key: 'randomKey0',
        _type: 'block',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            marks: [],
            text: 'Foobar',
          },
        ],
        markDefs: [],
      },
    )
  })
})
