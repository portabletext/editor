import {compileSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../../test-utils/create-test-snapshot'
import {
  textBlockDepthsContainers,
  textBlockDepthsSchemaDefinition,
} from '../../test-utils/text-block-depths'
import {
  createNodeTraversalTestbed,
  resolveTestbedContainers,
} from './node-traversal-testbed'
import {rangeIntersects} from './range-intersects'

describe(rangeIntersects.name, () => {
  const testbed = createNodeTraversalTestbed()
  const snapshot = testbed.snapshot

  test('returns false when the range is null', () => {
    expect(
      rangeIntersects(snapshot, null, [{_key: testbed.textBlock1._key}]),
    ).toBe(false)
  })

  test('returns false when the target is null', () => {
    const point = {
      path: [
        {_key: testbed.textBlock1._key},
        'children',
        {_key: testbed.span1._key},
      ],
      offset: 0,
    }
    const range = {anchor: point, focus: point}
    expect(rangeIntersects(snapshot, range, null)).toBe(false)
  })

  describe('Path target', () => {
    test('collapsed range inside the target path is included', () => {
      const point = {
        path: [
          {_key: testbed.textBlock1._key},
          'children',
          {_key: testbed.span1._key},
        ],
        offset: 0,
      }
      const range = {anchor: point, focus: point}
      expect(
        rangeIntersects(snapshot, range, [{_key: testbed.textBlock1._key}]),
      ).toBe(true)
    })

    test('collapsed range outside the target path is not included', () => {
      const point = {
        path: [
          {_key: testbed.textBlock2._key},
          'children',
          {_key: testbed.span3._key},
        ],
        offset: 0,
      }
      const range = {anchor: point, focus: point}
      expect(
        rangeIntersects(snapshot, range, [{_key: testbed.textBlock1._key}]),
      ).toBe(false)
    })

    test('expanded range that spans the target path is included', () => {
      const range = {
        anchor: {
          path: [
            {_key: testbed.textBlock1._key},
            'children',
            {_key: testbed.span1._key},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: testbed.textBlock2._key},
            'children',
            {_key: testbed.span3._key},
          ],
          offset: 0,
        },
      }
      expect(
        rangeIntersects(snapshot, range, [{_key: testbed.image._key}]),
      ).toBe(true)
    })

    test('deep path inside a nested container is included when range lives there', () => {
      const point = {
        path: [
          {_key: testbed.table._key},
          'rows',
          {_key: testbed.row1._key},
          'cells',
          {_key: testbed.cell1._key},
          'content',
          {_key: testbed.cellBlock1._key},
          'children',
          {_key: testbed.cellSpan1._key},
        ],
        offset: 0,
      }
      const range = {anchor: point, focus: point}
      expect(
        rangeIntersects(snapshot, range, [
          {_key: testbed.table._key},
          'rows',
          {_key: testbed.row1._key},
        ]),
      ).toBe(true)
    })
  })

  describe('Point target', () => {
    test('point inside the range is included', () => {
      const range = {
        anchor: {
          path: [
            {_key: testbed.textBlock1._key},
            'children',
            {_key: testbed.span1._key},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: testbed.textBlock1._key},
            'children',
            {_key: testbed.span2._key},
          ],
          offset: 0,
        },
      }
      const target = {
        path: [
          {_key: testbed.textBlock1._key},
          'children',
          {_key: testbed.span1._key},
        ],
        offset: 3,
      }
      expect(rangeIntersects(snapshot, range, target)).toBe(true)
    })

    test('point outside the range is not included', () => {
      const point = {
        path: [
          {_key: testbed.textBlock1._key},
          'children',
          {_key: testbed.span1._key},
        ],
        offset: 0,
      }
      const range = {anchor: point, focus: point}
      const target = {
        path: [
          {_key: testbed.textBlock2._key},
          'children',
          {_key: testbed.span3._key},
        ],
        offset: 0,
      }
      expect(rangeIntersects(snapshot, range, target)).toBe(false)
    })
  })

  describe('Range target', () => {
    test('overlapping ranges return true', () => {
      const a = {
        path: [
          {_key: testbed.textBlock1._key},
          'children',
          {_key: testbed.span1._key},
        ],
        offset: 0,
      }
      const b = {
        path: [
          {_key: testbed.textBlock1._key},
          'children',
          {_key: testbed.span2._key},
        ],
        offset: 0,
      }
      const range = {anchor: a, focus: b}
      const target = {anchor: b, focus: b}
      expect(rangeIntersects(snapshot, range, target)).toBe(true)
    })

    test('non-overlapping ranges return false', () => {
      const inBlock1 = {
        path: [
          {_key: testbed.textBlock1._key},
          'children',
          {_key: testbed.span1._key},
        ],
        offset: 0,
      }
      const inBlock2 = {
        path: [
          {_key: testbed.textBlock2._key},
          'children',
          {_key: testbed.span3._key},
        ],
        offset: 0,
      }
      const range = {anchor: inBlock1, focus: inBlock1}
      const target = {anchor: inBlock2, focus: inBlock2}
      expect(rangeIntersects(snapshot, range, target)).toBe(false)
    })
  })
})

