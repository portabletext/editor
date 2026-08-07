import type {
  PortableTextBlock,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {DIFF_DELETE, DIFF_INSERT, makeDiff} from '@sanity/diff-match-patch'
import type {BlockTextSnapshot} from './dom-text-reader'

export type TextInsertChange = {
  type: 'text.insert'
  blockKey: string
  spanKey: string
  offset: number
  text: string
}

export type TextDeleteChange = {
  type: 'text.delete'
  blockKey: string
  spanKey: string
  from: number
  to: number
}

export type TextReplaceChange = {
  type: 'text.replace'
  blockKey: string
  spanKey: string
  from: number
  to: number
  text: string
}

export type BlockSplitChange = {
  type: 'block.split'
  originalBlockKey: string
  newBlockKey: string
  splitOffset: number
}

export type BlockMergeChange = {
  type: 'block.merge'
  survivingBlockKey: string
  removedBlockKey: string
  joinOffset: number
}

export type BlockInsertChange = {
  type: 'block.insert'
  blockKey: string
  index: number
}

export type BlockDeleteChange = {
  type: 'block.delete'
  blockKey: string
  index: number
}

export type NoChange = {
  type: 'noop'
}

export type PortableTextChange =
  | TextInsertChange
  | TextDeleteChange
  | TextReplaceChange
  | BlockSplitChange
  | BlockMergeChange
  | BlockInsertChange
  | BlockDeleteChange
  | NoChange

/**
 * Compare two PT block arrays and detect what changed.
 *
 * Algorithm:
 * 1. Align blocks by `_key` to find insertions, deletions, and matches
 * 2. Check for structural changes (split, merge) first
 * 3. Fall back to text-level diffing for matched blocks
 * 4. Handle pure block insertions/deletions as a last resort
 */
export function detectChange(
  oldBlocks: PortableTextBlock[],
  newBlocks: BlockTextSnapshot[],
  cursorOffset?: number,
  spanType: string = 'span',
): PortableTextChange {
  if (oldBlocks.length === 0 && newBlocks.length === 0) {
    return {type: 'noop'}
  }

  const alignment = alignBlocks(oldBlocks, newBlocks)

  // Structural changes take priority — they involve both block count
  // changes AND text changes, so we report the structural intent.
  const splitChange = detectBlockSplit(
    alignment,
    oldBlocks,
    newBlocks,
    spanType,
  )
  if (splitChange) {
    return splitChange
  }

  const mergeChange = detectBlockMerge(alignment, oldBlocks, spanType)
  if (mergeChange) {
    return mergeChange
  }

  // Pure block insertions
  if (alignment.insertedKeys.length > 0 && alignment.deletedKeys.length === 0) {
    const firstInsertedKey = alignment.insertedKeys[0]
    if (firstInsertedKey === undefined) {
      return {type: 'noop'}
    }
    const insertIndex = alignment.newBlockIndexByKey.get(firstInsertedKey)

    if (insertIndex !== undefined) {
      return {
        type: 'block.insert',
        blockKey: firstInsertedKey,
        index: insertIndex,
      }
    }
  }

  // Pure block deletions
  if (alignment.deletedKeys.length > 0 && alignment.insertedKeys.length === 0) {
    const firstDeletedKey = alignment.deletedKeys[0]
    if (firstDeletedKey === undefined) {
      return {type: 'noop'}
    }
    const deleteIndex = alignment.oldBlockIndexByKey.get(firstDeletedKey)

    if (deleteIndex !== undefined) {
      return {
        type: 'block.delete',
        blockKey: firstDeletedKey,
        index: deleteIndex,
      }
    }
  }

  // Text-level changes within matched blocks
  const textChanges: PortableTextChange[] = []

  for (const matchedKey of alignment.matchedKeys) {
    const oldBlock = alignment.oldBlocksByKey.get(matchedKey)
    const newSnapshot = alignment.newSnapshotsByKey.get(matchedKey)

    if (!oldBlock || !newSnapshot) {
      continue
    }

    const textChange = detectTextChange(
      matchedKey,
      oldBlock,
      newSnapshot,
      spanType,
    )
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
    // Multiple blocks changed simultaneously — use `cursorOffset` to
    // pick the most relevant one if available.
    //
    // Note: `cursorOffset` is span-local (selection.anchor.offset) but
    // the disambiguation below treats it as document-global by accumulating
    // a running offset across blocks. This is technically incorrect but
    // only matters when multiple blocks change simultaneously on the slow
    // path, which is extremely rare in practice.
    if (cursorOffset !== undefined) {
      let runningOffset = 0
      for (const snapshot of newBlocks) {
        const blockEnd = runningOffset + snapshot.text.length

        if (cursorOffset >= runningOffset && cursorOffset <= blockEnd) {
          const cursorBlockChange = textChanges.find(
            (change) =>
              'blockKey' in change && change.blockKey === snapshot._key,
          )
          if (cursorBlockChange) {
            return cursorBlockChange
          }
        }

        // +1 for the implicit block separator
        runningOffset = blockEnd + 1
      }
    }

    const firstChange = textChanges[0]
    if (firstChange) {
      return firstChange
    }
  }

  return {type: 'noop'}
}

function detectBlockSplit(
  alignment: BlockAlignment,
  _oldBlocks: PortableTextBlock[],
  newBlocks: BlockTextSnapshot[],
  spanType: string,
): BlockSplitChange | null {
  const {insertedKeys, deletedKeys} = alignment

  if (insertedKeys.length !== 1 || deletedKeys.length !== 0) {
    return null
  }

  const insertedKey = insertedKeys[0]
  if (!insertedKey) {
    return null
  }
  const insertedSnapshot = alignment.newSnapshotsByKey.get(insertedKey)
  if (!insertedSnapshot) {
    return null
  }

  // Block objects (e.g. images) aren't splits
  if (!insertedSnapshot.isTextBlock) {
    return null
  }

  const insertedIndex = alignment.newBlockIndexByKey.get(insertedKey)
  if (insertedIndex === undefined || insertedIndex === 0) {
    return null
  }

  const precedingSnapshot = newBlocks[insertedIndex - 1]
  if (!precedingSnapshot) {
    return null
  }

  const originalKey = precedingSnapshot._key
  const oldOriginalBlock = alignment.oldBlocksByKey.get(originalKey)
  if (!oldOriginalBlock) {
    return null
  }

  const oldText = getBlockText(oldOriginalBlock, spanType)

  if (oldText === precedingSnapshot.text + insertedSnapshot.text) {
    return {
      type: 'block.split',
      originalBlockKey: originalKey,
      newBlockKey: insertedKey,
      splitOffset: precedingSnapshot.text.length,
    }
  }

  return null
}

function detectBlockMerge(
  alignment: BlockAlignment,
  oldBlocks: PortableTextBlock[],
  spanType: string,
): BlockMergeChange | null {
  const {insertedKeys, deletedKeys} = alignment

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

  // Block objects (e.g. images) aren't merges
  if (!hasChildren(removedBlock)) {
    return null
  }

  const removedOldIndex = alignment.oldBlockIndexByKey.get(removedKey)
  if (removedOldIndex === undefined) {
    return null
  }

  const removedText = getBlockText(removedBlock, spanType)

  // Check preceding block absorbed the removed block's content (Backspace)
  if (removedOldIndex > 0) {
    const precedingBlock = oldBlocks[removedOldIndex - 1]
    if (!precedingBlock) {
      return null
    }
    const precedingKey = precedingBlock._key
    const newPrecedingSnapshot = alignment.newSnapshotsByKey.get(precedingKey)

    if (newPrecedingSnapshot) {
      const oldPrecedingText = getBlockText(precedingBlock, spanType)

      if (newPrecedingSnapshot.text === oldPrecedingText + removedText) {
        return {
          type: 'block.merge',
          survivingBlockKey: precedingKey,
          removedBlockKey: removedKey,
          joinOffset: oldPrecedingText.length,
        }
      }
    }
  }

  // Check following block absorbed the removed block's content (Delete)
  if (removedOldIndex < oldBlocks.length - 1) {
    const followingBlock = oldBlocks[removedOldIndex + 1]
    if (!followingBlock) {
      return null
    }
    const followingKey = followingBlock._key
    const newFollowingSnapshot = alignment.newSnapshotsByKey.get(followingKey)

    if (newFollowingSnapshot) {
      const oldFollowingText = getBlockText(followingBlock, spanType)

      if (newFollowingSnapshot.text === removedText + oldFollowingText) {
        return {
          type: 'block.merge',
          survivingBlockKey: followingKey,
          removedBlockKey: removedKey,
          joinOffset: removedText.length,
        }
      }
    }
  }

  return null
}

function detectTextChange(
  blockKey: string,
  oldBlock: PortableTextBlock,
  newSnapshot: BlockTextSnapshot,
  spanType: string,
): PortableTextChange | null {
  const oldText = getBlockText(oldBlock, spanType)
  const newText = newSnapshot.text

  const diff = findTextDiff(oldText, newText)
  if (!diff) {
    return null
  }

  const deletedLength = diff.oldEnd - diff.diffStart
  const insertedText = newText.slice(diff.diffStart, diff.newEnd)

  // All three cases resolve the span key from the old block. The insertion
  // offset exists in the old text too (it's where the change starts), so the
  // old block works for `text.insert` as well as delete and replace.
  const spanKey = findSpanKeyAtOffset(oldBlock, diff.diffStart, spanType)

  if (deletedLength === 0 && insertedText.length > 0) {
    return {
      type: 'text.insert',
      blockKey,
      spanKey,
      offset: diff.diffStart,
      text: insertedText,
    }
  }

  if (deletedLength > 0 && insertedText.length === 0) {
    return {
      type: 'text.delete',
      blockKey,
      spanKey,
      from: diff.diffStart,
      to: diff.oldEnd,
    }
  }

  return {
    type: 'text.replace',
    blockKey,
    spanKey,
    from: diff.diffStart,
    to: diff.oldEnd,
    text: insertedText,
  }
}

type BlockAlignment = {
  oldKeySet: Set<string>
  newKeySet: Set<string>
  insertedKeys: string[]
  deletedKeys: string[]
  matchedKeys: string[]
  oldBlocksByKey: Map<string, PortableTextBlock>
  newSnapshotsByKey: Map<string, BlockTextSnapshot>
  newBlockIndexByKey: Map<string, number>
  oldBlockIndexByKey: Map<string, number>
}

/**
 * Aligns old and new block lists by `_key`. Keys are unique among siblings
 * (not globally), so this works for a flat block list. For container support,
 * the alignment would need to account for blocks at different nesting levels
 * potentially sharing keys.
 *
 * Assumes a single user action per flush (one split, one merge, or one
 * text change). Simultaneous structural changes across multiple blocks
 * may produce a `noop` result.
 */
function alignBlocks(
  oldBlocks: PortableTextBlock[],
  newBlocks: BlockTextSnapshot[],
): BlockAlignment {
  const oldKeySet = new Set<string>()
  const newKeySet = new Set<string>()
  const oldBlocksByKey = new Map<string, PortableTextBlock>()
  const newSnapshotsByKey = new Map<string, BlockTextSnapshot>()
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
    const snapshot = newBlocks[blockIndex]
    if (!snapshot) {
      continue
    }
    newKeySet.add(snapshot._key)
    newSnapshotsByKey.set(snapshot._key, snapshot)
    newBlockIndexByKey.set(snapshot._key, blockIndex)
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
    newSnapshotsByKey,
    newBlockIndexByKey,
    oldBlockIndexByKey,
  }
}

