import type {Node, Operation, Range} from 'slate'
import {describe, expect, it} from 'vitest'
import type {SplitContext} from '../types/slate-editor'
import {
  moveRangeByOperation,
  moveRangeBySplitAwareOperation,
} from './move-range-by-operation'

// Mock node for insert_node/remove_node operations - only path matters for transform
const mockNode = {children: []} as unknown as Node

describe('moveRangeByOperation', () => {
  it('transforms range with insert_text operation', () => {
    const range: Range = {
      anchor: {path: [0, 0], offset: 5},
      focus: {path: [0, 0], offset: 10},
    }
    const operation: Operation = {
      type: 'insert_text',
      path: [0, 0],
      offset: 0,
      text: 'hello ',
    }

    const result = moveRangeByOperation(range, operation)

    expect(result).toEqual({
      anchor: {path: [0, 0], offset: 11}, // 5 + 6
      focus: {path: [0, 0], offset: 16}, // 10 + 6
    })
  })

  it('returns null when anchor is deleted', () => {
    const range: Range = {
      anchor: {path: [0, 0], offset: 5},
      focus: {path: [0, 0], offset: 10},
    }
    const operation: Operation = {
      type: 'remove_node',
      path: [0],
      node: mockNode,
    }

    const result = moveRangeByOperation(range, operation)

    expect(result).toBeNull()
  })
})

