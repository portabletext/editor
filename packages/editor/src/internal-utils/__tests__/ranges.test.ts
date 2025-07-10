import type {InsertTextOperation, Range} from 'slate'
import {describe, expect, it} from 'vitest'
import {moveRangeByOperation} from '../move-range-by-operation'

describe('moveRangeByOperation', () => {
  it('should move range when inserting text in front of it', () => {
    const range: Range = {
      anchor: {path: [0, 0], offset: 1},
      focus: {path: [0, 0], offset: 3},
    }
    const operation: InsertTextOperation = {
      type: 'insert_text',
      path: [0, 0],
      offset: 0,
      text: 'foo',
    }
    const newRange = moveRangeByOperation(range, operation)
    expect(newRange).toEqual({
      anchor: {path: [0, 0], offset: 4},
      focus: {path: [0, 0], offset: 6},
    })
  })
})
