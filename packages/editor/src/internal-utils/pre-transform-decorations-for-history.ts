import type {DecoratedRange} from '../editor/range-decorations-machine'
import type {UndoStep} from '../editor/undo-step'
import {slateRangeToSelection} from '../internal-utils/slate-utils'
import type {Point} from '../slate/interfaces/point'
import {isAfterPoint} from '../slate/point/is-after-point'
import {pointEquals} from '../slate/point/point-equals'
import {isRange} from '../slate/range/is-range'
import type {EditorSelection} from '../types/editor'
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
 * using stored split/merge context. Always suppresses decoration sendback
 * when a structural context exists, mirroring `applySplitNode` and
 * `applyMergeNode`. Returns a cleanup function that restores sendback,
 * re-resolves all decoration selections, and fires `onMoved` callbacks
 * for decorations whose position actually changed.
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
    return () => {}
  }

  // Track ALL decorations — both moved and unmoved — so the cleanup can
  // re-resolve selections and fire onMoved only for actual changes.
  const tracked: Array<{
    decoratedRange: DecoratedRange
    originalSelection: EditorSelection
    moved: boolean
  }> = []

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
      const updated: DecoratedRange = {
        ...dr,
        anchor: newAnchor,
        focus: newFocus,
      }
      tracked.push({
        decoratedRange: updated,
        originalSelection: dr.rangeDecoration.selection,
        moved: true,
      })
      newDecoratedRanges.push(updated)
    } else {
      tracked.push({
        decoratedRange: dr,
        originalSelection: dr.rangeDecoration.selection,
        moved: false,
      })
      newDecoratedRanges.push(dr)
    }
  }

  editor.decoratedRanges = newDecoratedRanges
  editor._suppressDecorationSendBack++

  return () => {
    editor._suppressDecorationSendBack--

    if (editor._suppressDecorationSendBack === 0) {
      for (const {decoratedRange, originalSelection, moved} of tracked) {
        if (!isRange(decoratedRange)) continue

        const newSelection = slateRangeToSelection({
          schema: editor.schema,
          editor,
          range: {anchor: decoratedRange.anchor, focus: decoratedRange.focus},
        })

        if (moved) {
          decoratedRange.rangeDecoration.onMoved?.({
            previousSelection: originalSelection,
            newSelection,
            rangeDecoration: decoratedRange.rangeDecoration,
            origin: 'local',
            reason: 'moved',
          })
        }

        if (newSelection) {
          decoratedRange.rangeDecoration = {
            ...decoratedRange.rangeDecoration,
            selection: newSelection,
          }
        }
      }
    }
  }
}
