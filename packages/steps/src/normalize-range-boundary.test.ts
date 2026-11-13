import {
  compileSchema,
  defineSchema,
  getSubSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {normalizeRangeBoundary} from './normalize-range-boundary'

const value: Array<PortableTextBlock> = [
  {
    _type: 'block',
    _key: 'b1',
    style: 'normal',
    markDefs: [],
    children: [
      {_type: 'span', _key: 's1', text: 'foo bar', marks: []},
      {_type: 'span', _key: 's2', text: 'baz', marks: ['strong']},
    ],
  },
]

const span1 = [{_key: 'b1'}, 'children', {_key: 's1'}]
const span2 = [{_key: 'b1'}, 'children', {_key: 's2'}]

describe(normalizeRangeBoundary.name, () => {
  test('represents an expanded range start at the preceding sibling end', () => {
    expect(
      normalizeRangeBoundary(value, {
        anchor: {path: span2, offset: 0},
        focus: {path: span2, offset: 3},
      }),
    ).toEqual({
      anchor: {path: span1, offset: 7},
      focus: {path: span2, offset: 3},
    })
  })

  test('normalizes the focus of a backward range', () => {
    expect(
      normalizeRangeBoundary(value, {
        anchor: {path: span2, offset: 3},
        focus: {path: span2, offset: 0},
      }),
    ).toEqual({
      anchor: {path: span2, offset: 3},
      focus: {path: span1, offset: 7},
    })
  })

  test('leaves a collapsed range at the next sibling start', () => {
    expect(
      normalizeRangeBoundary(value, {
        anchor: {path: span2, offset: 0},
        focus: {path: span2, offset: 0},
      }),
    ).toEqual({
      anchor: {path: span2, offset: 0},
      focus: {path: span2, offset: 0},
    })
  })

  test('represents a collapsed range at the preceding sibling end when requested', () => {
    expect(
      normalizeRangeBoundary(
        value,
        {
          anchor: {path: span2, offset: 0},
          focus: {path: span2, offset: 0},
        },
        {normalizeCollapsed: true},
      ),
    ).toEqual({
      anchor: {path: span1, offset: 7},
      focus: {path: span1, offset: 7},
    })
  })

  test('recovers the next-sibling representation of a collapsed range when requested', () => {
    expect(
      normalizeRangeBoundary(
        value,
        {
          anchor: {path: span1, offset: 7},
          focus: {path: span1, offset: 7},
        },
        {representation: 'next', normalizeCollapsed: true},
      ),
    ).toEqual({
      anchor: {path: span2, offset: 0},
      focus: {path: span2, offset: 0},
    })
  })

  test('leaves an expanded range end at the next sibling start', () => {
    expect(
      normalizeRangeBoundary(value, {
        anchor: {path: span1, offset: 4},
        focus: {path: span2, offset: 0},
      }),
    ).toEqual({
      anchor: {path: span1, offset: 4},
      focus: {path: span2, offset: 0},
    })
  })

  test('recovers the next-sibling representation of a normalized start', () => {
    expect(
      normalizeRangeBoundary(
        value,
        {
          anchor: {path: span1, offset: 7},
          focus: {path: span2, offset: 3},
        },
        {representation: 'next'},
      ),
    ).toEqual({
      anchor: {path: span2, offset: 0},
      focus: {path: span2, offset: 3},
    })
  })
})

describe(normalizeRangeBoundary.name, () => {
  test('custom span names normalize boundaries', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    const key2 = keyGenerator()
    expect(
      normalizeRangeBoundary(
        [
          {
            _type: 'block',
            _key: key0,
            children: [
              {_type: 'customSpan', _key: key1, text: 'foo', marks: []},
              {_type: 'customSpan', _key: key2, text: 'bar', marks: []},
            ],
            markDefs: [],
          },
        ],
        {
          anchor: {path: [{_key: key0}, 'children', {_key: key2}], offset: 0},
          focus: {path: [{_key: key0}, 'children', {_key: key2}], offset: 2},
        },
        {
          schema: {
            ...compileSchema(defineSchema({})),
            span: {name: 'customSpan'},
          },
        },
      ),
    ).toEqual({
      anchor: {path: [{_key: key0}, 'children', {_key: key1}], offset: 3},
      focus: {path: [{_key: key0}, 'children', {_key: key2}], offset: 2},
    })
  })
  test('custom span names without a schema leave boundaries unchanged', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    const key2 = keyGenerator()
    expect(
      normalizeRangeBoundary(
        [
          {
            _type: 'block',
            _key: key0,
            children: [
              {_type: 'customSpan', _key: key1, text: 'foo', marks: []},
              {_type: 'customSpan', _key: key2, text: 'bar', marks: []},
            ],
            markDefs: [],
          },
        ],
        {
          anchor: {path: [{_key: key0}, 'children', {_key: key2}], offset: 0},
          focus: {path: [{_key: key0}, 'children', {_key: key2}], offset: 2},
        },
      ),
    ).toEqual({
      anchor: {path: [{_key: key0}, 'children', {_key: key2}], offset: 0},
      focus: {path: [{_key: key0}, 'children', {_key: key2}], offset: 2},
    })
  })
})