const depthsSchema = compileSchema(textBlockDepthsSchemaDefinition)
const depthsContainers = resolveTestbedContainers(
  depthsSchema,
  textBlockDepthsContainers,
)

describe(`${rangeIntersects.name} with a compact path to a text block at the root`, () => {
  test('a compact span path (indexed) intersects nothing as a target or as a range', () => {
    const snapshot = createTestSnapshot({
      context: {
        schema: depthsSchema,
        containers: depthsContainers,
        value: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    })
    const fullRange = {
      anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
      focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 3},
    }
    const compactRange = {
      anchor: {path: [0, 0], offset: 0},
      focus: {path: [0, 0], offset: 3},
    }

    expect([
      rangeIntersects(snapshot, fullRange, [0, 0]),
      rangeIntersects(snapshot, fullRange, {path: [0, 0], offset: 1}),
      rangeIntersects(snapshot, fullRange, compactRange),
      rangeIntersects(snapshot, compactRange, [
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ]),
      rangeIntersects(snapshot, compactRange, fullRange),
    ]).toEqual([false, false, false, false, false])
  })

  test('a range with one endpoint at a compact span path (indexed) intersects nothing as a target or as a range', () => {
    const snapshot = createTestSnapshot({
      context: {
        schema: depthsSchema,
        containers: depthsContainers,
        value: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    })
    const fullRange = {
      anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
      focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 3},
    }
    const compactFocusRange = {
      anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
      focus: {path: [0, 0], offset: 3},
    }
    const compactAnchorRange = {
      anchor: {path: [0, 0], offset: 0},
      focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 3},
    }

    expect([
      rangeIntersects(snapshot, fullRange, compactFocusRange),
      rangeIntersects(snapshot, compactFocusRange, [
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ]),
      rangeIntersects(snapshot, compactFocusRange, fullRange),
      rangeIntersects(snapshot, fullRange, compactAnchorRange),
      rangeIntersects(snapshot, compactAnchorRange, [
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ]),
      rangeIntersects(snapshot, compactAnchorRange, fullRange),
    ]).toEqual([false, false, false, false, false, false])
  })
})

