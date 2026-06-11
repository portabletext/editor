import {describe, expect, test} from 'vitest'
import type {EngineOperation} from '../interfaces/operation'
import {inverseOperation} from './inverse-operation'

describe(inverseOperation.name, () => {
  test('insert -> unset', () => {
    const op: EngineOperation = {
      type: 'insert',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      node: {_key: 's2', _type: 'span', text: ''},
      position: 'after' as const,
      inverse: {type: 'unset', path: [{_key: 'b1'}, 'children', {_key: 's2'}]},
    }
    expect(inverseOperation(op)).toEqual({
      type: 'unset',
      path: [{_key: 'b1'}, 'children', {_key: 's2'}],
    })
  })

  test('unset (node removal) -> insert', () => {
    const op: EngineOperation = {
      type: 'unset',
      path: [{_key: 'b1'}, 'children', {_key: 's2'}],
      inverse: {
        type: 'insert',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        node: {_key: 's2', _type: 'span', text: 'hello'},
        position: 'after' as const,
      },
    }
    expect(inverseOperation(op)).toEqual({
      type: 'insert',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      node: {_key: 's2', _type: 'span', text: 'hello'},
      position: 'after' as const,
    })
  })

  test('unset (node removal) first child -> insert before', () => {
    const op: EngineOperation = {
      type: 'unset',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      inverse: {
        type: 'insert',
        path: [{_key: 'b1'}, 'children', 0],
        node: {_key: 's1', _type: 'span', text: ''},
        position: 'before' as const,
      },
    }
    expect(inverseOperation(op)).toEqual({
      type: 'insert',
      path: [{_key: 'b1'}, 'children', 0],
      node: {_key: 's1', _type: 'span', text: ''},
      position: 'before' as const,
    })
  })

  test('insert.text -> remove.text', () => {
    const op: EngineOperation = {
      type: 'insert.text',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'abc',
    }
    expect(inverseOperation(op)).toEqual({
      type: 'remove.text',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
      text: 'abc',
    })
  })

  test('remove.text -> insert.text', () => {
    const op: EngineOperation = {
      type: 'remove.text',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 2,
      text: 'ab',
    }
    expect(inverseOperation(op)).toEqual({
      type: 'insert.text',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 2,
      text: 'ab',
    })
  })

  test('set with existing property inverts to set with old value', () => {
    const op: EngineOperation = {
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
    const op: EngineOperation = {
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

  test('unset (property removal) inverts to set with old value', () => {
    const op: EngineOperation = {
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