describe(normalizeRangeBoundary.name, () => {
  test('normalizes span boundaries inside an object field', () => {
    const keyGenerator = createTestKeyGenerator()
    const objectKey = keyGenerator()
    const blockKey = keyGenerator()
    const firstSpanKey = keyGenerator()
    const secondSpanKey = keyGenerator()
    const value = [
      {
        _type: 'object',
        _key: objectKey,
        details: {
          body: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: firstSpanKey, text: 'foo', marks: []},
                {_type: 'span', _key: secondSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
            },
          ],
        },
      },
    ]
    expect(
      normalizeRangeBoundary(value, {
        anchor: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            {_key: secondSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            {_key: secondSpanKey},
          ],
          offset: 2,
        },
      }),
    ).toEqual({
      anchor: {
        path: [
          {_key: objectKey},
          'details',
          'body',
          {_key: blockKey},
          'children',
          {_key: firstSpanKey},
        ],
        offset: 3,
      },
      focus: {
        path: [
          {_key: objectKey},
          'details',
          'body',
          {_key: blockKey},
          'children',
          {_key: secondSpanKey},
        ],
        offset: 2,
      },
    })
  })
})

test('ignores text-bearing inline objects at root with unique keys without schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const secondKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        null,
        'foo',
        1,
        {_type: 'span', _key: firstKey, text: 'foo', marks: []},
        {_type: 'mention', text: 'baz'},
        {_type: 'span', _key: secondKey, text: 'bar', marks: []},
      ],
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: secondKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: secondKey}],
          offset: 2,
        },
      },
      undefined,
    ),
  ).toEqual({
    anchor: {
      path: [{_key: blockKey}, 'children', {_key: secondKey}],
      offset: 0,
    },
    focus: {path: [{_key: blockKey}, 'children', {_key: secondKey}], offset: 2},
  })
})

test('finds default spans at root with unique keys without schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const secondKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        null,
        'foo',
        1,
        {_type: 'span', _key: firstKey, text: 'foo', marks: []},
        {_type: 'span', _key: secondKey, text: 'bar', marks: []},
      ],
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: secondKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: secondKey}],
          offset: 2,
        },
      },
      undefined,
    ),
  ).toEqual({
    anchor: {path: [{_key: blockKey}, 'children', {_key: firstKey}], offset: 3},
    focus: {path: [{_key: blockKey}, 'children', {_key: secondKey}], offset: 2},
  })
})

test('ignores text-bearing inline objects at root with unique keys with schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const secondKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        null,
        'foo',
        1,
        {_type: 'span', _key: firstKey, text: 'foo', marks: []},
        {_type: 'mention', text: 'baz'},
        {_type: 'span', _key: secondKey, text: 'bar', marks: []},
      ],
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: secondKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: secondKey}],
          offset: 2,
        },
      },
      {schema: compileSchema(defineSchema({}))},
    ),
  ).toEqual({
    anchor: {
      path: [{_key: blockKey}, 'children', {_key: secondKey}],
      offset: 0,
    },
    focus: {path: [{_key: blockKey}, 'children', {_key: secondKey}], offset: 2},
  })
})

test('finds default spans at root with unique keys with schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const secondKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        null,
        'foo',
        1,
        {_type: 'span', _key: firstKey, text: 'foo', marks: []},
        {_type: 'span', _key: secondKey, text: 'bar', marks: []},
      ],
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: secondKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: secondKey}],
          offset: 2,
        },
      },
      {schema: compileSchema(defineSchema({}))},
    ),
  ).toEqual({
    anchor: {path: [{_key: blockKey}, 'children', {_key: firstKey}], offset: 3},
    focus: {path: [{_key: blockKey}, 'children', {_key: secondKey}], offset: 2},
  })
})

test('ignores text-bearing inline objects at root with missing keys without schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        null,
        'foo',
        1,
        {_type: 'span', text: 'foo', marks: []},
        {_type: 'mention', text: 'baz'},
        {_type: 'span', text: 'bar', marks: []},
      ],
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {path: [{_key: blockKey}, 'children', 5], offset: 0},
        focus: {path: [{_key: blockKey}, 'children', 5], offset: 2},
      },
      undefined,
    ),
  ).toEqual({
    anchor: {path: [{_key: blockKey}, 'children', 5], offset: 0},
    focus: {path: [{_key: blockKey}, 'children', 5], offset: 2},
  })
})

test('finds default spans at root with missing keys without schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        null,
        'foo',
        1,
        {_type: 'span', text: 'foo', marks: []},
        {_type: 'span', text: 'bar', marks: []},
      ],
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {path: [{_key: blockKey}, 'children', 4], offset: 0},
        focus: {path: [{_key: blockKey}, 'children', 4], offset: 2},
      },
      undefined,
    ),
  ).toEqual({
    anchor: {path: [{_key: blockKey}, 'children', 3], offset: 3},
    focus: {path: [{_key: blockKey}, 'children', 4], offset: 2},
  })
})

