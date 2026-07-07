import type {CSSProperties} from 'react'

// Visual tokens from the design prototype (constants.js on pte-tables-phases).
export const BLUE = 'var(--pt-plugin-table-accent)'
export const BORDER = 'var(--pt-plugin-table-border)'
const SELECTION_BORDER = 1.5
const FG = 'var(--pt-plugin-table-fg)'
const HEADER_BG = 'var(--pt-plugin-table-header-bg)'
export const HEADER_WEIGHT = 'var(--pt-plugin-table-header-weight, 600)'
const SELECTED_BG = 'var(--pt-plugin-table-selected-bg)'
const CELL_PADDING = 'var(--pt-plugin-table-cell-padding)'
const TABLE_RADIUS = 'var(--pt-plugin-table-radius)'

export type CellRange = {r0: number; r1: number; c0: number; c1: number}

/** Which edges of the selection rectangle this cell sits on (for the outline). */
function cellRangeEdges(row: number, col: number, range: CellRange | null) {
  if (
    !range ||
    row < range.r0 ||
    row > range.r1 ||
    col < range.c0 ||
    col > range.c1
  ) {
    return {top: false, bottom: false, left: false, right: false, inside: false}
  }
  return {
    top: row === range.r0,
    bottom: row === range.r1,
    left: col === range.c0,
    right: col === range.c1,
    inside: true,
  }
}

function cornerRadius(
  rowIdx: number,
  colIdx: number,
  rowCount: number,
  colCount: number,
): CSSProperties {
  const style: CSSProperties = {}
  if (rowIdx === 0 && colIdx === 0) {
    style.borderTopLeftRadius = TABLE_RADIUS
  }
  if (rowIdx === 0 && colIdx === colCount - 1) {
    style.borderTopRightRadius = TABLE_RADIUS
  }
  if (rowIdx === rowCount - 1 && colIdx === 0) {
    style.borderBottomLeftRadius = TABLE_RADIUS
  }
  if (rowIdx === rowCount - 1 && colIdx === colCount - 1) {
    style.borderBottomRightRadius = TABLE_RADIUS
  }
  return style
}

// The grey grid line just above/left of the selection's top/left edge is
// suppressed so it doesn't double up with the blue outline drawn by the
// bordering cell.
function suppressRightGrid(
  rowIdx: number,
  colIdx: number,
  range: CellRange | null,
): boolean {
  return (
    !!range &&
    colIdx + 1 === range.c0 &&
    rowIdx >= range.r0 &&
    rowIdx <= range.r1
  )
}

function suppressBottomGrid(
  rowIdx: number,
  colIdx: number,
  range: CellRange | null,
): boolean {
  return (
    !!range &&
    rowIdx + 1 === range.r0 &&
    colIdx >= range.c0 &&
    colIdx <= range.c1
  )
}

/**
 * The inline style for one cell: grey grid borders, blue selection outline on
 * the selection-rectangle edges, corner radii on the table corners, header
 * base, and the light-blue overlay on selected cells. Faithful to the branch's
 * `cellGridAndSelectionStyle` / `cellCornerRadius`, scoped to a single range.
 */
export function cellStyle({
  rowIdx,
  colIdx,
  rowCount,
  colCount,
  isHeader,
  range,
}: {
  rowIdx: number
  colIdx: number
  rowCount: number
  colCount: number
  isHeader: boolean
  range: CellRange | null
}): CSSProperties {
  const outline = cellRangeEdges(rowIdx, colIdx, range)
  const showOverlay = outline.inside

  const gridSide = `1px solid ${BORDER}`
  const selSide = `${SELECTION_BORDER}px solid ${BLUE}`
  const shadows: Array<string> = []

  const borderTop = outline.top ? selSide : rowIdx === 0 ? gridSide : 'none'
  const borderLeft = outline.left ? selSide : colIdx === 0 ? gridSide : 'none'
  let borderBottom = outline.bottom ? selSide : gridSide
  let borderRight = outline.right ? selSide : gridSide

  if (!outline.right && suppressRightGrid(rowIdx, colIdx, range)) {
    borderRight = 'none'
  }
  if (!outline.bottom && suppressBottomGrid(rowIdx, colIdx, range)) {
    borderBottom = 'none'
  }

  if (showOverlay) {
    if (!outline.bottom) {
      borderBottom = 'none'
    }
    if (!outline.right) {
      borderRight = 'none'
    }
    if (!outline.bottom && rowIdx < rowCount - 1) {
      shadows.push(`inset 0 -1px 0 0 ${BORDER}`)
    }
    if (!outline.right && colIdx < colCount - 1) {
      shadows.push(`inset -1px 0 0 0 ${BORDER}`)
    }
  }

  let background = isHeader ? HEADER_BG : 'var(--pt-plugin-table-bg)'
  if (showOverlay) {
    background = isHeader
      ? `linear-gradient(${SELECTED_BG}, ${SELECTED_BG}), ${HEADER_BG}`
      : SELECTED_BG
  }

  return {
    ...cornerRadius(rowIdx, colIdx, rowCount, colCount),
    borderTop,
    borderLeft,
    borderBottom,
    borderRight,
    boxShadow: shadows.length > 0 ? shadows.join(', ') : undefined,
    padding: CELL_PADDING,
    verticalAlign: 'top',
    background,
    fontWeight: isHeader ? HEADER_WEIGHT : 400,
    color: FG,
    wordBreak: 'break-word',
    ...(showOverlay ? {position: 'relative', zIndex: 1} : {}),
  }
}
