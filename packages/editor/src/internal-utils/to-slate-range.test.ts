import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from './create-test-snapshot'
import {toSlateRange} from './to-slate-range'

describe(toSlateRange.name, () => {
  test('span in text block', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      toSlateRange({
        context: {
          schema: compileSchema(defineSchema({})),
          value: [
            {
              _key: blockKey,
              _type: 'block',
              children: [{_key: spanKey, _type: 'span', text: 'foo'}],
            },
          ],
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
        },
        blockIndexMap: new Map([[blockKey, [0]]]),
      }),
    ).toEqual({
      anchor: {path: [0, 0], offset: 3},
      focus: {path: [0, 0], offset: 3},
    })
  })

  test('inline object in text block', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const inlineObjectKey = keyGenerator()

    expect(
      toSlateRange({
        context: {
          schema: compileSchema(
            defineSchema({
              inlineObjects: [{name: 'image'}],
            }),
          ),
          value: [
            {
              _key: blockKey,
              _type: 'block',
              children: [{_key: inlineObjectKey, _type: 'image'}],
            },
          ],
          selection: {
            anchor: {
              path: [{_key: blockKey}, 'children', {_key: inlineObjectKey}],
              offset: 0,
            },
            focus: {
              path: [{_key: blockKey}, 'children', {_key: inlineObjectKey}],
              offset: 0,
            },
            backward: false,
          },
        },
        blockIndexMap: new Map([[blockKey, [0]]]),
      }),
    ).toEqual({
      anchor: {path: [0, 0, 0], offset: 0},
      focus: {path: [0, 0, 0], offset: 0},
    })
  })

  test('block object', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockObjectKey = keyGenerator()

    expect(
      toSlateRange({
        context: {
          schema: compileSchema(
            defineSchema({blockObjects: [{name: 'image'}]}),
          ),
          value: [{_key: blockObjectKey, _type: 'image'}],
          selection: {
            anchor: {
              path: [{_key: blockObjectKey}],
              offset: 0,
            },
            focus: {
              path: [{_key: blockObjectKey}],
              offset: 0,
            },
            backward: false,
          },
        },
        blockIndexMap: new Map([[blockObjectKey, [0]]]),
      }),
    ).toEqual({
      anchor: {path: [0, 0], offset: 0},
      focus: {path: [0, 0], offset: 0},
    })
  })

  test('table row', () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      toSlateRange(
        createTestSnapshot({
          context: {
            schema: compileSchema(
              defineSchema({
                blocks: [
                  {name: 'table', children: [{name: 'row'}]},
                  {name: 'row', children: [{name: 'cell'}]},
                  {name: 'cell', children: [{name: 'span'}]},
                ],
              }),
            ),
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
                        children: [{_key: spanKey, _type: 'span', text: 'foo'}],
                      },
                    ],
                  },
                ],
              },
            ],
            selection: {
              anchor: {
                path: [{_key: tableKey}, 'children', {_key: rowKey}],
                offset: 0,
              },
              focus: {
                path: [{_key: tableKey}, 'children', {_key: rowKey}],
                offset: 0,
              },
              backward: false,
            },
          },
        }),
      ),
    ).toEqual({
      anchor: {path: [0, 0], offset: 0},
      focus: {path: [0, 0], offset: 0},
    })
  })

  test('table cell offset', () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      toSlateRange(
        createTestSnapshot({
          context: {
            schema: compileSchema(
              defineSchema({
                blocks: [
                  {name: 'table', children: [{name: 'row'}]},
                  {name: 'row', children: [{name: 'cell'}]},
                  {name: 'cell', children: [{name: 'span'}]},
                ],
              }),
            ),
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
                          {_key: spanKey, _type: 'span', text: 'foo bar baz'},
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
            selection: {
              anchor: {
                path: [
                  {_key: tableKey},
                  'children',
                  {_key: rowKey},
                  'children',
                  {_key: cellKey},
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
                ],
                offset: 7,
              },
              backward: false,
            },
          },
        }),
      ),
    ).toEqual({
      anchor: {path: [0, 0, 0, 0], offset: 3},
      focus: {path: [0, 0, 0, 0], offset: 7},
    })
  })

  test('table cell start-to-end offset', () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      toSlateRange(
        createTestSnapshot({
          context: {
            schema: compileSchema(
              defineSchema({
                blocks: [
                  {name: 'table', children: [{name: 'row'}]},
                  {name: 'row', children: [{name: 'cell'}]},
                  {name: 'cell', children: [{name: 'span'}]},
                ],
              }),
            ),
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
                          {_key: spanKey, _type: 'span', text: 'foo bar baz'},
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
            selection: {
              anchor: {
                path: [
                  {_key: tableKey},
                  'children',
                  {_key: rowKey},
                  'children',
                  {_key: cellKey},
                ],
                offset: 0,
              },
              focus: {
                path: [
                  {_key: tableKey},
                  'children',
                  {_key: rowKey},
                  'children',
                  {_key: cellKey},
                ],
                offset: 11,
              },
              backward: false,
            },
          },
        }),
      ),
    ).toEqual({
      anchor: {path: [0, 0, 0, 0], offset: 0},
      focus: {path: [0, 0, 0, 0], offset: 11},
    })
  })

  test('span in table cell', () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      toSlateRange({
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
        },
        blockIndexMap: new Map([
          [tableKey, [0]],
          [rowKey, [0, 0]],
          [cellKey, [0, 0, 0]],
        ]),
      }),
    ).toEqual({
      anchor: {
        path: [0, 0, 0, 0],
        offset: 3,
      },
      focus: {
        path: [0, 0, 0, 0],
        offset: 3,
      },
    })
  })
})