test('ignores text-bearing inline objects at root with missing keys with schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        null,
        'foo',
        1,
        {_type: 'span', text: 'foo', marks: []},
        {_type: 'mention', text: 'baz'},
        {_type: 'span', text: 'bar', marks: []},
      ],
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {path: [{_key: blockKey}, 'children', 5], offset: 0},
        focus: {path: [{_key: blockKey}, 'children', 5], offset: 2},
      },
      {schema: compileSchema(defineSchema({}))},
    ),
  ).toEqual({
    anchor: {path: [{_key: blockKey}, 'children', 5], offset: 0},
    focus: {path: [{_key: blockKey}, 'children', 5], offset: 2},
  })
})

test('finds default spans at root with missing keys with schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        null,
        'foo',
        1,
        {_type: 'span', text: 'foo', marks: []},
        {_type: 'span', text: 'bar', marks: []},
      ],
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {path: [{_key: blockKey}, 'children', 4], offset: 0},
        focus: {path: [{_key: blockKey}, 'children', 4], offset: 2},
      },
      {schema: compileSchema(defineSchema({}))},
    ),
  ).toEqual({
    anchor: {path: [{_key: blockKey}, 'children', 3], offset: 3},
    focus: {path: [{_key: blockKey}, 'children', 4], offset: 2},
  })
})

test('ignores text-bearing inline objects at root with empty keys without schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        null,
        'foo',
        1,
        {_type: 'span', _key: '', text: 'foo', marks: []},
        {_type: 'mention', text: 'baz'},
        {_type: 'span', _key: '', text: 'bar', marks: []},
      ],
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {path: [{_key: blockKey}, 'children', 5], offset: 0},
        focus: {path: [{_key: blockKey}, 'children', 5], offset: 2},
      },
      undefined,
    ),
  ).toEqual({
    anchor: {path: [{_key: blockKey}, 'children', 5], offset: 0},
    focus: {path: [{_key: blockKey}, 'children', 5], offset: 2},
  })
})

test('finds default spans at root with empty keys without schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        null,
        'foo',
        1,
        {_type: 'span', _key: '', text: 'foo', marks: []},
        {_type: 'span', _key: '', text: 'bar', marks: []},
      ],
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {path: [{_key: blockKey}, 'children', 4], offset: 0},
        focus: {path: [{_key: blockKey}, 'children', 4], offset: 2},
      },
      undefined,
    ),
  ).toEqual({
    anchor: {path: [{_key: blockKey}, 'children', 3], offset: 3},
    focus: {path: [{_key: blockKey}, 'children', 4], offset: 2},
  })
})

test('ignores text-bearing inline objects at root with empty keys with schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        null,
        'foo',
        1,
        {_type: 'span', _key: '', text: 'foo', marks: []},
        {_type: 'mention', text: 'baz'},
        {_type: 'span', _key: '', text: 'bar', marks: []},
      ],
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {path: [{_key: blockKey}, 'children', 5], offset: 0},
        focus: {path: [{_key: blockKey}, 'children', 5], offset: 2},
      },
      {schema: compileSchema(defineSchema({}))},
    ),
  ).toEqual({
    anchor: {path: [{_key: blockKey}, 'children', 5], offset: 0},
    focus: {path: [{_key: blockKey}, 'children', 5], offset: 2},
  })
})

test('finds default spans at root with empty keys with schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        null,
        'foo',
        1,
        {_type: 'span', _key: '', text: 'foo', marks: []},
        {_type: 'span', _key: '', text: 'bar', marks: []},
      ],
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {path: [{_key: blockKey}, 'children', 4], offset: 0},
        focus: {path: [{_key: blockKey}, 'children', 4], offset: 2},
      },
      {schema: compileSchema(defineSchema({}))},
    ),
  ).toEqual({
    anchor: {path: [{_key: blockKey}, 'children', 3], offset: 3},
    focus: {path: [{_key: blockKey}, 'children', 4], offset: 2},
  })
})

test('ignores text-bearing inline objects at root with duplicate keys without schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        null,
        'foo',
        1,
        {_type: 'span', _key: firstKey, text: 'foo', marks: []},
        {_type: 'mention', text: 'baz'},
        {_type: 'span', _key: firstKey, text: 'bar', marks: []},
      ],
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {path: [{_key: blockKey}, 'children', 5], offset: 0},
        focus: {path: [{_key: blockKey}, 'children', 5], offset: 2},
      },
      undefined,
    ),
  ).toEqual({
    anchor: {path: [{_key: blockKey}, 'children', 5], offset: 0},
    focus: {path: [{_key: blockKey}, 'children', 5], offset: 2},
  })
})

