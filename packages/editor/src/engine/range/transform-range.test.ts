import {describe, expect, test} from 'vitest'
import type {Node} from '../interfaces/node'
import type {InsertTextOperation} from '../interfaces/operation'
import type {Range} from '../interfaces/range'
import {transformRange} from './transform-range'

const value: Array<Node> = [
  {
    _type: 'block',
    _key: 'b1',
    children: [{_type: 'span', _key: 's1', text: 'hello'}],
  },
]
const root = {value}

describe(transformRange.name, () => {
  test('returns null when range is null', () => {
    expect(
      transformRange(
        null,
        {
          type: 'insert.text',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 0,
          text: 'x',
        } satisfies InsertTextOperation,
        root,
      ),
    ).toBe(null)
  })

  test('moves both endpoints when inserting text in front of them', () => {
    const range: Range = {
      anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 1},
      focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 3},
    }
    const op: InsertTextOperation = {
      type: 'insert.text',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 0,
      text: 'foo',
    }
    expect(transformRange(range, op, root)).toEqual({
      anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 4},
      focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 6},
    })
  })

  test('returns the same range reference when nothing moves', () => {
    const range: Range = {
      anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 1},
      focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 3},
    }
    const op: InsertTextOperation = {
      type: 'insert.text',
      path: [{_key: 'b1'}, 'children', {_key: 'other'}],
      offset: 0,
      text: 'foo',
    }
    expect(transformRange(range, op, root)).toBe(range)
  })

  test('moves an endpoint to a uniquely duplicated child before its block is unset', () => {
    expect(
      transformRange(
        {
          anchor: {path: [{_key: 'b2'}, 'children', {_key: 's2'}], offset: 1},
          focus: {path: [{_key: 'b2'}, 'children', {_key: 's2'}], offset: 3},
        },
        {type: 'unset', path: [{_key: 'b2'}]},
        {
          value: [
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's1', text: 'foo'},
                {_type: 'span', _key: 's2', text: 'bar'},
              ],
            },
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'bar'}],
            },
          ],
        },
        {relocateUnset: true},
      ),
    ).toEqual({
      anchor: {path: [{_key: 'b1'}, 'children', {_key: 's2'}], offset: 1},
      focus: {path: [{_key: 'b1'}, 'children', {_key: 's2'}], offset: 3},
    })
  })
})
