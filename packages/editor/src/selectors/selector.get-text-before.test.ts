import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../internal-utils/create-test-snapshot'
import {getBlockTextBefore} from './selector.get-text-before'

describe(getBlockTextBefore.name, () => {
  test('text block', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      getBlockTextBefore(
        createTestSnapshot({
          context: {
            keyGenerator,
            selection: {
              anchor: {
                path: [{_key: blockKey}, 'children', {_key: spanKey}],
                offset: 3,
              },
              focus: {
                path: [{_key: blockKey}, 'children', {_key: spanKey}],
                offset: 3,
              },
              backward: false,
            },
            value: [
              {
                _key: blockKey,
                _type: 'block',
                children: [{_key: spanKey, _type: 'span', text: 'foo'}],
              },
            ],
          },
        }),
      ),
    ).toBe('foo')
  })

  test('table cell', () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      getBlockTextBefore(
        createTestSnapshot({
          context: {
            schema: compileSchema(
              defineSchema({
                blocks: [
                  {
                    name: 'table',
                    children: [{name: 'row'}],
                  },
                  {
                    name: 'row',
                    children: [{name: 'cell'}],
                  },
                  {
                    name: 'cell',
                    children: [{name: 'span'}],
                  },
                ],
              }),
            ),
            keyGenerator,
            selection: {
              anchor: {
                path: [
                  {_key: tableKey},
                  'children',
                  {_key: rowKey},
                  'children',
                  {_key: cellKey},
                  'children',
                  {_key: spanKey},
                ],
                offset: 3,
              },
              focus: {
                path: [
                  {_key: tableKey},
                  'children',
                  {_key: rowKey},
                  'children',
                  {_key: cellKey},
                  'children',
                  {_key: spanKey},
                ],
                offset: 3,
              },
              backward: false,
            },
            value: [
              {
                _key: tableKey,
                _type: 'table',
                children: [
                  {
                    _key: rowKey,
                    _type: 'row',
                    children: [
                      {
                        _key: cellKey,
                        _type: 'cell',
                        children: [
                          {
                            _key: spanKey,
                            _type: 'span',
                            text: 'foo',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        }),
      ),
    ).toBe('foo')
  })
})