test('finds default spans at root with duplicate keys without schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        null,
        'foo',
        1,
        {_type: 'span', _key: firstKey, text: 'foo', marks: []},
        {_type: 'span', _key: firstKey, text: 'bar', marks: []},
      ],
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {path: [{_key: blockKey}, 'children', 4], offset: 0},
        focus: {path: [{_key: blockKey}, 'children', 4], offset: 2},
      },
      undefined,
    ),
  ).toEqual({
    anchor: {path: [{_key: blockKey}, 'children', 3], offset: 3},
    focus: {path: [{_key: blockKey}, 'children', 4], offset: 2},
  })
})

test('ignores text-bearing inline objects at root with duplicate keys with schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        null,
        'foo',
        1,
        {_type: 'span', _key: firstKey, text: 'foo', marks: []},
        {_type: 'mention', text: 'baz'},
        {_type: 'span', _key: firstKey, text: 'bar', marks: []},
      ],
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {path: [{_key: blockKey}, 'children', 5], offset: 0},
        focus: {path: [{_key: blockKey}, 'children', 5], offset: 2},
      },
      {schema: compileSchema(defineSchema({}))},
    ),
  ).toEqual({
    anchor: {path: [{_key: blockKey}, 'children', 5], offset: 0},
    focus: {path: [{_key: blockKey}, 'children', 5], offset: 2},
  })
})

test('finds default spans at root with duplicate keys with schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        null,
        'foo',
        1,
        {_type: 'span', _key: firstKey, text: 'foo', marks: []},
        {_type: 'span', _key: firstKey, text: 'bar', marks: []},
      ],
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {path: [{_key: blockKey}, 'children', 4], offset: 0},
        focus: {path: [{_key: blockKey}, 'children', 4], offset: 2},
      },
      {schema: compileSchema(defineSchema({}))},
    ),
  ).toEqual({
    anchor: {path: [{_key: blockKey}, 'children', 3], offset: 3},
    focus: {path: [{_key: blockKey}, 'children', 4], offset: 2},
  })
})

test('ignores text-bearing inline objects at four containers with unique keys without schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const secondKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        null,
                        'foo',
                        1,
                        {_type: 'span', _key: firstKey, text: 'foo', marks: []},
                        {_type: 'mention', text: 'baz'},
                        {
                          _type: 'span',
                          _key: secondKey,
                          text: 'bar',
                          marks: [],
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
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: secondKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: secondKey},
          ],
          offset: 2,
        },
      },
      undefined,
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: secondKey},
      ],
      offset: 0,
    },
    focus: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: secondKey},
      ],
      offset: 2,
    },
  })
})

test('finds default spans at four containers with unique keys without schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const secondKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        null,
                        'foo',
                        1,
                        {_type: 'span', _key: firstKey, text: 'foo', marks: []},
                        {
                          _type: 'span',
                          _key: secondKey,
                          text: 'bar',
                          marks: [],
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
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: secondKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: secondKey},
          ],
          offset: 2,
        },
      },
      undefined,
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: firstKey},
      ],
      offset: 3,
    },
    focus: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: secondKey},
      ],
      offset: 2,
    },
  })
})

test('ignores text-bearing inline objects at four containers with unique keys with schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const secondKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        null,
                        'foo',
                        1,
                        {_type: 'span', _key: firstKey, text: 'foo', marks: []},
                        {_type: 'mention', text: 'baz'},
                        {
                          _type: 'span',
                          _key: secondKey,
                          text: 'bar',
                          marks: [],
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
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: secondKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: secondKey},
          ],
          offset: 2,
        },
      },
      {schema: compileSchema(defineSchema({}))},
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: secondKey},
      ],
      offset: 0,
    },
    focus: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: secondKey},
      ],
      offset: 2,
    },
  })
})

test('finds default spans at four containers with unique keys with schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const secondKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        null,
                        'foo',
                        1,
                        {_type: 'span', _key: firstKey, text: 'foo', marks: []},
                        {
                          _type: 'span',
                          _key: secondKey,
                          text: 'bar',
                          marks: [],
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
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: secondKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: secondKey},
          ],
          offset: 2,
        },
      },
      {schema: compileSchema(defineSchema({}))},
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: firstKey},
      ],
      offset: 3,
    },
    focus: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: secondKey},
      ],
      offset: 2,
    },
  })
})

test('ignores text-bearing inline objects at four containers with missing keys without schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        null,
                        'foo',
                        1,
                        {_type: 'span', text: 'foo', marks: []},
                        {_type: 'mention', text: 'baz'},
                        {_type: 'span', text: 'bar', marks: []},
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
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            5,
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            5,
          ],
          offset: 2,
        },
      },
      undefined,
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        5,
      ],
      offset: 0,
    },
    focus: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        5,
      ],
      offset: 2,
    },
  })
})

test('finds default spans at four containers with missing keys without schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        null,
                        'foo',
                        1,
                        {_type: 'span', text: 'foo', marks: []},
                        {_type: 'span', text: 'bar', marks: []},
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
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            4,
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            4,
          ],
          offset: 2,
        },
      },
      undefined,
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        3,
      ],
      offset: 3,
    },
    focus: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        4,
      ],
      offset: 2,
    },
  })
})

