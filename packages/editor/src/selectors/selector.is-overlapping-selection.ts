import {hasNode} from '../node-traversal/has-node'
import type {EditorSelection, EditorSelectionPoint} from '../types/editor'
import {
  getSelectionEndPoint,
  getSelectionStartPoint,
  isEqualSelectionPoints,
} from '../utils'
import {comparePoints} from '../utils/util.compare-points'
import type {EditorSelector} from './../editor/editor-selector'
import type {EditorSnapshot} from './../editor/editor-snapshot'

/**
 * Returns true if the supplied selection overlaps with the editor's current
 * selection. Resolves at any container depth.
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

    const selectionStart = getSelectionStartPoint(selection)
    const selectionEnd = getSelectionEndPoint(selection)
    const editorSelectionStart = getSelectionStartPoint(editorSelection)
    const editorSelectionEnd = getSelectionEndPoint(editorSelection)

    if (
      !selectionStart ||
      !selectionEnd ||
      !editorSelectionStart ||
      !editorSelectionEnd
    ) {
      return false
    }

    if (
      !hasNode(snapshot.context, selectionStart.path) ||
      !hasNode(snapshot.context, selectionEnd.path) ||
      !hasNode(snapshot.context, editorSelectionStart.path) ||
      !hasNode(snapshot.context, editorSelectionEnd.path)
    ) {
      return false
    }

    return hasPointLevelOverlap(
      snapshot,
      selectionStart,
      selectionEnd,
      editorSelectionStart,
      editorSelectionEnd,
    )
  }
}

/**
 * Check if selections overlap at the point level.
 */
function hasPointLevelOverlap(
  snapshot: EditorSnapshot,
  selectionStart: EditorSelectionPoint,
  selectionEnd: EditorSelectionPoint,
  editorSelectionStart: EditorSelectionPoint,
  editorSelectionEnd: EditorSelectionPoint,
): boolean {
  // Check for exact equality first
  if (
    isEqualSelectionPoints(selectionStart, editorSelectionStart) &&
    isEqualSelectionPoints(selectionEnd, editorSelectionEnd)
  ) {
    return true
  }

  // Compare selection start against editor selection bounds
  const selectionStartVsEditorSelectionStart = comparePoints(
    snapshot,
    selectionStart,
    editorSelectionStart,
  )
  const selectionStartVsEditorSelectionEnd = comparePoints(
    snapshot,
    selectionStart,
    editorSelectionEnd,
  )

  // Compare selection end against editor selection bounds
  const selectionEndVsEditorSelectionStart = comparePoints(
    snapshot,
    selectionEnd,
    editorSelectionStart,
  )
  const selectionEndVsEditorSelectionEnd = comparePoints(
    snapshot,
    selectionEnd,
    editorSelectionEnd,
  )

  // Compare editor selection bounds against selection bounds
  const editorSelectionStartVsSelectionStart = comparePoints(
    snapshot,
    editorSelectionStart,
    selectionStart,
  )
  const editorSelectionEndVsSelectionEnd = comparePoints(
    snapshot,
    editorSelectionEnd,
    selectionEnd,
  )

  // Derive boolean flags
  const selectionStartBeforeEditorSelectionStart =
    selectionStartVsEditorSelectionStart === -1
  const selectionStartAfterEditorSelectionEnd =
    selectionStartVsEditorSelectionEnd === 1
  const selectionEndBeforeEditorSelectionStart =
    selectionEndVsEditorSelectionStart === -1
  const selectionEndAfterEditorSelectionEnd =
    selectionEndVsEditorSelectionEnd === 1

  const editorSelectionStartBeforeSelectionStart =
    editorSelectionStartVsSelectionStart === -1
  const editorSelectionStartAfterSelectionStart =
    editorSelectionStartVsSelectionStart === 1
  const editorSelectionEndBeforeSelectionEnd =
    editorSelectionEndVsSelectionEnd === -1
  const editorSelectionEndAfterSelectionEnd =
    editorSelectionEndVsSelectionEnd === 1

  const selectionStartEqualEditorSelectionEnd = isEqualSelectionPoints(
    selectionStart,
    editorSelectionEnd,
  )
  const selectionEndEqualEditorSelectionStart = isEqualSelectionPoints(
    selectionEnd,
    editorSelectionStart,
  )

  // If all relative position checks fail, selections don't overlap
  if (
    !selectionEndEqualEditorSelectionStart &&
    !selectionStartEqualEditorSelectionEnd &&
    !editorSelectionStartBeforeSelectionStart &&
    !editorSelectionStartAfterSelectionStart &&
    !editorSelectionEndBeforeSelectionEnd &&
    !editorSelectionEndAfterSelectionEnd
  ) {
    return false
  }

  // Selection ends before editor selection starts
  if (
    selectionEndBeforeEditorSelectionStart &&
    !selectionEndEqualEditorSelectionStart
  ) {
    return false
  }

  // Selection starts after editor selection ends
  if (
    selectionStartAfterEditorSelectionEnd &&
    !selectionStartEqualEditorSelectionEnd
  ) {
    return false
  }

  // Editor selection is entirely after the input selection start
  if (
    !editorSelectionStartBeforeSelectionStart &&
    editorSelectionStartAfterSelectionStart &&
    !editorSelectionEndBeforeSelectionEnd &&
    editorSelectionEndAfterSelectionEnd
  ) {
    return !selectionEndEqualEditorSelectionStart
  }

  // Editor selection is entirely before the input selection end
  if (
    editorSelectionStartBeforeSelectionStart &&
    !editorSelectionStartAfterSelectionStart &&
    editorSelectionEndBeforeSelectionEnd &&
    !editorSelectionEndAfterSelectionEnd
  ) {
    return !selectionStartEqualEditorSelectionEnd
  }

  // If any of these conditions is false, there's overlap
  if (
    !selectionStartAfterEditorSelectionEnd ||
    !selectionStartBeforeEditorSelectionStart ||
    !selectionEndAfterEditorSelectionEnd ||
    !selectionEndBeforeEditorSelectionStart
  ) {
    return true
  }

  return false
}
