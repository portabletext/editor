import {describe, expect, test} from 'vitest'
import type {Operation} from '../interfaces/operation'
import {inverseOperation} from './inverse-operation'

describe(inverseOperation.name, () => {
  test('insert_node -> remove_node uses node key', () => {
    const op: Operation = {
      type: 'insert_node',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      node: {_key: 's2', _type: 'span', text: ''},
      position: 'after' as const,
    }
    expect(inverseOperation(op)).toEqual({
      type: 'remove_node',
      path: [{_key: 'b1'}, 'children', {_key: 's2'}],
      node: {_key: 's2', _type: 'span', text: ''},
    })
  })

  test('remove_node -> insert_node uses previousSiblingKey', () => {
    const op: Operation = {
      type: 'remove_node',
      path: [{_key: 'b1'}, 'children', {_key: 's2'}],
      node: {_key: 's2', _type: 'span', text: 'hello'},
      previousSiblingKey: 's1',
    }
    expect(inverseOperation(op)).toEqual({
      type: 'insert_node',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      node: {_key: 's2', _type: 'span', text: 'hello'},
      position: 'after' as const,
    })
  })

  test('remove_node first child -> insert_node with position before', () => {
    const op: Operation = {
      type: 'remove_node',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      node: {_key: 's1', _type: 'span', text: ''},
    }
    expect(inverseOperation(op)).toEqual({
      type: 'insert_node',
      path: [{_key: 'b1'}, 'children', 0],
      node: {_key: 's1', _type: 'span', text: ''},
      position: 'before' as const,
    })
  })

  test('insert_text -> remove_text', () => {
    const op: Operation = {
      type: 'insert_text',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'abc',
    }
    expect(inverseOperation(op)).toEqual({
      type: 'remove_text',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'abc',
    })
  })

  test('remove_text -> insert_text', () => {
    const op: Operation = {
      type: 'remove_text',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 2,
      text: 'ab',
    }
    expect(inverseOperation(op)).toEqual({
      type: 'insert_text',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 2,
      text: 'ab',
    })
  })

  test('set with existing property inverts to set with old value', () => {
    const op: Operation = {
      type: 'set',
      path: [{_key: 'b1'}, 'style'],
      value: 'h1',
      inverse: {type: 'set', path: [{_key: 'b1'}, 'style'], value: 'normal'},
    }
    expect(inverseOperation(op)).toEqual({
      type: 'set',
      path: [{_key: 'b1'}, 'style'],
      value: 'normal',
      inverse: {type: 'set', path: [{_key: 'b1'}, 'style'], value: 'h1'},
    })
  })

  test('set with new property inverts to unset', () => {
    const op: Operation = {
      type: 'set',
      path: [{_key: 'b1'}, 'listItem'],
      value: 'bullet',
      inverse: {type: 'unset', path: [{_key: 'b1'}, 'listItem']},
    }
    expect(inverseOperation(op)).toEqual({
      type: 'unset',
      path: [{_key: 'b1'}, 'listItem'],
      inverse: {
        type: 'set',
        path: [{_key: 'b1'}, 'listItem'],
        value: 'bullet',
      },
    })
  })

  test('unset inverts to set with old value', () => {
    const op: Operation = {
      type: 'unset',
      path: [{_key: 'b1'}, 'listItem'],
      inverse: {
        type: 'set',
        path: [{_key: 'b1'}, 'listItem'],
        value: 'bullet',
      },
    }
    expect(inverseOperation(op)).toEqual({
      type: 'set',
      path: [{_key: 'b1'}, 'listItem'],
      value: 'bullet',
      inverse: {type: 'unset', path: [{_key: 'b1'}, 'listItem']},
    })
  })
})
