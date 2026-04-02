import {isSpan, isTextBlock} from '@portabletext/schema'
import type {DecoratedRange} from '../editor/range-decorations-machine'
import type {UndoStep} from '../editor/undo-step'
import type {Point} from '../slate/interfaces/point'
import {isAfterPoint} from '../slate/point/is-after-point'
import {pointEquals} from '../slate/point/point-equals'
import {isRange} from '../slate/range/is-range'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {transformPointForMerge} from './apply-merge-node'
import {transformPointForSplit} from './apply-split-node'

type TransformFn = (point: Point, affinity: 'forward' | 'backward') => Point

function buildTransformChain(
  editor: PortableTextSlateEditor,
  step: UndoStep,
  direction: 'undo' | 'redo',
): TransformFn | null {
  const {splitContext, mergeContext} = step

  if (splitContext) {
    const origBlockIndex = editor.blockIndexMap.get(
      splitContext.originalBlockKey,
    )
    if (origBlockIndex === undefined) return null

    const hasSpanSplit = splitContext.splitOffset > 0
    const splitAtIndex = hasSpanSplit
      ? splitContext.splitChildIndex + 1
      : splitContext.splitChildIndex

    if (direction === 'undo') {
      // Undoing a split = merging the new block back into the original.
      // The new block is always at origBlockIndex + 1 (split creates it
      // immediately after). We derive the index positionally because
      // splitContext.newBlockKey may not reflect the final inserted key.
      const newBlockIndex = origBlockIndex + 1

      return (point, _affinity) => {
        let result = transformPointForMerge(
          point,
          [newBlockIndex],
          splitAtIndex,
        )
        if (hasSpanSplit) {
          result = transformPointForMerge(
            result,
            [origBlockIndex, splitContext.splitChildIndex + 1],
            splitContext.splitOffset,
          )
        }
        return result
      }
    }

    return (point, affinity) => {
      let result = point
      if (hasSpanSplit) {
        result = transformPointForSplit(
          result,
          [origBlockIndex, splitContext.splitChildIndex],
          splitContext.splitOffset,
          affinity,
        )!
      }
      result = transformPointForSplit(
        result,
        [origBlockIndex],
        splitAtIndex,
        affinity,
      )!
      return result
    }
  }

  if (mergeContext) {
    const targetBlockIndex = editor.blockIndexMap.get(
      mergeContext.targetBlockKey,
    )
    const deletedBlockIndex = editor.blockIndexMap.get(
      mergeContext.deletedBlockKey,
    )
    if (targetBlockIndex === undefined) return null

    if (direction === 'undo') {
      return (point, affinity) => {
        let result = transformPointForSplit(
          point,
          [targetBlockIndex, mergeContext.targetOriginalChildCount - 1],
          mergeContext.targetBlockTextLength,
          affinity,
        )!
        result = transformPointForSplit(
          result,
          [targetBlockIndex],
          mergeContext.targetOriginalChildCount,
          affinity,
        )!
        return result
      }
    }

    if (deletedBlockIndex === undefined) return null
    return (point, _affinity) => {
      let result = transformPointForMerge(
        point,
        [deletedBlockIndex],
        mergeContext.targetOriginalChildCount,
      )
      result = transformPointForMerge(
        result,
        [targetBlockIndex, mergeContext.targetOriginalChildCount],
        mergeContext.targetBlockTextLength,
      )
      return result
    }
  }

  return null
}

/**
 * Pre-transforms `editor.decoratedRanges` for an undo or redo operation
 * using stored split/merge context. Suppresses decoration sendback while
 * the history ops run, mirroring `applySplitNode` and `applyMergeNode`.
 * Returns a cleanup function that restores sendback.
 */
export function preTransformDecorationsForHistory(
  editor: PortableTextSlateEditor,
  step: UndoStep,
  direction: 'undo' | 'redo',
): () => void {
  if (editor.decoratedRanges.length === 0) {
    return () => {}
  }

  const transform = buildTransformChain(editor, step, direction)
  if (!transform) {
    if (
      hasBlockLevelAddOps(step, direction) ||
      hasChildNodeOpsDestroyingPoints(step, direction)
    ) {
      return blockOffsetFallback(editor)
    }
    return () => {}
  }

  const newDecoratedRanges: typeof editor.decoratedRanges = []

  for (const dr of editor.decoratedRanges) {
    if (!isRange(dr)) {
      newDecoratedRanges.push(dr)
      continue
    }

    const isCollapsed = pointEquals(dr.anchor, dr.focus)
    const anchorIsEnd = !isCollapsed && isAfterPoint(dr.anchor, dr.focus)
    const focusIsEnd = !isCollapsed && !anchorIsEnd

    const newAnchor = transform(dr.anchor, anchorIsEnd ? 'backward' : 'forward')
    const newFocus = transform(dr.focus, focusIsEnd ? 'backward' : 'forward')

    const moved =
      !pointEquals(newAnchor, dr.anchor) || !pointEquals(newFocus, dr.focus)

    if (moved) {
      newDecoratedRanges.push({...dr, anchor: newAnchor, focus: newFocus})
    } else {
      newDecoratedRanges.push(dr)
    }
  }

  editor.decoratedRanges = newDecoratedRanges
  editor._suppressDecorationSendBack++

  return () => {
    editor._suppressDecorationSendBack--
  }
}

