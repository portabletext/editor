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

  test('set_node inverts properties', () => {
    const op: Operation = {
      type: 'set_node',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      properties: {_key: 's1'},
      newProperties: {_key: 's2'},
    }
    expect(inverseOperation(op)).toEqual({
      type: 'set_node',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      properties: {_key: 's2'},
      newProperties: {_key: 's1'},
    })
  })
})
