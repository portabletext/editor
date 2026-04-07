import {describe, expect, it} from 'vitest'
import type {InsertTextOperation} from '../../slate/interfaces/operation'
import type {Range} from '../../slate/interfaces/range'
import {moveRangeByOperation} from '../move-range-by-operation'

describe('moveRangeByOperation', () => {
  it('should move range when inserting text in front of it', () => {
    const range: Range = {
      anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 1},
      focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 3},
    }
    const operation: InsertTextOperation = {
      type: 'insert_text',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 0,
      text: 'foo',
    }
    const newRange = moveRangeByOperation(range, operation)
    expect(newRange).toEqual({
      anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 4},
      focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 6},
    })
  })
})
