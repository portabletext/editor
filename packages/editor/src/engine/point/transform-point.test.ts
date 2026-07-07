import {describe, expect, test} from 'vitest'
import type {EngineOperation} from '../interfaces/operation'
import {transformPoint} from './transform-point'

describe(transformPoint.name, () => {
  test('null point returns null', () => {
    const op: EngineOperation = {
      type: 'insert.text',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 0,
      text: 'hello',
    }
    expect(transformPoint(null, op)).toEqual(null)
  })

  test('insert.text adjusts offset forward', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 5,
    }
    const op: EngineOperation = {
      type: 'insert.text',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'abc',
    }
    expect(transformPoint(point, op)).toEqual({
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 8,
    })
  })

  test('insert.text before offset is no-op', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 2,
    }
    const op: EngineOperation = {
      type: 'insert.text',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 5,
      text: 'abc',
    }
    expect(transformPoint(point, op)).toEqual({
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 2,
    })
  })

  test('insert.text different path is no-op', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 5,
    }
    const op: EngineOperation = {
      type: 'insert.text',
      path: [{_key: 'b1'}, 'children', {_key: 's2'}],
      offset: 0,
      text: 'abc',
    }
    expect(transformPoint(point, op)).toEqual({
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 5,
    })
  })

  test('remove.text adjusts offset backward', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 5,
    }
    const op: EngineOperation = {
      type: 'remove.text',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 2,
      text: 'ab',
    }
    expect(transformPoint(point, op)).toEqual({
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
    })
  })

  test('unset (node removal) at point returns null', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
    }
    const op: EngineOperation = {
      type: 'unset',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
    }
    expect(transformPoint(point, op)).toEqual(null)
  })

  test('unset (node removal) ancestor of point returns null', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
    }
    const op: EngineOperation = {
      type: 'unset',
      path: [{_key: 'b1'}],
    }
    expect(transformPoint(point, op)).toEqual(null)
  })

  test('unset (node removal) different path is no-op', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
    }
    const op: EngineOperation = {
      type: 'unset',
      path: [{_key: 'b2'}],
    }
    expect(transformPoint(point, op)).toEqual({
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
    })
  })

  test('insert is no-op', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
    }
    const op: EngineOperation = {
      type: 'insert',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      node: {_key: 's2', _type: 'span', text: ''},
      position: 'after' as const,
    }
    expect(transformPoint(point, op)).toEqual({
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
    })
  })

  test('set.selection is no-op', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
    }
    const op: EngineOperation = {
      type: 'set.selection',
      properties: null,
      newProperties: {
        anchor: {path: [], offset: 0},
        focus: {path: [], offset: 0},
      },
    }
    expect(transformPoint(point, op)).toEqual({
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
    })
  })

  test('set _key substitutes old key with new key', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
    }
    const op: EngineOperation = {
      type: 'set',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}, '_key'],
      value: 's2',
      inverse: {
        type: 'set',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}, '_key'],
        value: 's1',
      },
    }
    expect(transformPoint(point, op)).toEqual({
      path: [{_key: 'b1'}, 'children', {_key: 's2'}],
      offset: 3,
    })
  })

  test('set non-key property is no-op on path', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
    }
    const op: EngineOperation = {
      type: 'set',
      path: [{_key: 'b1'}, 'style'],
      value: 'h1',
      inverse: {
        type: 'set',
        path: [{_key: 'b1'}, 'style'],
        value: 'normal',
      },
    }
    expect(transformPoint(point, op)).toEqual({
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
    })
  })

  test('unset text collapses offset', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 4,
    }
    const op: EngineOperation = {
      type: 'unset',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
      inverse: {
        type: 'set',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
        value: 'hello',
      },
    }
    expect(transformPoint(point, op)).toEqual({
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 0,
    })
  })

  test('set children: remaps a point through a text-preserving replacement', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 5,
    }
    const op: EngineOperation = {
      type: 'set',
      path: [{_key: 'b1'}, 'children'],
      value: [
        {_type: 'span', _key: 'n1', text: 'foo', marks: []},
        {_type: 'span', _key: 'n2', text: 'bar', marks: ['strong']},
        {_type: 'span', _key: 'n3', text: 'baz', marks: []},
      ],
      inverse: {
        type: 'set',
        path: [{_key: 'b1'}, 'children'],
        value: [{_type: 'span', _key: 's1', text: 'foobarbaz', marks: []}],
      },
    }
    expect(transformPoint(point, op)).toEqual({
      path: [{_key: 'b1'}, 'children', {_key: 'n2'}],
      offset: 2,
    })
  })

  test('set children: a boundary offset lands at the end of the earlier span', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
    }
    const op: EngineOperation = {
      type: 'set',
      path: [{_key: 'b1'}, 'children'],
      value: [
        {_type: 'span', _key: 'n1', text: 'foo', marks: []},
        {_type: 'span', _key: 'n2', text: 'barbaz', marks: []},
      ],
      inverse: {
        type: 'set',
        path: [{_key: 'b1'}, 'children'],
        value: [{_type: 'span', _key: 's1', text: 'foobarbaz', marks: []}],
      },
    }
    expect(transformPoint(point, op)).toEqual({
      path: [{_key: 'b1'}, 'children', {_key: 'n1'}],
      offset: 3,
    })
  })

  test('set children: inline objects occupy no text offset on either side', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's2'}],
      offset: 1,
    }
    const op: EngineOperation = {
      type: 'set',
      path: [{_key: 'b1'}, 'children'],
      value: [
        {_type: 'span', _key: 'n1', text: 'foo', marks: []},
        {_type: 'stock-ticker', _key: 'n2'},
        {_type: 'span', _key: 'n3', text: 'bar', marks: []},
      ],
      inverse: {
        type: 'set',
        path: [{_key: 'b1'}, 'children'],
        value: [
          {_type: 'span', _key: 's1', text: 'foo', marks: []},
          {_type: 'stock-ticker', _key: 'o1'},
          {_type: 'span', _key: 's2', text: 'bar', marks: []},
        ],
      },
    }
    expect(transformPoint(point, op)).toEqual({
      path: [{_key: 'b1'}, 'children', {_key: 'n3'}],
      offset: 1,
    })
  })

  test('set children: a surviving span keeps its identity over offset mapping', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 2,
    }
    const op: EngineOperation = {
      type: 'set',
      path: [{_key: 'b1'}, 'children'],
      value: [
        {_type: 'span', _key: 'n1', text: 'bar', marks: []},
        {_type: 'span', _key: 's1', text: 'foo', marks: []},
      ],
      inverse: {
        type: 'set',
        path: [{_key: 'b1'}, 'children'],
        value: [
          {_type: 'span', _key: 's1', text: 'foo', marks: []},
          {_type: 'span', _key: 'o2', text: 'bar', marks: []},
        ],
      },
    }
    expect(transformPoint(point, op)).toBe(point)
  })

  test('set children: a text-changing replacement leaves the point untransformed', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 5,
    }
    const op: EngineOperation = {
      type: 'set',
      path: [{_key: 'b1'}, 'children'],
      value: [{_type: 'span', _key: 'n1', text: 'hello', marks: []}],
      inverse: {
        type: 'set',
        path: [{_key: 'b1'}, 'children'],
        value: [{_type: 'span', _key: 's1', text: 'foobarbaz', marks: []}],
      },
    }
    expect(transformPoint(point, op)).toBe(point)
  })

  test('set children: no inverse leaves the point untransformed', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 5,
    }
    const op: EngineOperation = {
      type: 'set',
      path: [{_key: 'b1'}, 'children'],
      value: [{_type: 'span', _key: 'n1', text: 'foobarbaz', marks: []}],
    }
    expect(transformPoint(point, op)).toBe(point)
  })

  test('set children: a point in another block is untouched', () => {
    const point = {
      path: [{_key: 'b2'}, 'children', {_key: 's9'}],
      offset: 5,
    }
    const op: EngineOperation = {
      type: 'set',
      path: [{_key: 'b1'}, 'children'],
      value: [{_type: 'span', _key: 'n1', text: 'foobarbaz', marks: []}],
      inverse: {
        type: 'set',
        path: [{_key: 'b1'}, 'children'],
        value: [{_type: 'span', _key: 's1', text: 'foobarbaz', marks: []}],
      },
    }
    expect(transformPoint(point, op)).toBe(point)
  })

  test('set children: container blocks in a field named `children` are not offset-mapped', () => {
    // A container's array field may be named `children` and hold
    // blocks. Blocks carry no `text`, so a point addressing a replaced
    // block keeps the untransformed-point behavior.
    const point = {
      path: [{_key: 'callout1'}, 'children', {_key: 'block1'}],
      offset: 0,
    }
    const op: EngineOperation = {
      type: 'set',
      path: [{_key: 'callout1'}, 'children'],
      value: [
        {
          _type: 'block',
          _key: 'newBlock1',
          children: [{_type: 'span', _key: 'n1', text: 'foo', marks: []}],
        },
      ],
      inverse: {
        type: 'set',
        path: [{_key: 'callout1'}, 'children'],
        value: [
          {
            _type: 'block',
            _key: 'block1',
            children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
          },
        ],
      },
    }
    expect(transformPoint(point, op)).toBe(point)
  })

  test('set children: a point deeper inside replaced container blocks is untouched', () => {
    const point = {
      path: [
        {_key: 'callout1'},
        'children',
        {_key: 'block1'},
        'children',
        {_key: 's1'},
      ],
      offset: 2,
    }
    const op: EngineOperation = {
      type: 'set',
      path: [{_key: 'callout1'}, 'children'],
      value: [
        {
          _type: 'block',
          _key: 'newBlock1',
          children: [{_type: 'span', _key: 'n1', text: 'foo', marks: []}],
        },
      ],
      inverse: {
        type: 'set',
        path: [{_key: 'callout1'}, 'children'],
        value: [
          {
            _type: 'block',
            _key: 'block1',
            children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
          },
        ],
      },
    }
    expect(transformPoint(point, op)).toBe(point)
  })

  test('set children: remaps span points of a text block nested in a container', () => {
    const point = {
      path: [
        {_key: 'table1'},
        'rows',
        {_key: 'row1'},
        'cells',
        {_key: 'cell1'},
        'content',
        {_key: 'block1'},
        'children',
        {_key: 's1'},
      ],
      offset: 5,
    }
    const op: EngineOperation = {
      type: 'set',
      path: [
        {_key: 'table1'},
        'rows',
        {_key: 'row1'},
        'cells',
        {_key: 'cell1'},
        'content',
        {_key: 'block1'},
        'children',
      ],
      value: [
        {_type: 'span', _key: 'n1', text: 'foo', marks: []},
        {_type: 'span', _key: 'n2', text: 'bar', marks: ['strong']},
        {_type: 'span', _key: 'n3', text: 'baz', marks: []},
      ],
      inverse: {
        type: 'set',
        path: [
          {_key: 'table1'},
          'rows',
          {_key: 'row1'},
          'cells',
          {_key: 'cell1'},
          'content',
          {_key: 'block1'},
          'children',
        ],
        value: [{_type: 'span', _key: 's1', text: 'foobarbaz', marks: []}],
      },
    }
    expect(transformPoint(point, op)).toEqual({
      path: [
        {_key: 'table1'},
        'rows',
        {_key: 'row1'},
        'cells',
        {_key: 'cell1'},
        'content',
        {_key: 'block1'},
        'children',
        {_key: 'n2'},
      ],
      offset: 2,
    })
  })

  test('set children: a raw block-offset point is never offset-mapped', () => {
    // Selections can carry raw block-offset points ({path: [block],
    // offset: N}) that resolve lazily. The children remap only applies
    // to points addressing a direct child of the replaced array, so
    // block-path points pass through untouched.
    const point = {
      path: [{_key: 'b1'}],
      offset: 5,
    }
    const op: EngineOperation = {
      type: 'set',
      path: [{_key: 'b1'}, 'children'],
      value: [{_type: 'span', _key: 'n1', text: 'foobarbaz', marks: []}],
      inverse: {
        type: 'set',
        path: [{_key: 'b1'}, 'children'],
        value: [{_type: 'span', _key: 's1', text: 'foobarbaz', marks: []}],
      },
    }
    expect(transformPoint(point, op)).toBe(point)
  })
})
