export type EditorSelection = {
  anchor: EditorSelectionPoint
  focus: EditorSelectionPoint
} | null

export type EditorSelectionPoint = {
  path: Path
  offset: number
}

export type Path = Array<number>

export function isBackward(selection: EditorSelection): boolean {
  if (!selection) {
    return false
  }

  return isPointAfter(selection.anchor, selection.focus)
}

/**
 * Check if one point is after another point
 */
export function isPointAfter(
  point: EditorSelectionPoint,
  another: EditorSelectionPoint,
): boolean {
  return comparePoints(point, another) === 1
}

/**
 * Check if one point is before another point
 */
export function isPointBefore(
  point: EditorSelectionPoint,
  another: EditorSelectionPoint,
): boolean {
  return comparePoints(point, another) === -1
}

/**
 * Check if two points are equal
 */
export function pointEquals(
  point: EditorSelectionPoint,
  another: EditorSelectionPoint,
): boolean {
  return comparePoints(point, another) === 0
}

export function selectionIncludesSelection(
  selectionA: EditorSelection,
  selectionB: EditorSelection,
): boolean {
  if (!selectionA || !selectionB) {
    return false
  }

  const startA = isBackward(selectionA) ? selectionA.focus : selectionA.anchor
  const endA = isBackward(selectionA) ? selectionA.anchor : selectionA.focus

  const startB = isBackward(selectionB) ? selectionB.focus : selectionB.anchor
  const endB = isBackward(selectionB) ? selectionB.anchor : selectionB.focus

  if (isPointBefore(endB, startA)) {
    return false
  }

  if (isPointAfter(startB, endA)) {
    return false
  }

  if (isExpanded(selectionB) && pointEquals(endB, startA)) {
    return false
  }

  if (isExpanded(selectionB) && pointEquals(startB, endA)) {
    return false
  }

  return true
}

function comparePoints(
  point: EditorSelectionPoint,
  another: EditorSelectionPoint,
): -1 | 0 | 1 {
  const result = comparePaths(point.path, another.path)

  if (result === 0) {
    if (point.offset < another.offset) return -1
    if (point.offset > another.offset) return 1
    return 0
  }

  return result
}

function comparePaths(path: Path, another: Path): -1 | 0 | 1 {
  const min = Math.min(path.length, another.length)

  for (let i = 0; i < min; i++) {
    if (path[i] < another[i]) return -1
    if (path[i] > another[i]) return 1
  }

  return 0
}

export function isCollapsed(selection: EditorSelection): boolean {
  if (!selection) {
    return false
  }

  return pointEquals(selection.anchor, selection.focus)
}

export function isExpanded(selection: EditorSelection): boolean {
  return !isCollapsed(selection)
}
