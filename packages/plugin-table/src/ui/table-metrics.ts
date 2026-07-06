import {useLayoutEffect, useState, type RefObject} from 'react'

/** Round to device pixels so 1px borders and small dots stay crisp. */
function snapPx(px: number): number {
  if (typeof window === 'undefined') {
    return px
  }
  const dpr = window.devicePixelRatio || 1
  return Math.round(px * dpr) / dpr
}

/**
 * Snap to the nearest device-pixel *center*. A 1px grid line rasterizes
 * centered on a device pixel, so chrome that must sit on the line (boundary
 * dots, insert guides) snaps to the same lattice; snapping to pixel edges
 * instead leaves it visibly off by up to half a device pixel.
 */
export function snapPxCenter(px: number): number {
  if (typeof window === 'undefined') {
    return px
  }
  const dpr = window.devicePixelRatio || 1
  return (Math.round(px * dpr - 0.5) + 0.5) / dpr
}

export type TableMetrics = {
  width: number
  height: number
  rows: Array<{top: number; height: number; centerY: number}>
  cols: Array<{left: number; width: number; centerX: number}>
}

/**
 * Measures row centers and column centers relative to the `<table>` box so
 * chrome can be pinned to the real border lines (not a guessed CSS grid).
 * Ported from the design prototype's `useTableMetrics`.
 */
export function useTableMetrics(
  tableRef: RefObject<HTMLTableElement | null>,
  revision: string,
): TableMetrics | null {
  const [metrics, setMetrics] = useState<TableMetrics | null>(null)

  useLayoutEffect(() => {
    const table = tableRef.current
    if (!table) {
      return
    }

    const measure = () => {
      const rect = table.getBoundingClientRect()
      const trs = [...table.querySelectorAll('tbody tr')]
      const firstRowCells = trs[0]?.querySelectorAll('td') ?? []

      const rows = trs.map((tr) => {
        const r = tr.getBoundingClientRect()
        const top = snapPx(r.top - rect.top)
        const height = snapPx(r.height)
        return {top, height, centerY: snapPx(top + height / 2)}
      })

      const cols = [...firstRowCells].map((td) => {
        const c = td.getBoundingClientRect()
        const left = snapPx(c.left - rect.left)
        const width = snapPx(c.width)
        return {left, width, centerX: snapPx(left + width / 2)}
      })

      setMetrics({
        width: snapPx(rect.width),
        height: snapPx(rect.height),
        rows,
        cols,
      })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(table)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [tableRef, revision])

  return metrics
}
