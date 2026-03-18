import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {indexedPathToKeyedPath} from './indexed-path-to-keyed-path'

describe(indexedPathToKeyedPath.name, () => {
  test('text block', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      indexedPathToKeyedPath(
        {
          children: [
            {
              _key: blockKey,
              _type: 'block',
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
        [0],
        compileSchema(defineSchema({})),
      ),
    ).toEqual([{_key: blockKey}])
  })

  test('text block -> span', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      indexedPathToKeyedPath(
        {
          children: [
            {
              _key: blockKey,
              _type: 'block',
              children: [{_key: spanKey, _type: 'span', text: 'foo'}],
            },
          ],
        },
        [0, 0],
        compileSchema(defineSchema({})),
      ),
    ).toEqual([{_key: blockKey}, 'children', {_key: spanKey}])
  })

  test('image', () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()

    expect(
      indexedPathToKeyedPath(
        {children: [{_key: imageKey, _type: 'image'}]},
        [0],
        compileSchema(
          defineSchema({
            blockObjects: [{name: 'image'}],
          }),
        ),
      ),
    ).toEqual([{_key: imageKey}])
  })

  describe('table', () => {
    const schema = compileSchema(
      defineSchema({
        inlineObjects: [{name: 'stock-ticker'}],
        blockObjects: [
          {
            name: 'table',
            fields: [
              {
                name: 'rows',
                type: 'array',
                of: [
                  {
                    type: 'row',
                    fields: [
                      {
                        name: 'cells',
                        type: 'array',
                        of: [
                          {
                            type: 'cell',
                            fields: [
                              {
                                name: 'content',
                                type: 'array',
                                of: [{type: 'block'}],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
    )
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const stockTickerKey = keyGenerator()
    const trailingSpanKey = keyGenerator()
    const table = {
      _key: tableKey,
      _type: 'table',
      rows: [
        {
          _key: rowKey,
          _type: 'row',
          cells: [
            {
              _key: cellKey,
              _type: 'cell',
              content: [
                {
                  _key: blockKey,
                  _type: 'block',
                  children: [
                    {_key: spanKey, _type: 'span', text: 'before '},
                    {_key: stockTickerKey, _type: 'stock-ticker'},
                    {_key: trailingSpanKey, _type: 'span', text: ' after'},
                  ],
                },
              ],
            },
          ],
        },
      ],
    }

    test('table -> row', () => {
      expect(
        indexedPathToKeyedPath({children: [table]}, [0, 0], schema),
      ).toEqual([{_key: tableKey}, 'rows', {_key: rowKey}])
    })

    test('table -> row -> cell', () => {
      expect(
        indexedPathToKeyedPath({children: [table]}, [0, 0, 0], schema),
      ).toEqual([
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
      ])
    })

    test('table -> row -> cell -> block', () => {
      expect(
        indexedPathToKeyedPath({children: [table]}, [0, 0, 0, 0], schema),
      ).toEqual([
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
      ])
    })

    test('table -> row -> cell -> block -> span', () => {
      expect(
        indexedPathToKeyedPath({children: [table]}, [0, 0, 0, 0, 0], schema),
      ).toEqual([
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: spanKey},
      ])
    })

    test('table -> row -> cell -> block -> inline object', () => {
      expect(
        indexedPathToKeyedPath({children: [table]}, [0, 0, 0, 0, 1], schema),
      ).toEqual([
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: stockTickerKey},
      ])
    })
  })

  test('inline object', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const stockTickerKey = keyGenerator()
    const trailingSpanKey = keyGenerator()

    expect(
      indexedPathToKeyedPath(
        {
          children: [
            {
              _key: blockKey,
              _type: 'block',
              children: [
                {_key: spanKey, _type: 'span', text: 'before '},
                {_key: stockTickerKey, _type: 'stock-ticker'},
                {_key: trailingSpanKey, _type: 'span', text: ' after'},
              ],
            },
          ],
        },
        [0, 1],
        compileSchema(
          defineSchema({
            inlineObjects: [{name: 'stock-ticker'}],
          }),
        ),
      ),
    ).toEqual([{_key: blockKey}, 'children', {_key: stockTickerKey}])
  })

  test('unknown child field', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {name: 'table', fields: [{name: 'rows', type: 'array'}]},
        ],
      }),
    )
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const table = {
      _key: tableKey,
      _type: 'table',
      rows: [
        {
          _key: rowKey,
          _type: 'row',
          cells: [
            {
              _key: cellKey,
              _type: 'cell',
              content: [
                {
                  _key: blockKey,
                  _type: 'block',
                  children: [{_key: spanKey, _type: 'span', text: 'foo'}],
                },
              ],
            },
          ],
        },
      ],
    }

    expect(
      indexedPathToKeyedPath({children: [table]}, [0, 0, 0, 0, 0], schema),
    ).toEqual([{_key: tableKey}, 'rows', {_key: rowKey}])
  })
})