test('ignores text-bearing inline objects at four containers with missing keys with schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        null,
                        'foo',
                        1,
                        {_type: 'span', text: 'foo', marks: []},
                        {_type: 'mention', text: 'baz'},
                        {_type: 'span', text: 'bar', marks: []},
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
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            5,
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            5,
          ],
          offset: 2,
        },
      },
      {schema: compileSchema(defineSchema({}))},
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        5,
      ],
      offset: 0,
    },
    focus: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        5,
      ],
      offset: 2,
    },
  })
})

test('finds default spans at four containers with missing keys with schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        null,
                        'foo',
                        1,
                        {_type: 'span', text: 'foo', marks: []},
                        {_type: 'span', text: 'bar', marks: []},
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
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            4,
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            4,
          ],
          offset: 2,
        },
      },
      {schema: compileSchema(defineSchema({}))},
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        3,
      ],
      offset: 3,
    },
    focus: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        4,
      ],
      offset: 2,
    },
  })
})

test('ignores text-bearing inline objects at four containers with empty keys without schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        null,
                        'foo',
                        1,
                        {_type: 'span', _key: '', text: 'foo', marks: []},
                        {_type: 'mention', text: 'baz'},
                        {_type: 'span', _key: '', text: 'bar', marks: []},
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
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            5,
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            5,
          ],
          offset: 2,
        },
      },
      undefined,
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        5,
      ],
      offset: 0,
    },
    focus: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        5,
      ],
      offset: 2,
    },
  })
})

test('finds default spans at four containers with empty keys without schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        null,
                        'foo',
                        1,
                        {_type: 'span', _key: '', text: 'foo', marks: []},
                        {_type: 'span', _key: '', text: 'bar', marks: []},
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
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            4,
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            4,
          ],
          offset: 2,
        },
      },
      undefined,
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        3,
      ],
      offset: 3,
    },
    focus: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        4,
      ],
      offset: 2,
    },
  })
})

test('ignores text-bearing inline objects at four containers with empty keys with schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        null,
                        'foo',
                        1,
                        {_type: 'span', _key: '', text: 'foo', marks: []},
                        {_type: 'mention', text: 'baz'},
                        {_type: 'span', _key: '', text: 'bar', marks: []},
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
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            5,
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            5,
          ],
          offset: 2,
        },
      },
      {schema: compileSchema(defineSchema({}))},
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        5,
      ],
      offset: 0,
    },
    focus: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        5,
      ],
      offset: 2,
    },
  })
})

test('finds default spans at four containers with empty keys with schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        null,
                        'foo',
                        1,
                        {_type: 'span', _key: '', text: 'foo', marks: []},
                        {_type: 'span', _key: '', text: 'bar', marks: []},
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
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            4,
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            4,
          ],
          offset: 2,
        },
      },
      {schema: compileSchema(defineSchema({}))},
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        3,
      ],
      offset: 3,
    },
    focus: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        4,
      ],
      offset: 2,
    },
  })
})

test('ignores text-bearing inline objects at four containers with duplicate keys without schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        null,
                        'foo',
                        1,
                        {_type: 'span', _key: firstKey, text: 'foo', marks: []},
                        {_type: 'mention', text: 'baz'},
                        {_type: 'span', _key: firstKey, text: 'bar', marks: []},
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
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            5,
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            5,
          ],
          offset: 2,
        },
      },
      undefined,
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        5,
      ],
      offset: 0,
    },
    focus: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        5,
      ],
      offset: 2,
    },
  })
})

test('finds default spans at four containers with duplicate keys without schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        null,
                        'foo',
                        1,
                        {_type: 'span', _key: firstKey, text: 'foo', marks: []},
                        {_type: 'span', _key: firstKey, text: 'bar', marks: []},
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
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            4,
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            4,
          ],
          offset: 2,
        },
      },
      undefined,
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        3,
      ],
      offset: 3,
    },
    focus: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        4,
      ],
      offset: 2,
    },
  })
})

test('ignores text-bearing inline objects at four containers with duplicate keys with schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        null,
                        'foo',
                        1,
                        {_type: 'span', _key: firstKey, text: 'foo', marks: []},
                        {_type: 'mention', text: 'baz'},
                        {_type: 'span', _key: firstKey, text: 'bar', marks: []},
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
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            5,
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            5,
          ],
          offset: 2,
        },
      },
      {schema: compileSchema(defineSchema({}))},
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        5,
      ],
      offset: 0,
    },
    focus: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        5,
      ],
      offset: 2,
    },
  })
})

test('finds default spans at four containers with duplicate keys with schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        null,
                        'foo',
                        1,
                        {_type: 'span', _key: firstKey, text: 'foo', marks: []},
                        {_type: 'span', _key: firstKey, text: 'bar', marks: []},
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
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            4,
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            4,
          ],
          offset: 2,
        },
      },
      {schema: compileSchema(defineSchema({}))},
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        3,
      ],
      offset: 3,
    },
    focus: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        4,
      ],
      offset: 2,
    },
  })
})

