import type {
  PortableTextBlock,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {DIFF_DELETE, DIFF_INSERT, makeDiff} from '@sanity/diff-match-patch'

// ---------------------------------------------------------------------------
// Change types — discriminated union describing what changed between two
// PT block arrays.
// ---------------------------------------------------------------------------

export interface TextInsertChange {
  type: 'text-insert'
  blockKey: string
  spanKey: string
  offset: number
  text: string
}

export interface TextDeleteChange {
  type: 'text-delete'
  blockKey: string
  spanKey: string
  from: number
  to: number
}

export interface TextReplaceChange {
  type: 'text-replace'
  blockKey: string
  spanKey: string
  from: number
  to: number
  text: string
}

export interface BlockSplitChange {
  type: 'block-split'
  originalBlockKey: string
  newBlockKey: string
  splitOffset: number
}

export interface BlockMergeChange {
  type: 'block-merge'
  survivingBlockKey: string
  removedBlockKey: string
  joinOffset: number
}

export interface BlockInsertChange {
  type: 'block-insert'
  blockKey: string
  index: number
}

export interface BlockDeleteChange {
  type: 'block-delete'
  blockKey: string
  index: number
}

export interface NoChange {
  type: 'no-change'
}

export type PTChange =
  | TextInsertChange
  | TextDeleteChange
  | TextReplaceChange
  | BlockSplitChange
  | BlockMergeChange
  | BlockInsertChange
  | BlockDeleteChange
  | NoChange

// ---------------------------------------------------------------------------
// Type guards — these work without a schema context, using structural checks
// on the PT data.
// ---------------------------------------------------------------------------

function hasChildren(block: PortableTextBlock): block is PortableTextTextBlock {
  return 'children' in block && Array.isArray(block.children)
}

function isPortableTextSpan(child: unknown): child is PortableTextSpan {
  if (typeof child !== 'object' || child === null) {
    return false
  }
  return (
    '_type' in child &&
    child._type === 'span' &&
    'text' in child &&
    typeof child.text === 'string'
  )
}

// ---------------------------------------------------------------------------
// Text extraction — flattens a text block's span children into a single
// string for character-level diffing.
// ---------------------------------------------------------------------------

function getBlockText(block: PortableTextBlock): string {
  if (!hasChildren(block)) {
    return ''
  }
  return block.children
    .filter(isPortableTextSpan)
    .map((span) => span.text)
    .join('')
}

// ---------------------------------------------------------------------------
// Character-level diff — finds the range where two strings differ.
//
// Uses @sanity/diff-match-patch to compute the diff, then walks the diff
// tuples to determine the overall changed region as a single contiguous
// range (matching the behavior of ProseMirror's findDiffStart/findDiffEnd).
//
// Returns null if the strings are identical, otherwise returns:
//   - diffStart: index of first differing character (in both old and new)
//   - oldEnd: end index in the old string (exclusive)
//   - newEnd: end index in the new string (exclusive)
// ---------------------------------------------------------------------------

interface TextDiffRange {
  diffStart: number
  oldEnd: number
  newEnd: number
}

function findTextDiff(oldText: string, newText: string): TextDiffRange | null {
  if (oldText === newText) {
    return null
  }

  const diffs = makeDiff(oldText, newText)

  // Walk the diff tuples to find the bounding range of all changes.
  // We track the position in both old and new strings, and record the
  // first position where a change occurs and the last position where
  // a change ends. Equal text between changes is implicitly included
  // because the offsets advance through it.
  let oldOffset = 0
  let newOffset = 0
  let firstChangeOldOffset: number | undefined
  let maxOldEnd = 0
  let maxNewEnd = 0

  for (const [operation, text] of diffs) {
    if (operation === DIFF_DELETE) {
      if (firstChangeOldOffset === undefined) {
        firstChangeOldOffset = oldOffset
      }
      maxOldEnd = oldOffset + text.length
      maxNewEnd = Math.max(maxNewEnd, newOffset)
      oldOffset += text.length
    } else if (operation === DIFF_INSERT) {
      if (firstChangeOldOffset === undefined) {
        firstChangeOldOffset = oldOffset
      }
      maxOldEnd = Math.max(maxOldEnd, oldOffset)
      maxNewEnd = newOffset + text.length
      newOffset += text.length
    } else {
      // DIFF_EQUAL — advance both offsets without extending the range
      oldOffset += text.length
      newOffset += text.length
    }
  }

  if (firstChangeOldOffset === undefined) {
    return null
  }

  return {
    diffStart: firstChangeOldOffset,
    oldEnd: maxOldEnd,
    newEnd: maxNewEnd,
  }
}

// ---------------------------------------------------------------------------
// Block alignment — matches blocks between old and new arrays by _key.
// ---------------------------------------------------------------------------

interface BlockAlignment {
  oldKeySet: Set<string>
  newKeySet: Set<string>
  insertedKeys: string[]
  deletedKeys: string[]
  matchedKeys: string[]
  oldBlocksByKey: Map<string, PortableTextBlock>
  newBlocksByKey: Map<string, PortableTextBlock>
  newBlockIndexByKey: Map<string, number>
  oldBlockIndexByKey: Map<string, number>
}

function alignBlocks(
  oldBlocks: PortableTextBlock[],
  newBlocks: PortableTextBlock[],
): BlockAlignment {
  const oldKeySet = new Set<string>()
  const newKeySet = new Set<string>()
  const oldBlocksByKey = new Map<string, PortableTextBlock>()
  const newBlocksByKey = new Map<string, PortableTextBlock>()
  const newBlockIndexByKey = new Map<string, number>()
  const oldBlockIndexByKey = new Map<string, number>()

  for (let blockIndex = 0; blockIndex < oldBlocks.length; blockIndex++) {
    const block = oldBlocks[blockIndex]
    if (!block) {
      continue
    }
    oldKeySet.add(block._key)
    oldBlocksByKey.set(block._key, block)
    oldBlockIndexByKey.set(block._key, blockIndex)
  }

  for (let blockIndex = 0; blockIndex < newBlocks.length; blockIndex++) {
    const block = newBlocks[blockIndex]
    if (!block) {
      continue
    }
    newKeySet.add(block._key)
    newBlocksByKey.set(block._key, block)
    newBlockIndexByKey.set(block._key, blockIndex)
  }

  const insertedKeys: string[] = []
  const deletedKeys: string[] = []
  const matchedKeys: string[] = []

  for (const key of newKeySet) {
    if (!oldKeySet.has(key)) {
      insertedKeys.push(key)
    }
  }

  for (const key of oldKeySet) {
    if (!newKeySet.has(key)) {
      deletedKeys.push(key)
    }
  }

  for (const key of oldKeySet) {
    if (newKeySet.has(key)) {
      matchedKeys.push(key)
    }
  }

  return {
    oldKeySet,
    newKeySet,
    insertedKeys,
    deletedKeys,
    matchedKeys,
    oldBlocksByKey,
    newBlocksByKey,
    newBlockIndexByKey,
    oldBlockIndexByKey,
  }
}

// ---------------------------------------------------------------------------
// Span key lookup — finds the span key at a given character offset within
// a block's concatenated text.
// ---------------------------------------------------------------------------

/**
 * Find the `_key` of the span that contains the given character offset
 * in the block's concatenated text.
 *
 * When the offset falls exactly on a span boundary, the span starting at
 * that offset is returned (i.e., the next span). When the offset is at
 * the very end of the text, the last span is returned.
 *
 * Falls back to the first span's key if the offset can't be resolved.
 */
function findSpanKeyAtOffset(block: PortableTextBlock, offset: number): string {
  if (!hasChildren(block)) {
    return ''
  }

  const spans = block.children.filter(isPortableTextSpan)
  if (spans.length === 0) {
    return ''
  }

  let runningOffset = 0
  for (const span of spans) {
    const spanEnd = runningOffset + span.text.length
    if (offset < spanEnd) {
      return span._key
    }
    runningOffset = spanEnd
  }

  // Offset is at or past the end — return the last span's key
  const lastSpan = spans[spans.length - 1]
  return lastSpan ? lastSpan._key : ''
}

// ---------------------------------------------------------------------------
// Detect text change within a single matched block.
// ---------------------------------------------------------------------------

function detectTextChange(
  blockKey: string,
  oldBlock: PortableTextBlock,
  newBlock: PortableTextBlock,
): PTChange | null {
  const oldText = getBlockText(oldBlock)
  const newText = getBlockText(newBlock)

  const diff = findTextDiff(oldText, newText)
  if (!diff) {
    return null
  }

  const deletedLength = diff.oldEnd - diff.diffStart
  const insertedText = newText.slice(diff.diffStart, diff.newEnd)

  if (deletedLength === 0 && insertedText.length > 0) {
    // Pure insertion — no characters were removed
    // Resolve span key from the new block (where the text was inserted)
    return {
      type: 'text-insert',
      blockKey,
      spanKey: findSpanKeyAtOffset(newBlock, diff.diffStart),
      offset: diff.diffStart,
      text: insertedText,
    }
  }

  if (deletedLength > 0 && insertedText.length === 0) {
    // Pure deletion — no characters were added
    // Resolve span key from the old block (where the text was deleted from)
    return {
      type: 'text-delete',
      blockKey,
      spanKey: findSpanKeyAtOffset(oldBlock, diff.diffStart),
      from: diff.diffStart,
      to: diff.oldEnd,
    }
  }

  // Both deletion and insertion — a replacement (e.g., autocorrect, IME)
  // Resolve span key from the old block at the start of the replaced range
  return {
    type: 'text-replace',
    blockKey,
    spanKey: findSpanKeyAtOffset(oldBlock, diff.diffStart),
    from: diff.diffStart,
    to: diff.oldEnd,
    text: insertedText,
  }
}

// ---------------------------------------------------------------------------
// Block split detection
//
// Pattern: one block in old becomes two blocks in new.
// The original block's key is preserved, and a new block appears with a new
// key. The original block's text is truncated at the split point, and the
// new block contains the remainder.
//
// Example:
//   old: [{ _key: 'a', text: 'Hello world' }]
//   new: [{ _key: 'a', text: 'Hello ' }, { _key: 'b', text: 'world' }]
// ---------------------------------------------------------------------------

function detectBlockSplit(
  alignment: BlockAlignment,
  _oldBlocks: PortableTextBlock[],
  newBlocks: PortableTextBlock[],
): BlockSplitChange | null {
  const {insertedKeys, deletedKeys} = alignment

  // A split produces exactly one new block and no deleted blocks
  if (insertedKeys.length !== 1 || deletedKeys.length !== 0) {
    return null
  }

  const insertedKey = insertedKeys[0]
  if (!insertedKey) {
    return null
  }
  const insertedBlock = alignment.newBlocksByKey.get(insertedKey)
  if (!insertedBlock) {
    return null
  }

  // A split produces a text block — if the inserted block is not a text
  // block (e.g., it's a block object like an image), this is a plain
  // block insertion, not a split.
  if (!hasChildren(insertedBlock)) {
    return null
  }

  const insertedIndex = alignment.newBlockIndexByKey.get(insertedKey)
  if (insertedIndex === undefined || insertedIndex === 0) {
    // The inserted block must come after an existing block
    return null
  }

  // The block immediately before the inserted block in the new array
  // should be the original block that was split
  const precedingBlock = newBlocks[insertedIndex - 1]
  if (!precedingBlock) {
    return null
  }

  const originalKey = precedingBlock._key
  const oldOriginalBlock = alignment.oldBlocksByKey.get(originalKey)
  if (!oldOriginalBlock) {
    return null
  }

  // Verify the split: old text should equal new text of original + new text of inserted
  const oldText = getBlockText(oldOriginalBlock)
  const newOriginalText = getBlockText(precedingBlock)
  const insertedText = getBlockText(insertedBlock)

  if (oldText === newOriginalText + insertedText) {
    return {
      type: 'block-split',
      originalBlockKey: originalKey,
      newBlockKey: insertedKey,
      splitOffset: newOriginalText.length,
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Block merge detection
//
// Pattern: two blocks in old become one block in new.
// One block is deleted, and the surviving block's text is the concatenation
// of both old blocks' text.
//
// Example:
//   old: [{ _key: 'a', text: 'Hello ' }, { _key: 'b', text: 'world' }]
//   new: [{ _key: 'a', text: 'Hello world' }]
// ---------------------------------------------------------------------------

function detectBlockMerge(
  alignment: BlockAlignment,
  oldBlocks: PortableTextBlock[],
): BlockMergeChange | null {
  const {insertedKeys, deletedKeys} = alignment

  // A merge removes exactly one block and inserts none
  if (deletedKeys.length !== 1 || insertedKeys.length !== 0) {
    return null
  }

  const removedKey = deletedKeys[0]
  if (!removedKey) {
    return null
  }
  const removedBlock = alignment.oldBlocksByKey.get(removedKey)
  if (!removedBlock) {
    return null
  }

  // A merge combines two text blocks. If the removed block is not a text
  // block (e.g., it's a block object like an image), this is a plain
  // block deletion, not a merge.
  if (!hasChildren(removedBlock)) {
    return null
  }

  const removedOldIndex = alignment.oldBlockIndexByKey.get(removedKey)
  if (removedOldIndex === undefined) {
    return null
  }

  const removedText = getBlockText(removedBlock)

  // Check if the block before the removed block absorbed its content
  // (forward merge — Backspace at start of second block)
  if (removedOldIndex > 0) {
    const precedingBlock = oldBlocks[removedOldIndex - 1]
    if (!precedingBlock) {
      return null
    }
    const precedingKey = precedingBlock._key
    const newPrecedingBlock = alignment.newBlocksByKey.get(precedingKey)

    if (newPrecedingBlock) {
      const oldPrecedingText = getBlockText(precedingBlock)
      const newPrecedingText = getBlockText(newPrecedingBlock)

      if (newPrecedingText === oldPrecedingText + removedText) {
        return {
          type: 'block-merge',
          survivingBlockKey: precedingKey,
          removedBlockKey: removedKey,
          joinOffset: oldPrecedingText.length,
        }
      }
    }
  }

  // Check if the block after the removed block absorbed its content
  // (forward delete — Delete at end of first block)
  if (removedOldIndex < oldBlocks.length - 1) {
    const followingBlock = oldBlocks[removedOldIndex + 1]
    if (!followingBlock) {
      return null
    }
    const followingKey = followingBlock._key
    const newFollowingBlock = alignment.newBlocksByKey.get(followingKey)

    if (newFollowingBlock) {
      const oldFollowingText = getBlockText(followingBlock)
      const newFollowingText = getBlockText(newFollowingBlock)

      if (newFollowingText === removedText + oldFollowingText) {
        return {
          type: 'block-merge',
          survivingBlockKey: followingKey,
          removedBlockKey: removedKey,
          joinOffset: removedText.length,
        }
      }
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Compare two PT block arrays and detect what changed.
 * Used by the hybrid input architecture to infer user intent
 * from parsed PT snapshots.
 *
 * The algorithm:
 * 1. Align blocks by `_key` to find insertions, deletions, and matches
 * 2. Check for structural changes (split, merge) first
 * 3. Fall back to text-level diffing for matched blocks
 * 4. Handle pure block insertions/deletions as a last resort
 *
 * @param oldBlocks - The PT blocks before the change
 * @param newBlocks - The PT blocks after the change
 * @param cursorOffset - Optional cursor position hint (used to disambiguate
 *   when multiple blocks changed)
 * @returns A discriminated union describing the detected change
 */
export function detectChange(
  oldBlocks: PortableTextBlock[],
  newBlocks: PortableTextBlock[],
  cursorOffset?: number,
): PTChange {
  // Fast path: identical arrays (by reference or both empty)
  if (oldBlocks === newBlocks) {
    return {type: 'no-change'}
  }

  if (oldBlocks.length === 0 && newBlocks.length === 0) {
    return {type: 'no-change'}
  }

  const alignment = alignBlocks(oldBlocks, newBlocks)

  // -----------------------------------------------------------------------
  // Step 1: Check for block-level structural changes (split / merge)
  // These take priority because they involve both block count changes AND
  // text content changes — we want to report the structural intent, not
  // just the text diff.
  // -----------------------------------------------------------------------

  // Block split: one new block appeared, no blocks deleted
  const splitChange = detectBlockSplit(alignment, oldBlocks, newBlocks)
  if (splitChange) {
    return splitChange
  }

  // Block merge: one block deleted, no new blocks
  const mergeChange = detectBlockMerge(alignment, oldBlocks)
  if (mergeChange) {
    return mergeChange
  }

  // -----------------------------------------------------------------------
  // Step 2: Pure block insertions (no blocks deleted, no text changes in
  // existing blocks — e.g., pasting a block object)
  // -----------------------------------------------------------------------

  if (alignment.insertedKeys.length > 0 && alignment.deletedKeys.length === 0) {
    // If we couldn't detect a split, report as a plain block insertion.
    // Use the first inserted key (most common case is a single insertion).
    const firstInsertedKey = alignment.insertedKeys[0]
    if (firstInsertedKey === undefined) {
      return {type: 'no-change'}
    }
    const insertIndex = alignment.newBlockIndexByKey.get(firstInsertedKey)

    if (insertIndex !== undefined) {
      return {
        type: 'block-insert',
        blockKey: firstInsertedKey,
        index: insertIndex,
      }
    }
  }

  // -----------------------------------------------------------------------
  // Step 3: Pure block deletions (no blocks inserted, no text changes —
  // e.g., selecting and deleting a block object)
  // -----------------------------------------------------------------------

  if (alignment.deletedKeys.length > 0 && alignment.insertedKeys.length === 0) {
    // If we couldn't detect a merge, report as a plain block deletion.
    const firstDeletedKey = alignment.deletedKeys[0]
    if (firstDeletedKey === undefined) {
      return {type: 'no-change'}
    }
    const deleteIndex = alignment.oldBlockIndexByKey.get(firstDeletedKey)

    if (deleteIndex !== undefined) {
      return {
        type: 'block-delete',
        blockKey: firstDeletedKey,
        index: deleteIndex,
      }
    }
  }

  // -----------------------------------------------------------------------
  // Step 4: Text-level changes within matched blocks
  // -----------------------------------------------------------------------

  // Collect all text changes across matched blocks
  const textChanges: PTChange[] = []

  for (const matchedKey of alignment.matchedKeys) {
    const oldBlock = alignment.oldBlocksByKey.get(matchedKey)
    const newBlock = alignment.newBlocksByKey.get(matchedKey)

    if (!oldBlock || !newBlock) {
      continue
    }

    const textChange = detectTextChange(matchedKey, oldBlock, newBlock)
    if (textChange) {
      textChanges.push(textChange)
    }
  }

  if (textChanges.length === 1) {
    const singleChange = textChanges[0]
    if (singleChange) {
      return singleChange
    }
  }

  if (textChanges.length > 1) {
    // Multiple blocks changed text simultaneously. Use cursorOffset to
    // pick the most relevant one if available, otherwise return the first.
    // This is a rare case — typically only one block changes at a time.
    if (cursorOffset !== undefined) {
      // Try to find the change that contains the cursor position.
      // The cursorOffset is a global offset across all blocks, so we
      // need to map it to block-local offsets.
      let runningOffset = 0
      for (const newBlock of newBlocks) {
        const blockText = getBlockText(newBlock)
        const blockEnd = runningOffset + blockText.length

        if (cursorOffset >= runningOffset && cursorOffset <= blockEnd) {
          // Cursor is in this block — find the matching change
          const cursorBlockChange = textChanges.find(
            (change) =>
              'blockKey' in change && change.blockKey === newBlock._key,
          )
          if (cursorBlockChange) {
            return cursorBlockChange
          }
        }

        // +1 for the implicit block separator
        runningOffset = blockEnd + 1
      }
    }

    // Fall back to the first change
    const firstChange = textChanges[0]
    if (firstChange) {
      return firstChange
    }
  }

  // -----------------------------------------------------------------------
  // Step 5: No detectable change
  // This can happen when only non-text properties changed (e.g., marks,
  // styles) or when the blocks are structurally identical.
  // -----------------------------------------------------------------------

  return {type: 'no-change'}
}
