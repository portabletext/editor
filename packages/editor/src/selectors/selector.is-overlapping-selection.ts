import {rangesOverlap} from '../engine/range/ranges-overlap'
import {hasNode} from '../traversal/has-node'
import type {EditorSelection} from '../types/editor'
import type {EditorSelector} from './../editor/editor-selector'

/**
 * Returns true if the supplied selection shares at least one point with the
 * editor's current selection. Resolves at any container depth.
 *
 * Two selections that touch at a single endpoint share that point and are
 * considered overlapping.
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
      !hasNode(snapshot, selection.anchor.path) ||
      !hasNode(snapshot, selection.focus.path) ||
      !hasNode(snapshot, editorSelection.anchor.path) ||
      !hasNode(snapshot, editorSelection.focus.path)
    ) {
      return false
    }

    return rangesOverlap(selection, editorSelection, {
      children: snapshot.context.value,
    })
  }
}
