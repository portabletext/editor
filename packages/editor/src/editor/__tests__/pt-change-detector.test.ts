import type {PortableTextBlock} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {detectChange} from '../pt-change-detector'

// ---------------------------------------------------------------------------
// Test helpers — create PT blocks with minimal boilerplate
// ---------------------------------------------------------------------------

function createTextBlock(
  key: string,
  text: string,
  options?: {style?: string; listItem?: string; level?: number},
): PortableTextBlock {
  return {
    _key: key,
    _type: 'block',
    children: [
      {
        _key: `${key}-span`,
        _type: 'span' as const,
        text,
        marks: [],
      },
    ],
    style: options?.style ?? 'normal',
    ...(options?.listItem ? {listItem: options.listItem} : {}),
    ...(options?.level !== undefined ? {level: options.level} : {}),
  }
}

function createMultiSpanTextBlock(
  key: string,
  spans: Array<{key: string; text: string; marks?: string[]}>,
): PortableTextBlock {
  return {
    _key: key,
    _type: 'block',
    children: spans.map((span) => ({
      _key: span.key,
      _type: 'span' as const,
      text: span.text,
      marks: span.marks ?? [],
    })),
    style: 'normal',
  }
}

function createObjectBlock(key: string, type: string): PortableTextBlock {
  return {
    _key: key,
    _type: type,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('detectChange', () => {
  // -----------------------------------------------------------------------
  // No change
  // -----------------------------------------------------------------------

  describe('no-change', () => {
    test('returns no-change for identical block arrays (same reference)', () => {
      const blocks = [createTextBlock('block1', 'Hello')]
      expect(detectChange(blocks, blocks)).toEqual({type: 'no-change'})
    })

    test('returns no-change for two empty arrays', () => {
      expect(detectChange([], [])).toEqual({type: 'no-change'})
    })

    test('returns no-change when text content is identical', () => {
      const oldBlocks = [createTextBlock('block1', 'Hello world')]
      const newBlocks = [createTextBlock('block1', 'Hello world')]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'no-change',
      })
    })

    test('returns no-change for multiple identical blocks', () => {
      const oldBlocks = [
        createTextBlock('block1', 'First'),
        createTextBlock('block2', 'Second'),
        createTextBlock('block3', 'Third'),
      ]
      const newBlocks = [
        createTextBlock('block1', 'First'),
        createTextBlock('block2', 'Second'),
        createTextBlock('block3', 'Third'),
      ]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'no-change',
      })
    })
  })

  // -----------------------------------------------------------------------
  // Text insertion
  // -----------------------------------------------------------------------

  describe('text-insert', () => {
    test('detects single character insertion at end', () => {
      const oldBlocks = [createTextBlock('block1', 'Hello')]
      const newBlocks = [createTextBlock('block1', 'Hello!')]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'text-insert',
        blockKey: 'block1',
        spanKey: 'block1-span',
        offset: 5,
        text: '!',
      })
    })

    test('detects single character insertion at beginning', () => {
      const oldBlocks = [createTextBlock('block1', 'ello')]
      const newBlocks = [createTextBlock('block1', 'Hello')]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'text-insert',
        blockKey: 'block1',
        spanKey: 'block1-span',
        offset: 0,
        text: 'H',
      })
    })

    test('detects multi-character insertion in middle', () => {
      const oldBlocks = [createTextBlock('block1', 'Helo')]
      const newBlocks = [createTextBlock('block1', 'Hello')]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'text-insert',
        blockKey: 'block1',
        spanKey: 'block1-span',
        offset: 3,
        text: 'l',
      })
    })

    test('detects word insertion', () => {
      const oldBlocks = [createTextBlock('block1', 'Hello world')]
      const newBlocks = [createTextBlock('block1', 'Hello beautiful world')]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'text-insert',
        blockKey: 'block1',
        spanKey: 'block1-span',
        offset: 6,
        text: 'beautiful ',
      })
    })

    test('detects insertion into empty block', () => {
      const oldBlocks = [createTextBlock('block1', '')]
      const newBlocks = [createTextBlock('block1', 'Hello')]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'text-insert',
        blockKey: 'block1',
        spanKey: 'block1-span',
        offset: 0,
        text: 'Hello',
      })
    })
  })

  // -----------------------------------------------------------------------
  // Text deletion
  // -----------------------------------------------------------------------

  describe('text-delete', () => {
    test('detects single character deletion at end', () => {
      const oldBlocks = [createTextBlock('block1', 'Hello!')]
      const newBlocks = [createTextBlock('block1', 'Hello')]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'text-delete',
        blockKey: 'block1',
        spanKey: 'block1-span',
        from: 5,
        to: 6,
      })
    })

    test('detects single character deletion at beginning', () => {
      const oldBlocks = [createTextBlock('block1', 'Hello')]
      const newBlocks = [createTextBlock('block1', 'ello')]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'text-delete',
        blockKey: 'block1',
        spanKey: 'block1-span',
        from: 0,
        to: 1,
      })
    })

    test('detects multi-character deletion in middle', () => {
      const oldBlocks = [createTextBlock('block1', 'Hello world')]
      const newBlocks = [createTextBlock('block1', 'Held')]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'text-delete',
        blockKey: 'block1',
        spanKey: 'block1-span',
        from: 3,
        to: 10,
      })
    })

    test('detects deletion to empty', () => {
      const oldBlocks = [createTextBlock('block1', 'Hello')]
      const newBlocks = [createTextBlock('block1', '')]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'text-delete',
        blockKey: 'block1',
        spanKey: 'block1-span',
        from: 0,
        to: 5,
      })
    })

    test('detects word deletion', () => {
      const oldBlocks = [createTextBlock('block1', 'Hello beautiful world')]
      const newBlocks = [createTextBlock('block1', 'Hello world')]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'text-delete',
        blockKey: 'block1',
        spanKey: 'block1-span',
        from: 6,
        to: 16,
      })
    })
  })

  // -----------------------------------------------------------------------
  // Text replacement
  // -----------------------------------------------------------------------

  describe('text-replace', () => {
    test('detects single character replacement', () => {
      const oldBlocks = [createTextBlock('block1', 'Hello')]
      const newBlocks = [createTextBlock('block1', 'Hallo')]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'text-replace',
        blockKey: 'block1',
        spanKey: 'block1-span',
        from: 1,
        to: 2,
        text: 'a',
      })
    })

    test('detects word replacement via autocorrect (minimal diff)', () => {
      // "teh" → "the": the diff algorithm finds the minimal change.
      // Forward scan: 't' matches → diffStart = 1
      // Backward scan: both end with " quick" → oldEnd = 3, newEnd = 3
      // So the minimal diff is replacing "eh" with "he" at positions 1-3.
      const oldBlocks = [createTextBlock('block1', 'teh quick')]
      const newBlocks = [createTextBlock('block1', 'the quick')]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'text-replace',
        blockKey: 'block1',
        spanKey: 'block1-span',
        from: 1,
        to: 3,
        text: 'he',
      })
    })

    test('detects full word replacement with different length', () => {
      const oldBlocks = [createTextBlock('block1', 'Hello world')]
      const newBlocks = [createTextBlock('block1', 'Hello universe')]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'text-replace',
        blockKey: 'block1',
        spanKey: 'block1-span',
        from: 6,
        to: 11,
        text: 'universe',
      })
    })

    test('detects IME composition replacement', () => {
      // Simulates Japanese IME: composing "か" then confirming "書"
      const oldBlocks = [createTextBlock('block1', 'テストか')]
      const newBlocks = [createTextBlock('block1', 'テスト書')]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'text-replace',
        blockKey: 'block1',
        spanKey: 'block1-span',
        from: 3,
        to: 4,
        text: '書',
      })
    })

    test('detects complete word swap', () => {
      // When the entire content changes, from and to span the whole string
      const oldBlocks = [createTextBlock('block1', 'cat')]
      const newBlocks = [createTextBlock('block1', 'dog')]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'text-replace',
        blockKey: 'block1',
        spanKey: 'block1-span',
        from: 0,
        to: 3,
        text: 'dog',
      })
    })
  })

  // -----------------------------------------------------------------------
  // Block split (Enter key)
  // -----------------------------------------------------------------------

  describe('block-split', () => {
    test('detects split in the middle of text', () => {
      const oldBlocks = [createTextBlock('block1', 'Hello world')]
      const newBlocks = [
        createTextBlock('block1', 'Hello '),
        createTextBlock('block2', 'world'),
      ]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'block-split',
        originalBlockKey: 'block1',
        newBlockKey: 'block2',
        splitOffset: 6,
      })
    })

    test('detects split at the beginning of text', () => {
      const oldBlocks = [createTextBlock('block1', 'Hello')]
      const newBlocks = [
        createTextBlock('block1', ''),
        createTextBlock('block2', 'Hello'),
      ]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'block-split',
        originalBlockKey: 'block1',
        newBlockKey: 'block2',
        splitOffset: 0,
      })
    })

    test('detects split at the end of text', () => {
      const oldBlocks = [createTextBlock('block1', 'Hello')]
      const newBlocks = [
        createTextBlock('block1', 'Hello'),
        createTextBlock('block2', ''),
      ]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'block-split',
        originalBlockKey: 'block1',
        newBlockKey: 'block2',
        splitOffset: 5,
      })
    })

    test('detects split with multiple existing blocks', () => {
      const oldBlocks = [
        createTextBlock('block1', 'First'),
        createTextBlock('block2', 'Hello world'),
        createTextBlock('block3', 'Third'),
      ]
      const newBlocks = [
        createTextBlock('block1', 'First'),
        createTextBlock('block2', 'Hello '),
        createTextBlock('block4', 'world'),
        createTextBlock('block3', 'Third'),
      ]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'block-split',
        originalBlockKey: 'block2',
        newBlockKey: 'block4',
        splitOffset: 6,
      })
    })

    test('detects split of empty block (Enter on empty line)', () => {
      const oldBlocks = [createTextBlock('block1', '')]
      const newBlocks = [
        createTextBlock('block1', ''),
        createTextBlock('block2', ''),
      ]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'block-split',
        originalBlockKey: 'block1',
        newBlockKey: 'block2',
        splitOffset: 0,
      })
    })
  })

  // -----------------------------------------------------------------------
  // Block merge (Backspace at block boundary)
  // -----------------------------------------------------------------------

  describe('block-merge', () => {
    test('detects merge of two text blocks (Backspace)', () => {
      const oldBlocks = [
        createTextBlock('block1', 'Hello '),
        createTextBlock('block2', 'world'),
      ]
      const newBlocks = [createTextBlock('block1', 'Hello world')]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'block-merge',
        survivingBlockKey: 'block1',
        removedBlockKey: 'block2',
        joinOffset: 6,
      })
    })

    test('detects merge when second block is empty', () => {
      const oldBlocks = [
        createTextBlock('block1', 'Hello'),
        createTextBlock('block2', ''),
      ]
      const newBlocks = [createTextBlock('block1', 'Hello')]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'block-merge',
        survivingBlockKey: 'block1',
        removedBlockKey: 'block2',
        joinOffset: 5,
      })
    })

    test('detects merge when first block is empty', () => {
      const oldBlocks = [
        createTextBlock('block1', ''),
        createTextBlock('block2', 'Hello'),
      ]
      const newBlocks = [createTextBlock('block2', 'Hello')]
      // block1 is removed, block2 survives. The removed block's text ("")
      // was prepended, so joinOffset is 0.
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'block-merge',
        survivingBlockKey: 'block2',
        removedBlockKey: 'block1',
        joinOffset: 0,
      })
    })

    test('detects merge with multiple blocks present', () => {
      const oldBlocks = [
        createTextBlock('block1', 'First'),
        createTextBlock('block2', 'Hello '),
        createTextBlock('block3', 'world'),
        createTextBlock('block4', 'Last'),
      ]
      const newBlocks = [
        createTextBlock('block1', 'First'),
        createTextBlock('block2', 'Hello world'),
        createTextBlock('block4', 'Last'),
      ]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'block-merge',
        survivingBlockKey: 'block2',
        removedBlockKey: 'block3',
        joinOffset: 6,
      })
    })
  })

  // -----------------------------------------------------------------------
  // Block insertion (non-split — e.g., inserting a block object)
  // -----------------------------------------------------------------------

  describe('block-insert', () => {
    test('detects block object insertion after text block', () => {
      const oldBlocks = [createTextBlock('block1', 'Hello')]
      const newBlocks = [
        createTextBlock('block1', 'Hello'),
        createObjectBlock('block2', 'image'),
      ]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'block-insert',
        blockKey: 'block2',
        index: 1,
      })
    })

    test('detects block insertion at beginning', () => {
      const oldBlocks = [createTextBlock('block1', 'Hello')]
      const newBlocks = [
        createObjectBlock('block2', 'image'),
        createTextBlock('block1', 'Hello'),
      ]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'block-insert',
        blockKey: 'block2',
        index: 0,
      })
    })

    test('detects text block insertion that does not match split pattern', () => {
      // A new text block is inserted but its text doesn't match the
      // suffix of the preceding block — not a split
      const oldBlocks = [createTextBlock('block1', 'Hello')]
      const newBlocks = [
        createTextBlock('block1', 'Hello'),
        createTextBlock('block2', 'Something completely different'),
      ]
      // This matches the split pattern: "Hello" === "Hello" + ""? No,
      // "Hello" !== "Hello" + "Something completely different"
      // So it falls through to block-insert
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'block-insert',
        blockKey: 'block2',
        index: 1,
      })
    })
  })

  // -----------------------------------------------------------------------
  // Block deletion (non-merge — e.g., deleting a block object)
  // -----------------------------------------------------------------------

  describe('block-delete', () => {
    test('detects block object deletion', () => {
      const oldBlocks = [
        createTextBlock('block1', 'Hello'),
        createObjectBlock('block2', 'image'),
      ]
      const newBlocks = [createTextBlock('block1', 'Hello')]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'block-delete',
        blockKey: 'block2',
        index: 1,
      })
    })

    test('detects block object deletion at beginning', () => {
      const oldBlocks = [
        createObjectBlock('block1', 'image'),
        createTextBlock('block2', 'Hello'),
      ]
      const newBlocks = [createTextBlock('block2', 'Hello')]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'block-delete',
        blockKey: 'block1',
        index: 0,
      })
    })
  })

  // -----------------------------------------------------------------------
  // Multi-span blocks
  // -----------------------------------------------------------------------

  describe('multi-span blocks', () => {
    test('detects text insertion across spans', () => {
      const oldBlocks = [
        createMultiSpanTextBlock('block1', [
          {key: 'span1', text: 'Hello '},
          {key: 'span2', text: 'world', marks: ['strong']},
        ]),
      ]
      const newBlocks = [
        createMultiSpanTextBlock('block1', [
          {key: 'span1', text: 'Hello beautiful '},
          {key: 'span2', text: 'world', marks: ['strong']},
        ]),
      ]
      // The flattened text goes from "Hello world" to "Hello beautiful world"
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'text-insert',
        blockKey: 'block1',
        spanKey: 'span1',
        offset: 6,
        text: 'beautiful ',
      })
    })

    test('detects text deletion across spans', () => {
      const oldBlocks = [
        createMultiSpanTextBlock('block1', [
          {key: 'span1', text: 'Hello '},
          {key: 'span2', text: 'beautiful '},
          {key: 'span3', text: 'world'},
        ]),
      ]
      const newBlocks = [
        createMultiSpanTextBlock('block1', [
          {key: 'span1', text: 'Hello '},
          {key: 'span3', text: 'world'},
        ]),
      ]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'text-delete',
        blockKey: 'block1',
        spanKey: 'span2',
        from: 6,
        to: 16,
      })
    })
  })

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  describe('edge cases', () => {
    test('handles block objects (no children) without crashing', () => {
      const oldBlocks = [createObjectBlock('block1', 'image')]
      const newBlocks = [createObjectBlock('block1', 'image')]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'no-change',
      })
    })

    test('handles mixed text and object blocks', () => {
      const oldBlocks = [
        createTextBlock('block1', 'Hello'),
        createObjectBlock('block2', 'image'),
        createTextBlock('block3', 'World'),
      ]
      const newBlocks = [
        createTextBlock('block1', 'Hello!'),
        createObjectBlock('block2', 'image'),
        createTextBlock('block3', 'World'),
      ]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'text-insert',
        blockKey: 'block1',
        spanKey: 'block1-span',
        offset: 5,
        text: '!',
      })
    })

    test('handles Unicode text correctly', () => {
      const oldBlocks = [createTextBlock('block1', '日本語テスト')]
      const newBlocks = [createTextBlock('block1', '日本語のテスト')]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'text-insert',
        blockKey: 'block1',
        spanKey: 'block1-span',
        offset: 3,
        text: 'の',
      })
    })

    test('handles emoji correctly', () => {
      const oldBlocks = [createTextBlock('block1', 'Hello 🌍')]
      const newBlocks = [createTextBlock('block1', 'Hello 🌍!')]
      expect(detectChange(oldBlocks, newBlocks)).toEqual({
        type: 'text-insert',
        blockKey: 'block1',
        spanKey: 'block1-span',
        offset: 8,
        text: '!',
      })
    })
  })
})
