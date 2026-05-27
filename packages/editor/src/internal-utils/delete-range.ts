import {after} from '../engine/editor/after'
import {before} from '../engine/editor/before'
import {withoutNormalizing} from '../engine/editor/without-normalizing'
import type {Range} from '../engine/interfaces/range'
import {isAncestorPath} from '../engine/path/is-ancestor-path'
import {isCollapsedRange} from '../engine/range/is-collapsed-range'
import {rangeEdges} from '../engine/range/range-edges'
import {getEnclosingBlock} from '../node-traversal/get-enclosing-block'
import {getHighestObjectNode} from '../node-traversal/get-highest-object-node'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {applyDelete, type SelectionMode} from './delete-internal'

interface DeleteRangeOptions {
  /**
   * What to do with the editor selection after the delete:
   * - `'collapse-to-start'` collapses to the start of the deleted range.
   * - `'preserve'` leaves selection alone, for callers that update it
   *   themselves.
   */
  selection: SelectionMode
  /**
   * Controls what happens when the start block ends up empty after its
   * content has been trimmed away:
   * - `true` removes the empty start block, so any block-level formatting
   *   (style, listItem) on the end block survives the merge.
   * - `false` always merges the end block into the start, preserving the
   *   start block's formatting instead.
   */
  removeEmptyStartBlock: boolean
}

/**
 * Delete an explicit range. The range is treated literally — callers that
 * want user-intent unhang semantics should call `unhangRangeForDelete`
 * first and pass the resulting range. Endpoints inside void inline objects
 * are clamped onto text positions.
 *
 * For collapsed-cursor input (Backspace, Delete, Alt+Backspace, ...), use
 * `deleteCollapsed` instead. It expands the cursor into a range first.
 */
export function deleteRange(
  editor: PortableTextEditorEngine,
  range: Range,
  options: DeleteRangeOptions,
): void {
  withoutNormalizing(editor, () => {
    const resolved = resolveExplicitRange(editor, range)
    if (!resolved) {
      return
    }
    applyDelete(editor, resolved, {
      capture: false,
      collapsedInput: false,
      reverse: false,
      unit: 'character',
      selection: options.selection,
      removeEmptyStartBlock: options.removeEmptyStartBlock,
    })
  })
}

/**
 * Nudge either endpoint out of any object node it lands inside. Returns
 * `null` for collapsed input.
 */
function resolveExplicitRange(
  editor: PortableTextEditorEngine,
  at: Range,
): Range | null {
  if (isCollapsedRange(at)) {
    return null
  }

  const [start, end] = rangeEdges(at, editor)
  const startBlock = getEnclosingBlock(editor, start.path)
  const endBlock = getEnclosingBlock(editor, end.path)

  let clampedStart = start
  let clampedEnd = end

  const startObjectNode = getHighestObjectNode(editor, start.path)
  if (startObjectNode && startBlock) {
    const beforePoint = before(editor, start)
    if (beforePoint && isAncestorPath(startBlock.path, beforePoint.path)) {
      clampedStart = beforePoint
    }
  }

  const endObjectNode = getHighestObjectNode(editor, end.path)
  if (endObjectNode && endBlock) {
    const afterPoint = after(editor, end)
    if (afterPoint && isAncestorPath(endBlock.path, afterPoint.path)) {
      clampedEnd = afterPoint
    }
  }

  return {anchor: clampedStart, focus: clampedEnd}
}