test('ignores text-bearing inline objects at object field with unique keys without schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const secondKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              null,
              'foo',
              1,
              {_type: 'span', _key: firstKey, text: 'foo', marks: []},
              {_type: 'mention', text: 'baz'},
              {_type: 'span', _key: secondKey, text: 'bar', marks: []},
            ],
          },
        ],
      },
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            {_key: secondKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            {_key: secondKey},
          ],
          offset: 2,
        },
      },
      undefined,
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        {_key: secondKey},
      ],
      offset: 0,
    },
    focus: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        {_key: secondKey},
      ],
      offset: 2,
    },
  })
})

test('finds default spans at object field with unique keys without schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const secondKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              null,
              'foo',
              1,
              {_type: 'span', _key: firstKey, text: 'foo', marks: []},
              {_type: 'span', _key: secondKey, text: 'bar', marks: []},
            ],
          },
        ],
      },
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            {_key: secondKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            {_key: secondKey},
          ],
          offset: 2,
        },
      },
      undefined,
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        {_key: firstKey},
      ],
      offset: 3,
    },
    focus: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        {_key: secondKey},
      ],
      offset: 2,
    },
  })
})

test('ignores text-bearing inline objects at object field with unique keys with schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const secondKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              null,
              'foo',
              1,
              {_type: 'span', _key: firstKey, text: 'foo', marks: []},
              {_type: 'mention', text: 'baz'},
              {_type: 'span', _key: secondKey, text: 'bar', marks: []},
            ],
          },
        ],
      },
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            {_key: secondKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            {_key: secondKey},
          ],
          offset: 2,
        },
      },
      {schema: compileSchema(defineSchema({}))},
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        {_key: secondKey},
      ],
      offset: 0,
    },
    focus: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        {_key: secondKey},
      ],
      offset: 2,
    },
  })
})

test('finds default spans at object field with unique keys with schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const secondKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              null,
              'foo',
              1,
              {_type: 'span', _key: firstKey, text: 'foo', marks: []},
              {_type: 'span', _key: secondKey, text: 'bar', marks: []},
            ],
          },
        ],
      },
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            {_key: secondKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            {_key: secondKey},
          ],
          offset: 2,
        },
      },
      {schema: compileSchema(defineSchema({}))},
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        {_key: firstKey},
      ],
      offset: 3,
    },
    focus: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        {_key: secondKey},
      ],
      offset: 2,
    },
  })
})

test('ignores text-bearing inline objects at object field with missing keys without schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              null,
              'foo',
              1,
              {_type: 'span', text: 'foo', marks: []},
              {_type: 'mention', text: 'baz'},
              {_type: 'span', text: 'bar', marks: []},
            ],
          },
        ],
      },
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            5,
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            5,
          ],
          offset: 2,
        },
      },
      undefined,
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        5,
      ],
      offset: 0,
    },
    focus: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        5,
      ],
      offset: 2,
    },
  })
})

test('finds default spans at object field with missing keys without schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              null,
              'foo',
              1,
              {_type: 'span', text: 'foo', marks: []},
              {_type: 'span', text: 'bar', marks: []},
            ],
          },
        ],
      },
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            4,
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            4,
          ],
          offset: 2,
        },
      },
      undefined,
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        3,
      ],
      offset: 3,
    },
    focus: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        4,
      ],
      offset: 2,
    },
  })
})

test('ignores text-bearing inline objects at object field with missing keys with schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              null,
              'foo',
              1,
              {_type: 'span', text: 'foo', marks: []},
              {_type: 'mention', text: 'baz'},
              {_type: 'span', text: 'bar', marks: []},
            ],
          },
        ],
      },
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            5,
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            5,
          ],
          offset: 2,
        },
      },
      {schema: compileSchema(defineSchema({}))},
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        5,
      ],
      offset: 0,
    },
    focus: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        5,
      ],
      offset: 2,
    },
  })
})

test('finds default spans at object field with missing keys with schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              null,
              'foo',
              1,
              {_type: 'span', text: 'foo', marks: []},
              {_type: 'span', text: 'bar', marks: []},
            ],
          },
        ],
      },
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            4,
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            4,
          ],
          offset: 2,
        },
      },
      {schema: compileSchema(defineSchema({}))},
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        3,
      ],
      offset: 3,
    },
    focus: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        4,
      ],
      offset: 2,
    },
  })
})

test('ignores text-bearing inline objects at object field with empty keys without schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              null,
              'foo',
              1,
              {_type: 'span', _key: '', text: 'foo', marks: []},
              {_type: 'mention', text: 'baz'},
              {_type: 'span', _key: '', text: 'bar', marks: []},
            ],
          },
        ],
      },
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            5,
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            5,
          ],
          offset: 2,
        },
      },
      undefined,
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        5,
      ],
      offset: 0,
    },
    focus: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        5,
      ],
      offset: 2,
    },
  })
})