interface BlockTextOffset {
  blockKey: string
  textOffset: number
}

function computeBlockTextOffset(
  point: Point,
  editor: PortableTextSlateEditor,
): BlockTextOffset | null {
  const blockIndex = point.path[0]
  const childIndex = point.path[1]
  if (blockIndex === undefined || childIndex === undefined) return null

  const block = editor.children[blockIndex]
  if (!block || !isTextBlock({schema: editor.schema}, block)) return null

  let textOffset = 0
  for (let idx = 0; idx < childIndex; idx++) {
    const child = block.children[idx]
    if (isSpan({schema: editor.schema}, child)) {
      textOffset += child.text.length
    }
  }
  textOffset += point.offset

  return {blockKey: block._key, textOffset}
}

function resolveBlockTextOffset(
  offset: BlockTextOffset,
  editor: PortableTextSlateEditor,
): Point | null {
  const blockIndex = editor.blockIndexMap.get(offset.blockKey)
  if (blockIndex === undefined) return null

  const block = editor.children[blockIndex]
  if (!block || !isTextBlock({schema: editor.schema}, block)) return null

  let remaining = offset.textOffset
  for (let idx = 0; idx < block.children.length; idx++) {
    const child = block.children[idx]
    if (isSpan({schema: editor.schema}, child)) {
      if (remaining <= child.text.length) {
        return {path: [blockIndex, idx], offset: remaining}
      }
      remaining -= child.text.length
    }
  }

  const lastIdx = block.children.length - 1
  const lastChild = block.children[lastIdx]
  if (lastIdx >= 0 && isSpan({schema: editor.schema}, lastChild)) {
    return {path: [blockIndex, lastIdx], offset: lastChild.text.length}
  }

  return null
}

/**
 * Detects whether the undo/redo step will insert blocks (shifting indices
 * of all existing decorations). Undoing a `remove_node` at block level
 * re-inserts the block; redoing an `insert_node` at block level does the
 * same. In both cases `blockOffsetFallback` should handle the decorations
 * synchronously so that shifts are included in the mutation event.
 */
function hasBlockLevelAddOps(
  step: UndoStep,
  direction: 'undo' | 'redo',
): boolean {
  for (const op of step.operations) {
    if (op.type === 'set_selection') continue
    if (op.path.length !== 1) continue
    if (direction === 'undo' && op.type === 'remove_node') return true
    if (direction === 'redo' && op.type === 'insert_node') return true
  }
  return false
}

/**
 * Detects whether applying the step's operations (inverted for undo,
 * forward for redo) would include `remove_node` at child level — the
 * operation that destroys decoration points via `transformPoint`
 * returning `null`. This happens when marks are undone: `applySplitNode`
 * decomposes span splits into `remove_text` + `insert_node`, and
 * undoing those produces `remove_node` on the inserted span.
 */
function hasChildNodeOpsDestroyingPoints(
  step: UndoStep,
  direction: 'undo' | 'redo',
): boolean {
  for (const op of step.operations) {
    if (op.type === 'set_selection') continue
    if (op.path.length < 2) continue

    if (direction === 'undo') {
      if (op.type === 'insert_node') return true
    } else {
      if (op.type === 'remove_node') return true
    }
  }
  return false
}

/**
 * Fallback for undo/redo steps without split/merge context (e.g., mark
 * operations that split spans without setting `editor.splitContext`).
 * Snapshots decoration positions as block-key + absolute text offset,
 * suppresses sendback during the history ops, then re-resolves from
 * offsets afterward.
 */
function blockOffsetFallback(editor: PortableTextSlateEditor): () => void {
  const snapshots: Array<{
    decoratedRange: DecoratedRange
    anchorOffset: BlockTextOffset
    focusOffset: BlockTextOffset
  }> = []

  for (const dr of editor.decoratedRanges) {
    if (!isRange(dr)) continue
    const anchorOffset = computeBlockTextOffset(dr.anchor, editor)
    const focusOffset = computeBlockTextOffset(dr.focus, editor)
    if (!anchorOffset || !focusOffset) continue
    snapshots.push({
      decoratedRange: dr,
      anchorOffset,
      focusOffset,
    })
  }

  if (snapshots.length === 0) return () => {}

  editor._suppressDecorationSendBack++

  return () => {
    editor._suppressDecorationSendBack--
    if (editor._suppressDecorationSendBack > 0) return

    for (const snap of snapshots) {
      const newAnchor = resolveBlockTextOffset(snap.anchorOffset, editor)
      const newFocus = resolveBlockTextOffset(snap.focusOffset, editor)
      if (!newAnchor || !newFocus) continue

      snap.decoratedRange.anchor = newAnchor
      snap.decoratedRange.focus = newFocus
    }
  }
}