/**
 * Find the `_key` of the span that contains the given character offset
 * in the block's concatenated text.
 *
 * On a span boundary, returns the next span. At the end of text, returns
 * the last span.
 */
function findSpanKeyAtOffset(
  block: PortableTextBlock,
  offset: number,
  spanType: string,
): string {
  if (!hasChildren(block)) {
    return ''
  }

  const spans = block.children.filter((child): child is PortableTextSpan =>
    isPortableTextSpan(child, spanType),
  )
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

  const lastSpan = spans[spans.length - 1]
  return lastSpan ? lastSpan._key : ''
}

type TextDiffRange = {
  diffStart: number
  oldEnd: number
  newEnd: number
}

function findTextDiff(oldText: string, newText: string): TextDiffRange | null {
  if (oldText === newText) {
    return null
  }

  const diffs = makeDiff(oldText, newText)

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

function hasChildren(block: PortableTextBlock): block is PortableTextTextBlock {
  return 'children' in block && Array.isArray(block.children)
}

function isPortableTextSpan(
  child: unknown,
  spanType: string,
): child is PortableTextSpan {
  if (typeof child !== 'object' || child === null) {
    return false
  }
  return (
    '_type' in child &&
    child._type === spanType &&
    'text' in child &&
    typeof child.text === 'string'
  )
}

function getBlockText(block: PortableTextBlock, spanType: string): string {
  if (!hasChildren(block)) {
    return ''
  }
  return block.children
    .filter((child): child is PortableTextSpan =>
      isPortableTextSpan(child, spanType),
    )
    .map((span) => span.text)
    .join('')
}