test('finds default spans at object field with empty keys without schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              null,
              'foo',
              1,
              {_type: 'span', _key: '', text: 'foo', marks: []},
              {_type: 'span', _key: '', text: 'bar', marks: []},
            ],
          },
        ],
      },
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            4,
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            4,
          ],
          offset: 2,
        },
      },
      undefined,
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        3,
      ],
      offset: 3,
    },
    focus: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        4,
      ],
      offset: 2,
    },
  })
})

test('ignores text-bearing inline objects at object field with empty keys with schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              null,
              'foo',
              1,
              {_type: 'span', _key: '', text: 'foo', marks: []},
              {_type: 'mention', text: 'baz'},
              {_type: 'span', _key: '', text: 'bar', marks: []},
            ],
          },
        ],
      },
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            5,
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            5,
          ],
          offset: 2,
        },
      },
      {schema: compileSchema(defineSchema({}))},
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        5,
      ],
      offset: 0,
    },
    focus: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        5,
      ],
      offset: 2,
    },
  })
})

test('finds default spans at object field with empty keys with schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              null,
              'foo',
              1,
              {_type: 'span', _key: '', text: 'foo', marks: []},
              {_type: 'span', _key: '', text: 'bar', marks: []},
            ],
          },
        ],
      },
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            4,
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            4,
          ],
          offset: 2,
        },
      },
      {schema: compileSchema(defineSchema({}))},
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        3,
      ],
      offset: 3,
    },
    focus: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        4,
      ],
      offset: 2,
    },
  })
})

test('ignores text-bearing inline objects at object field with duplicate keys without schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              null,
              'foo',
              1,
              {_type: 'span', _key: firstKey, text: 'foo', marks: []},
              {_type: 'mention', text: 'baz'},
              {_type: 'span', _key: firstKey, text: 'bar', marks: []},
            ],
          },
        ],
      },
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            5,
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            5,
          ],
          offset: 2,
        },
      },
      undefined,
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        5,
      ],
      offset: 0,
    },
    focus: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        5,
      ],
      offset: 2,
    },
  })
})

test('finds default spans at object field with duplicate keys without schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              null,
              'foo',
              1,
              {_type: 'span', _key: firstKey, text: 'foo', marks: []},
              {_type: 'span', _key: firstKey, text: 'bar', marks: []},
            ],
          },
        ],
      },
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            4,
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            4,
          ],
          offset: 2,
        },
      },
      undefined,
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        3,
      ],
      offset: 3,
    },
    focus: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        4,
      ],
      offset: 2,
    },
  })
})

test('ignores text-bearing inline objects at object field with duplicate keys with schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              null,
              'foo',
              1,
              {_type: 'span', _key: firstKey, text: 'foo', marks: []},
              {_type: 'mention', text: 'baz'},
              {_type: 'span', _key: firstKey, text: 'bar', marks: []},
            ],
          },
        ],
      },
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            5,
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            5,
          ],
          offset: 2,
        },
      },
      {schema: compileSchema(defineSchema({}))},
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        5,
      ],
      offset: 0,
    },
    focus: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        5,
      ],
      offset: 2,
    },
  })
})

test('finds default spans at object field with duplicate keys with schema', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              null,
              'foo',
              1,
              {_type: 'span', _key: firstKey, text: 'foo', marks: []},
              {_type: 'span', _key: firstKey, text: 'bar', marks: []},
            ],
          },
        ],
      },
    },
  ]
  expect(
    normalizeRangeBoundary(
      value,
      {
        anchor: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            4,
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            4,
          ],
          offset: 2,
        },
      },
      {schema: compileSchema(defineSchema({}))},
    ),
  ).toEqual({
    anchor: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        3,
      ],
      offset: 3,
    },
    focus: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        4,
      ],
      offset: 2,
    },
  })
})

test('an undeclared array retains the schema block and span names', () => {
  const schema = {
    ...compileSchema(defineSchema({block: {name: 'paragraph'}})),
    span: {name: 'textRun'},
  }
  expect(getSubSchema(schema, [])).toEqual({
    block: {name: 'paragraph', fields: undefined},
    span: {name: 'textRun'},
    styles: [],
    decorators: [],
    annotations: [],
    lists: [],
    inlineObjects: [],
    blockObjects: [],
  })
})

test('custom schema text at root requires its schema even through undeclared fields', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const secondKey = keyGenerator()
  const value = [
    {
      _type: 'paragraph',
      _key: blockKey,
      children: [
        {_type: 'textRun', _key: firstKey, text: 'foo', marks: []},
        {_type: 'textRun', _key: secondKey, text: 'bar', marks: []},
      ],
    },
  ]
  const range = {
    anchor: {
      path: [{_key: blockKey}, 'children', {_key: secondKey}],
      offset: 0,
    },
    focus: {path: [{_key: blockKey}, 'children', {_key: secondKey}], offset: 2},
  }
  expect(
    normalizeRangeBoundary(value, range, {
      schema: {
        ...compileSchema(defineSchema({block: {name: 'paragraph'}})),
        span: {name: 'textRun'},
      },
    }),
  ).toEqual({
    anchor: {path: [{_key: blockKey}, 'children', {_key: firstKey}], offset: 3},
    focus: {path: [{_key: blockKey}, 'children', {_key: secondKey}], offset: 2},
  })
  expect(normalizeRangeBoundary(value, range)).toEqual(range)
})

