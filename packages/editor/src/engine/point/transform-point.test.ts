import {describe, expect, test} from 'vitest'
import type {Operation} from '../interfaces/operation'
import {transformPoint} from './transform-point'

describe(transformPoint.name, () => {
  test('null point returns null', () => {
    const op: Operation = {
      type: 'insert_text',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 0,
      text: 'hello',
    }
    expect(transformPoint(null, op)).toEqual(null)
  })

  test('insert_text adjusts offset forward', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 5,
    }
    const op: Operation = {
      type: 'insert_text',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'abc',
    }
    expect(transformPoint(point, op)).toEqual({
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 8,
    })
  })

  test('insert_text before offset is no-op', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 2,
    }
    const op: Operation = {
      type: 'insert_text',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 5,
      text: 'abc',
    }
    expect(transformPoint(point, op)).toEqual({
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 2,
    })
  })

  test('insert_text different path is no-op', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 5,
    }
    const op: Operation = {
      type: 'insert_text',
      path: [{_key: 'b1'}, 'children', {_key: 's2'}],
      offset: 0,
      text: 'abc',
    }
    expect(transformPoint(point, op)).toEqual({
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 5,
    })
  })

  test('remove_text adjusts offset backward', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 5,
    }
    const op: Operation = {
      type: 'remove_text',
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
    const op: Operation = {
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
    const op: Operation = {
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
    const op: Operation = {
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
    const op: Operation = {
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

  test('set_selection is no-op', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
    }
    const op: Operation = {
      type: 'set_selection',
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
    const op: Operation = {
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
    const op: Operation = {
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
    const op: Operation = {
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
})
