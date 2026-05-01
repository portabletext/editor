import {hasNode} from '../node-traversal/has-node'
import {comparePoints} from '../slate/point/compare-points'
import {isCollapsedRange} from '../slate/range/is-collapsed-range'
import {rangeEdges} from '../slate/range/range-edges'
import {rangesOverlap} from '../slate/range/ranges-overlap'
import type {EditorSelection} from '../types/editor'
import type {EditorSelector} from './../editor/editor-selector'

/**
 * Returns true if the supplied selection overlaps with the editor's current
 * selection. Resolves at any container depth.
 *
 * Two selections that only touch at a single endpoint are considered
 * overlapping when at least one is collapsed. Two expanded selections that
 * only touch at a single endpoint do not overlap.
 *
 * @public
 */
export function isOverlappingSelection(
  selection: EditorSelection,
): EditorSelector<boolean> {
  return (snapshot) => {
    const editorSelection = snapshot.context.selection

    if (!selection || !editorSelection) {
      return false
    }

    if (
      !hasNode(snapshot.context, selection.anchor.path) ||
      !hasNode(snapshot.context, selection.focus.path) ||
      !hasNode(snapshot.context, editorSelection.anchor.path) ||
      !hasNode(snapshot.context, editorSelection.focus.path)
    ) {
      return false
    }

    const root = {children: snapshot.context.value}

    if (!rangesOverlap(selection, editorSelection, root)) {
      return false
    }

    if (isCollapsedRange(selection) || isCollapsedRange(editorSelection)) {
      return true
    }

    const [startA, endA] = rangeEdges(selection, root)
    const [startB, endB] = rangeEdges(editorSelection, root)
    if (
      comparePoints(endA, startB, root) === 0 ||
      comparePoints(endB, startA, root) === 0
    ) {
      return false
    }

    return true
  }
}
