import type {TableMetrics} from './table-metrics'

/** B5: movement before drag; below threshold, pointer-up = select only. */
export const DRAG_THRESHOLD_PX = 4

/** Pointer offset from ghost top-left, keeps the cursor anchored where the handle was grabbed. */
export function computeGhostGrabOffset(
  kind: 'row' | 'column',
  index: number,
  clientX: number,
  clientY: number,
  tableRect: DOMRect | null,
  metrics: TableMetrics | null,
): {grabOffsetX: number; grabOffsetY: number} {
  if (!tableRect || !metrics) {
    return {grabOffsetX: 0, grabOffsetY: 0}
  }
  if (kind === 'row') {
    const rowMetrics = metrics.rows[index]
    if (!rowMetrics) {
      return {grabOffsetX: 0, grabOffsetY: 0}
    }
    return {
      grabOffsetX: clientX - tableRect.left,
      grabOffsetY: clientY - (tableRect.top + rowMetrics.top),
    }
  }
  const colMetrics = metrics.cols[index]
  if (!colMetrics) {
    return {grabOffsetX: 0, grabOffsetY: 0}
  }
  return {
    grabOffsetX: clientX - (tableRect.left + colMetrics.left),
    grabOffsetY: clientY - tableRect.top,
  }
}

/** The row boundary (0..rows.length) nearest to the pointer. */
export function computeRowInsertIndex(
  clientY: number,
  tableRect: DOMRect,
  rows: TableMetrics['rows'],
): number {
  if (rows.length === 0) {
    return 0
  }
  const y = clientY - tableRect.top
  const lastRow = rows[rows.length - 1]
  const boundaries = [
    ...rows.map((row) => row.top),
    lastRow.top + lastRow.height,
  ]
  return nearestBoundary(y, boundaries)
}

/** The column boundary (0..cols.length) nearest to the pointer. */
export function computeColInsertIndex(
  clientX: number,
  tableRect: DOMRect,
  cols: TableMetrics['cols'],
): number {
  if (cols.length === 0) {
    return 0
  }
  const x = clientX - tableRect.left
  const lastCol = cols[cols.length - 1]
  const boundaries = [
    ...cols.map((col) => col.left),
    lastCol.left + lastCol.width,
  ]
  return nearestBoundary(x, boundaries)
}

function nearestBoundary(position: number, boundaries: Array<number>): number {
  let nearest = 0
  let best = Number.POSITIVE_INFINITY
  boundaries.forEach((boundary, index) => {
    const distance = Math.abs(position - boundary)
    if (distance < best) {
      best = distance
      nearest = index
    }
  })
  return nearest
}

/** The final index of the item after dropping it before `insertBefore`. */
export function reorderIndex(from: number, insertBefore: number): number {
  if (insertBefore === from || insertBefore === from + 1) {
    return from
  }
  return insertBefore > from ? insertBefore - 1 : insertBefore
}
