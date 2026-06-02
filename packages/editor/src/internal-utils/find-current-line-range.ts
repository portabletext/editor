import {DOMEditor} from '../engine/dom/plugin/dom-editor'
import {positions as editorPositions} from '../engine/editor/positions'
import {range as editorRange} from '../engine/editor/range'
import type {Editor} from '../engine/interfaces/editor'
import type {Range} from '../engine/interfaces/range'
import {rangeEnd} from '../engine/range/range-end'

/**
 * Compute the visual line range that ends at `parentRange`'s end point.
 *
 * Walks every editor position inside `parentRange` and binary-searches for
 * the first one whose DOM bounding rect overlaps the end point's rect — that
 * position becomes the line's start. Used by line-unit deletes (e.g. macOS
 * Cmd+Backspace) to delete back to the start of the visual line.
 *
 * Layout-aware: requires the editor to be mounted in the DOM.
 */
export function findCurrentLineRange(
  editor: Editor,
  parentRange: Range,
): Range {
  const parentRangeBoundary = editorRange(
    editor,
    rangeEnd(parentRange, editor.snapshot.context),
  )
  const positions = Array.from(editorPositions(editor, {at: parentRange}))

  let left = 0
  let right = positions.length
  let middle = Math.floor(right / 2)

  if (
    rangesAreOnSameLine(
      editor,
      editorRange(editor, positions[left]!),
      parentRangeBoundary,
    )
  ) {
    return editorRange(editor, positions[left]!, parentRangeBoundary)
  }

  if (positions.length < 2) {
    return editorRange(
      editor,
      positions[positions.length - 1]!,
      parentRangeBoundary,
    )
  }

  while (middle !== positions.length && middle !== left) {
    if (
      rangesAreOnSameLine(
        editor,
        editorRange(editor, positions[middle]!),
        parentRangeBoundary,
      )
    ) {
      right = middle
    } else {
      left = middle
    }

    middle = Math.floor((left + right) / 2)
  }

  return editorRange(editor, positions[left]!, parentRangeBoundary)
}

function rangesAreOnSameLine(editor: Editor, range1: Range, range2: Range) {
  const rect1 = DOMEditor.toDOMRange(editor, range1).getBoundingClientRect()
  const rect2 = DOMEditor.toDOMRange(editor, range2).getBoundingClientRect()

  return domRectsIntersect(rect1, rect2) && domRectsIntersect(rect2, rect1)
}

function domRectsIntersect(rect: DOMRect, compareRect: DOMRect) {
  const middle = (compareRect.top + compareRect.bottom) / 2

  return rect.top <= middle && rect.bottom >= middle
}
