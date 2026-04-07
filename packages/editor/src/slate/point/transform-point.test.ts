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

  test('remove_node at point returns null', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
    }
    const op: Operation = {
      type: 'remove_node',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      node: {_key: 's1', _type: 'span', text: ''},
    }
    expect(transformPoint(point, op)).toEqual(null)
  })

  test('remove_node ancestor of point returns null', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
    }
    const op: Operation = {
      type: 'remove_node',
      path: [{_key: 'b1'}],
      node: {_key: 'b1', _type: 'block', children: []},
    }
    expect(transformPoint(point, op)).toEqual(null)
  })

  test('remove_node different path is no-op', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
    }
    const op: Operation = {
      type: 'remove_node',
      path: [{_key: 'b2'}],
      node: {_key: 'b2', _type: 'block', children: []},
    }
    expect(transformPoint(point, op)).toEqual({
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
    })
  })

  test('set_node collapses offset when text removed', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 4,
    }
    const op: Operation = {
      type: 'set_node',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      properties: {text: 'hello'},
      newProperties: {},
    }
    expect(transformPoint(point, op)).toEqual({
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 0,
    })
  })

  test('set_node substitutes old key with new key', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
    }
    const op: Operation = {
      type: 'set_node',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      properties: {_key: 's1'},
      newProperties: {_key: 's2'},
    }
    expect(transformPoint(point, op)).toEqual({
      path: [{_key: 'b1'}, 'children', {_key: 's2'}],
      offset: 3,
    })
  })

  test('set_node with combined _key and text change collapses offset', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 'k0'}],
      offset: 5,
    }
    const op: Operation = {
      type: 'set_node',
      path: [{_key: 'b1'}, 'children', {_key: 'k0'}],
      properties: {_key: 'k0', text: 'hello'},
      newProperties: {_key: 'k1'},
    }
    expect(transformPoint(point, op)).toEqual({
      path: [{_key: 'b1'}, 'children', {_key: 'k1'}],
      offset: 0,
    })
  })

  test('insert_node is no-op', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
    }
    const op: Operation = {
      type: 'insert_node',
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
})
