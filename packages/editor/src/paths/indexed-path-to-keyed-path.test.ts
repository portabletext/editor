import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {indexedPathToKeyedPath} from './indexed-path-to-keyed-path'

describe(indexedPathToKeyedPath.name, () => {
  test('text block', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const schema = compileSchema(defineSchema({}))

    expect(
      indexedPathToKeyedPath(
        {
          schema,
          editableTypes: new Set(),
          value: [
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
      ),
    ).toEqual([{_key: blockKey}])
  })

  test('text block -> span', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const schema = compileSchema(defineSchema({}))

    expect(
      indexedPathToKeyedPath(
        {
          schema,
          editableTypes: new Set(),
          value: [
            {
              _key: blockKey,
              _type: 'block',
              children: [{_key: spanKey, _type: 'span', text: 'foo'}],
            },
          ],
        },
        [0, 0],
      ),
    ).toEqual([{_key: blockKey}, 'children', {_key: spanKey}])
  })

  test('image', () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    const schema = compileSchema(
      defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    )

    expect(
      indexedPathToKeyedPath(
        {
          schema,
          editableTypes: new Set(),
          value: [{_key: imageKey, _type: 'image'}],
        },
        [0],
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
    const editableTypes = new Set(['table', 'table.row', 'table.row.cell'])
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
        indexedPathToKeyedPath({schema, editableTypes, value: [table]}, [0, 0]),
      ).toEqual([{_key: tableKey}, 'rows', {_key: rowKey}])
    })

    test('table -> row -> cell', () => {
      expect(
        indexedPathToKeyedPath(
          {schema, editableTypes, value: [table]},
          [0, 0, 0],
        ),
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
        indexedPathToKeyedPath(
          {schema, editableTypes, value: [table]},
          [0, 0, 0, 0],
        ),
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
        indexedPathToKeyedPath(
          {schema, editableTypes, value: [table]},
          [0, 0, 0, 0, 0],
        ),
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
        indexedPathToKeyedPath(
          {schema, editableTypes, value: [table]},
          [0, 0, 0, 0, 1],
        ),
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

  test('multiple array fields', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'table',
            fields: [
              {
                name: 'labels',
                type: 'array',
              },
              {
                name: 'rows',
                type: 'array',
                of: [{type: 'block'}],
              },
              {
                name: 'also rows',
                type: 'array',
                of: [{type: 'block'}],
              },
            ],
          },
        ],
      }),
    )
    const editableTypes = new Set(['table'])
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const table = {
      _key: tableKey,
      _type: 'table',
      rows: [
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
    }

    expect(
      indexedPathToKeyedPath(
        {schema, editableTypes, value: [table]},
        [0, 0, 0],
      ),
    ).toEqual([
      {_key: tableKey},
      'rows',
      {_key: blockKey},
      'children',
      {_key: spanKey},
    ])
  })

  test('inline object', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const stockTickerKey = keyGenerator()
    const trailingSpanKey = keyGenerator()
    const schema = compileSchema(
      defineSchema({
        inlineObjects: [{name: 'stock-ticker'}],
      }),
    )

    expect(
      indexedPathToKeyedPath(
        {
          schema,
          editableTypes: new Set(),
          value: [
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
    const editableTypes = new Set(['table'])
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
      indexedPathToKeyedPath(
        {schema, editableTypes, value: [table]},
        [0, 0, 0, 0, 0],
      ),
    ).toBeUndefined()
  })
})