describe('moveRangeBySplitAwareOperation', () => {
  // Josef's repro case:
  // Text: "hello dolly this is louis" (25 chars)
  // Decoration: entire line (offset 0 to 25)
  // Split at offset 11 (after "dolly")
  // Expected: anchor stays at block 0 offset 0, focus moves to block 1 offset 14

  const splitContext: SplitContext = {
    splitOffset: 11,
    originalBlockKey: 'block-0',
    newBlockKey: 'block-1',
    originalSpanKey: 'span-0',
    newSpanKey: 'span-1',
  }
  const originalBlockIndex = 0

  describe('without split context', () => {
    it('falls back to normal behavior', () => {
      const range: Range = {
        anchor: {path: [0, 0], offset: 0},
        focus: {path: [0, 0], offset: 25},
      }
      const operation: Operation = {
        type: 'insert_text',
        path: [0, 0],
        offset: 0,
        text: 'hi ',
      }

      const result = moveRangeBySplitAwareOperation(
        range,
        operation,
        null, // no split context
        undefined,
        () => undefined,
      )

      expect(result).toEqual({
        anchor: {path: [0, 0], offset: 3},
        focus: {path: [0, 0], offset: 28},
      })
    })
  })

  describe('during remove_text in split', () => {
    it('returns range UNCHANGED to preserve original offsets', () => {
      const range: Range = {
        anchor: {path: [0, 0], offset: 0},
        focus: {path: [0, 0], offset: 25},
      }
      // remove_text from offset 11 to end (removes " this is louis")
      const operation: Operation = {
        type: 'remove_text',
        path: [0, 0],
        offset: 11,
        text: ' this is louis',
      }

      const result = moveRangeBySplitAwareOperation(
        range,
        operation,
        splitContext,
        originalBlockIndex,
        () => 1,
      )

      // Should be the SAME range object (unchanged)
      expect(result).toBe(range)
      expect(result).toEqual({
        anchor: {path: [0, 0], offset: 0},
        focus: {path: [0, 0], offset: 25}, // NOT clamped to 11!
      })
    })

    it('still transforms if operation is on a different block', () => {
      const range: Range = {
        anchor: {path: [2, 0], offset: 5},
        focus: {path: [2, 0], offset: 10},
      }
      const operation: Operation = {
        type: 'remove_text',
        path: [2, 0],
        offset: 0,
        text: 'hello',
      }

      const result = moveRangeBySplitAwareOperation(
        range,
        operation,
        splitContext,
        originalBlockIndex, // 0, not 2
        () => 1,
      )

      // Normal transformation: offsets shift left by 5
      expect(result).toEqual({
        anchor: {path: [2, 0], offset: 0},
        focus: {path: [2, 0], offset: 5},
      })
    })
  })

  describe('during insert_node in split', () => {
    it('moves focus to new block when focus was after split offset', () => {
      // Range with original offsets preserved from remove_text phase
      const range: Range = {
        anchor: {path: [0, 0], offset: 0},
        focus: {path: [0, 0], offset: 25}, // was preserved, not clamped
      }
      const operation: Operation = {
        type: 'insert_node',
        path: [1], // new block at index 1
        node: mockNode,
      }

      const result = moveRangeBySplitAwareOperation(
        range,
        operation,
        splitContext,
        originalBlockIndex,
        () => 1,
      )

      expect(result).toEqual({
        anchor: {path: [0, 0], offset: 0}, // stays in original block
        focus: {path: [1, 0], offset: 14}, // moves to new block, offset = 25 - 11
      })
    })

    it('keeps anchor in original block when anchor is before split offset', () => {
      const range: Range = {
        anchor: {path: [0, 0], offset: 5}, // before split at 11
        focus: {path: [0, 0], offset: 25},
      }
      const operation: Operation = {
        type: 'insert_node',
        path: [1],
        node: mockNode,
      }

      const result = moveRangeBySplitAwareOperation(
        range,
        operation,
        splitContext,
        originalBlockIndex,
        () => 1,
      )

      expect(result).toEqual({
        anchor: {path: [0, 0], offset: 5}, // stays at original offset
        focus: {path: [1, 0], offset: 14}, // moves to new block
      })
    })

    it('keeps point at exactly split offset in original block', () => {
      const range: Range = {
        anchor: {path: [0, 0], offset: 0},
        focus: {path: [0, 0], offset: 11}, // exactly at split offset
      }
      const operation: Operation = {
        type: 'insert_node',
        path: [1],
        node: mockNode,
      }

      const result = moveRangeBySplitAwareOperation(
        range,
        operation,
        splitContext,
        originalBlockIndex,
        () => 1,
      )

      expect(result).toEqual({
        anchor: {path: [0, 0], offset: 0},
        focus: {path: [0, 0], offset: 11}, // stays in original block
      })
    })

    it('moves both anchor and focus when both are after split offset', () => {
      // Decoration only on " this is louis" part
      const range: Range = {
        anchor: {path: [0, 0], offset: 12}, // after split at 11
        focus: {path: [0, 0], offset: 25},
      }
      const operation: Operation = {
        type: 'insert_node',
        path: [1],
        node: mockNode,
      }

      const result = moveRangeBySplitAwareOperation(
        range,
        operation,
        splitContext,
        originalBlockIndex,
        () => 1,
      )

      expect(result).toEqual({
        anchor: {path: [1, 0], offset: 1}, // 12 - 11 = 1
        focus: {path: [1, 0], offset: 14}, // 25 - 11 = 14
      })
    })

    it('handles decoration entirely before split offset (no move needed)', () => {
      const range: Range = {
        anchor: {path: [0, 0], offset: 0},
        focus: {path: [0, 0], offset: 5}, // "hello" - entirely before split
      }
      const operation: Operation = {
        type: 'insert_node',
        path: [1],
        node: mockNode,
      }

      const result = moveRangeBySplitAwareOperation(
        range,
        operation,
        splitContext,
        originalBlockIndex,
        () => 1,
      )

      expect(result).toEqual({
        anchor: {path: [0, 0], offset: 0},
        focus: {path: [0, 0], offset: 5}, // stays in original block
      })
    })

    it('shifts paths for decorations on blocks after the insertion point', () => {
      // Decoration on block 2 (which will become block 3 after insert)
      const range: Range = {
        anchor: {path: [2, 0], offset: 0},
        focus: {path: [2, 0], offset: 10},
      }
      const operation: Operation = {
        type: 'insert_node',
        path: [1], // inserting at index 1
        node: mockNode,
      }

      const result = moveRangeBySplitAwareOperation(
        range,
        operation,
        splitContext,
        originalBlockIndex, // 0
        () => 1,
      )

      expect(result).toEqual({
        anchor: {path: [3, 0], offset: 0}, // shifted from 2 to 3
        focus: {path: [3, 0], offset: 10},
      })
    })
  })

  describe('full split sequence (Josef repro)', () => {
    it('correctly handles decoration spanning entire line after split', () => {
      // Initial state: "hello dolly this is louis" with decoration 0-25
      let range: Range = {
        anchor: {path: [0, 0], offset: 0},
        focus: {path: [0, 0], offset: 25},
      }

      // Step 1: remove_text (deletes " this is louis")
      const removeOp: Operation = {
        type: 'remove_text',
        path: [0, 0],
        offset: 11,
        text: ' this is louis',
      }

      range =
        moveRangeBySplitAwareOperation(
          range,
          removeOp,
          splitContext,
          originalBlockIndex,
          () => 1,
        ) ?? range

      // After remove_text: range should be UNCHANGED
      expect(range).toEqual({
        anchor: {path: [0, 0], offset: 0},
        focus: {path: [0, 0], offset: 25}, // preserved!
      })

      // Step 2: insert_node (inserts new block with " this is louis")
      const insertOp: Operation = {
        type: 'insert_node',
        path: [1],
        node: mockNode,
      }

      range =
        moveRangeBySplitAwareOperation(
          range,
          insertOp,
          splitContext,
          originalBlockIndex,
          () => 1,
        ) ?? range

      // After insert_node: focus should move to new block
      expect(range).toEqual({
        anchor: {path: [0, 0], offset: 0}, // start of "hello dolly"
        focus: {path: [1, 0], offset: 14}, // end of " this is louis"
      })
    })
  })
})