test('custom schema text at four containers requires its schema even through undeclared fields', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const secondKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'paragraph',
                      _key: blockKey,
                      children: [
                        {
                          _type: 'textRun',
                          _key: firstKey,
                          text: 'foo',
                          marks: [],
                        },
                        {
                          _type: 'textRun',
                          _key: secondKey,
                          text: 'bar',
                          marks: [],
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
  ]
  const range = {
    anchor: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: secondKey},
      ],
      offset: 0,
    },
    focus: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: secondKey},
      ],
      offset: 2,
    },
  }
  expect(
    normalizeRangeBoundary(value, range, {
      schema: {
        ...compileSchema(defineSchema({block: {name: 'paragraph'}})),
        span: {name: 'textRun'},
      },
    }),
  ).toEqual({
    anchor: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: firstKey},
      ],
      offset: 3,
    },
    focus: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: secondKey},
      ],
      offset: 2,
    },
  })
  expect(normalizeRangeBoundary(value, range)).toEqual(range)
})

test('custom schema text at object field requires its schema even through undeclared fields', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const secondKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'paragraph',
            _key: blockKey,
            children: [
              {_type: 'textRun', _key: firstKey, text: 'foo', marks: []},
              {_type: 'textRun', _key: secondKey, text: 'bar', marks: []},
            ],
          },
        ],
      },
    },
  ]
  const range = {
    anchor: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        {_key: secondKey},
      ],
      offset: 0,
    },
    focus: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        {_key: secondKey},
      ],
      offset: 2,
    },
  }
  expect(
    normalizeRangeBoundary(value, range, {
      schema: {
        ...compileSchema(defineSchema({block: {name: 'paragraph'}})),
        span: {name: 'textRun'},
      },
    }),
  ).toEqual({
    anchor: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        {_key: firstKey},
      ],
      offset: 3,
    },
    focus: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        {_key: secondKey},
      ],
      offset: 2,
    },
  })
  expect(normalizeRangeBoundary(value, range)).toEqual(range)
})

test('custom schema text follows declared container schemas', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const secondKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'paragraph',
                      _key: blockKey,
                      children: [
                        {
                          _type: 'textRun',
                          _key: firstKey,
                          text: 'foo',
                          marks: [],
                        },
                        {
                          _type: 'textRun',
                          _key: secondKey,
                          text: 'bar',
                          marks: [],
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
  ]
  const range = {
    anchor: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: secondKey},
      ],
      offset: 0,
    },
    focus: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: secondKey},
      ],
      offset: 2,
    },
  }
  expect(
    normalizeRangeBoundary(value, range, {
      schema: {
        ...compileSchema(defineSchema({})),
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [
                  {
                    type: 'object',
                    name: 'table',
                    fields: [
                      {
                        name: 'rows',
                        type: 'array',
                        of: [
                          {
                            type: 'object',
                            name: 'row',
                            fields: [
                              {
                                name: 'cells',
                                type: 'array',
                                of: [
                                  {
                                    type: 'object',
                                    name: 'cell',
                                    fields: [
                                      {
                                        name: 'content',
                                        type: 'array',
                                        of: [
                                          {type: 'block', name: 'paragraph'},
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
                  },
                ],
              },
            ],
          },
        ],
        span: {name: 'textRun'},
      },
    }),
  ).toEqual({
    anchor: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: firstKey},
      ],
      offset: 3,
    },
    focus: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: secondKey},
      ],
      offset: 2,
    },
  })
  expect(normalizeRangeBoundary(value, range)).toEqual(range)
})

test('reads block keys once for addressing and once during text classification', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 32}, () => keyGenerator())
  let keyReads = 0
  const value = Array.from({length: 16}, (_, blockIndex) => {
    const blockKey = keys[blockIndex * 2]!
    const spanKey = keys[blockIndex * 2 + 1]!
    return {
      _type: 'block',
      get _key() {
        keyReads++
        return blockKey
      },
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
      markDefs: [],
    }
  })
  const range = {
    anchor: {path: [{_key: keys[0]!}, 'children', {_key: keys[1]!}], offset: 0},
    focus: {
      path: [{_key: keys[30]!}, 'children', {_key: keys[31]!}],
      offset: 1,
    },
  }
  expect(normalizeRangeBoundary(value, range)).toEqual({
    anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
    focus: {path: [{_key: 'k30'}, 'children', {_key: 'k31'}], offset: 1},
  })
  expect(keyReads).toEqual(32)
})