describe(`${rangeIntersects.name} with a compact path to a text block inside a callout`, () => {
  test('a compact span path (indexed) intersects nothing as a target or as a range', () => {
    const snapshot = createTestSnapshot({
      context: {
        schema: depthsSchema,
        containers: depthsContainers,
        value: [
          {
            _type: 'callout',
            _key: 'c0',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [
                  {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  {_type: 'span', _key: 's1', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    })
    const fullRange = {
      anchor: {
        path: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'children', {_key: 's0'}],
        offset: 0,
      },
      focus: {
        path: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'children', {_key: 's0'}],
        offset: 3,
      },
    }
    const compactRange = {
      anchor: {path: [0, 'content', 0, 0], offset: 0},
      focus: {path: [0, 'content', 0, 0], offset: 3},
    }

    expect([
      rangeIntersects(snapshot, fullRange, [0, 'content', 0, 0]),
      rangeIntersects(snapshot, fullRange, {
        path: [0, 'content', 0, 0],
        offset: 1,
      }),
      rangeIntersects(snapshot, fullRange, compactRange),
      rangeIntersects(snapshot, compactRange, [
        {_key: 'c0'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ]),
      rangeIntersects(snapshot, compactRange, fullRange),
    ]).toEqual([false, false, false, false, false])
  })

  test('a range with one endpoint at a compact span path (indexed) intersects nothing as a target or as a range', () => {
    const snapshot = createTestSnapshot({
      context: {
        schema: depthsSchema,
        containers: depthsContainers,
        value: [
          {
            _type: 'callout',
            _key: 'c0',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [
                  {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  {_type: 'span', _key: 's1', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    })
    const fullRange = {
      anchor: {
        path: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'children', {_key: 's0'}],
        offset: 0,
      },
      focus: {
        path: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'children', {_key: 's0'}],
        offset: 3,
      },
    }
    const compactFocusRange = {
      anchor: {
        path: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'children', {_key: 's0'}],
        offset: 0,
      },
      focus: {path: [0, 'content', 0, 0], offset: 3},
    }
    const compactAnchorRange = {
      anchor: {path: [0, 'content', 0, 0], offset: 0},
      focus: {
        path: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'children', {_key: 's0'}],
        offset: 3,
      },
    }

    expect([
      rangeIntersects(snapshot, fullRange, compactFocusRange),
      rangeIntersects(snapshot, compactFocusRange, [
        {_key: 'c0'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ]),
      rangeIntersects(snapshot, compactFocusRange, fullRange),
      rangeIntersects(snapshot, fullRange, compactAnchorRange),
      rangeIntersects(snapshot, compactAnchorRange, [
        {_key: 'c0'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ]),
      rangeIntersects(snapshot, compactAnchorRange, fullRange),
    ]).toEqual([false, false, false, false, false, false])
  })
})

describe(`${rangeIntersects.name} with a compact path to a text block inside a callout inside a callout`, () => {
  test('a compact span path (indexed) intersects nothing as a target or as a range', () => {
    const snapshot = createTestSnapshot({
      context: {
        schema: depthsSchema,
        containers: depthsContainers,
        value: [
          {
            _type: 'callout',
            _key: 'c0',
            content: [
              {
                _type: 'callout',
                _key: 'c1',
                content: [
                  {
                    _type: 'block',
                    _key: 'b0',
                    children: [
                      {_type: 'span', _key: 's0', text: 'foo', marks: []},
                      {_type: 'span', _key: 's1', text: 'bar', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                ],
              },
            ],
          },
        ],
      },
    })
    const fullRange = {
      anchor: {
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
        ],
        offset: 0,
      },
      focus: {
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
        ],
        offset: 3,
      },
    }
    const compactRange = {
      anchor: {path: [0, 'content', 0, 'content', 0, 0], offset: 0},
      focus: {path: [0, 'content', 0, 'content', 0, 0], offset: 3},
    }

    expect([
      rangeIntersects(snapshot, fullRange, [0, 'content', 0, 'content', 0, 0]),
      rangeIntersects(snapshot, fullRange, {
        path: [0, 'content', 0, 'content', 0, 0],
        offset: 1,
      }),
      rangeIntersects(snapshot, fullRange, compactRange),
      rangeIntersects(snapshot, compactRange, [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ]),
      rangeIntersects(snapshot, compactRange, fullRange),
    ]).toEqual([false, false, false, false, false])
  })

  test('a range with one endpoint at a compact span path (indexed) intersects nothing as a target or as a range', () => {
    const snapshot = createTestSnapshot({
      context: {
        schema: depthsSchema,
        containers: depthsContainers,
        value: [
          {
            _type: 'callout',
            _key: 'c0',
            content: [
              {
                _type: 'callout',
                _key: 'c1',
                content: [
                  {
                    _type: 'block',
                    _key: 'b0',
                    children: [
                      {_type: 'span', _key: 's0', text: 'foo', marks: []},
                      {_type: 'span', _key: 's1', text: 'bar', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                ],
              },
            ],
          },
        ],
      },
    })
    const fullRange = {
      anchor: {
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
        ],
        offset: 0,
      },
      focus: {
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
        ],
        offset: 3,
      },
    }
    const compactFocusRange = {
      anchor: {
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
        ],
        offset: 0,
      },
      focus: {path: [0, 'content', 0, 'content', 0, 0], offset: 3},
    }
    const compactAnchorRange = {
      anchor: {path: [0, 'content', 0, 'content', 0, 0], offset: 0},
      focus: {
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
        ],
        offset: 3,
      },
    }

    expect([
      rangeIntersects(snapshot, fullRange, compactFocusRange),
      rangeIntersects(snapshot, compactFocusRange, [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ]),
      rangeIntersects(snapshot, compactFocusRange, fullRange),
      rangeIntersects(snapshot, fullRange, compactAnchorRange),
      rangeIntersects(snapshot, compactAnchorRange, [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ]),
      rangeIntersects(snapshot, compactAnchorRange, fullRange),
    ]).toEqual([false, false, false, false, false, false])
  })
})

describe(`${rangeIntersects.name} with a compact path to a text block inside a field with its own sub-schema`, () => {
  test('a compact span path (indexed) intersects nothing as a target or as a range', () => {
    const snapshot = createTestSnapshot({
      context: {
        schema: depthsSchema,
        containers: depthsContainers,
        value: [
          {
            _type: 'note',
            _key: 'n0',
            body: [
              {
                _type: 'block',
                _key: 'b0',
                children: [
                  {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  {_type: 'span', _key: 's1', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    })
    const fullRange = {
      anchor: {
        path: [{_key: 'n0'}, 'body', {_key: 'b0'}, 'children', {_key: 's0'}],
        offset: 0,
      },
      focus: {
        path: [{_key: 'n0'}, 'body', {_key: 'b0'}, 'children', {_key: 's0'}],
        offset: 3,
      },
    }
    const compactRange = {
      anchor: {path: [0, 'body', 0, 0], offset: 0},
      focus: {path: [0, 'body', 0, 0], offset: 3},
    }

    expect([
      rangeIntersects(snapshot, fullRange, [0, 'body', 0, 0]),
      rangeIntersects(snapshot, fullRange, {
        path: [0, 'body', 0, 0],
        offset: 1,
      }),
      rangeIntersects(snapshot, fullRange, compactRange),
      rangeIntersects(snapshot, compactRange, [
        {_key: 'n0'},
        'body',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ]),
      rangeIntersects(snapshot, compactRange, fullRange),
    ]).toEqual([false, false, false, false, false])
  })

  test('a range with one endpoint at a compact span path (indexed) intersects nothing as a target or as a range', () => {
    const snapshot = createTestSnapshot({
      context: {
        schema: depthsSchema,
        containers: depthsContainers,
        value: [
          {
            _type: 'note',
            _key: 'n0',
            body: [
              {
                _type: 'block',
                _key: 'b0',
                children: [
                  {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  {_type: 'span', _key: 's1', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    })
    const fullRange = {
      anchor: {
        path: [{_key: 'n0'}, 'body', {_key: 'b0'}, 'children', {_key: 's0'}],
        offset: 0,
      },
      focus: {
        path: [{_key: 'n0'}, 'body', {_key: 'b0'}, 'children', {_key: 's0'}],
        offset: 3,
      },
    }
    const compactFocusRange = {
      anchor: {
        path: [{_key: 'n0'}, 'body', {_key: 'b0'}, 'children', {_key: 's0'}],
        offset: 0,
      },
      focus: {path: [0, 'body', 0, 0], offset: 3},
    }
    const compactAnchorRange = {
      anchor: {path: [0, 'body', 0, 0], offset: 0},
      focus: {
        path: [{_key: 'n0'}, 'body', {_key: 'b0'}, 'children', {_key: 's0'}],
        offset: 3,
      },
    }

    expect([
      rangeIntersects(snapshot, fullRange, compactFocusRange),
      rangeIntersects(snapshot, compactFocusRange, [
        {_key: 'n0'},
        'body',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ]),
      rangeIntersects(snapshot, compactFocusRange, fullRange),
      rangeIntersects(snapshot, fullRange, compactAnchorRange),
      rangeIntersects(snapshot, compactAnchorRange, [
        {_key: 'n0'},
        'body',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ]),
      rangeIntersects(snapshot, compactAnchorRange, fullRange),
    ]).toEqual([false, false, false, false, false, false])
  })
})
