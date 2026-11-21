import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../../test-utils/create-test-snapshot'
import {getInline} from './get-inline'

describe(getInline.name, () => {
  test('only returns typed inline children, including a misplaced text block', () => {
    const keyGenerator = createTestKeyGenerator()
    const typeless = {_type: 'object', _key: keyGenerator()}
    const numericType = {_type: 'object', _key: keyGenerator()}
    const misplaced = {_type: 'block', _key: keyGenerator(), children: []}
    const block = {
      _type: 'block',
      _key: keyGenerator(),
      children: [typeless, numericType, misplaced],
    }
    const snapshot = createTestSnapshot({context: {value: [block]}})
    Reflect.deleteProperty(typeless, '_type')
    Object.assign(numericType, {_type: 7})

    expect([
      getInline(snapshot, [
        {_key: block._key},
        'children',
        {_key: typeless._key},
      ]),
      getInline(snapshot, [
        {_key: block._key},
        'children',
        {_key: numericType._key},
      ]),
      getInline(snapshot, [
        {_key: block._key},
        'children',
        {_key: misplaced._key},
      ]),
    ]).toEqual([
      undefined,
      undefined,
      {
        node: misplaced,
        path: [{_key: block._key}, 'children', {_key: misplaced._key}],
      },
    ])
  })
})
