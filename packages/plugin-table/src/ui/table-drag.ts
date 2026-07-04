import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import type {TableMetrics} from './table-metrics'
import {
  computeColInsertIndex,
  computeGhostGrabOffset,
  computeRowInsertIndex,
  DRAG_THRESHOLD_PX,
} from './table-reorder'

export type DragState = {
  kind: 'row' | 'column'
  index: number
  startX: number
  startY: number
  clientX: number
  clientY: number
  grabOffsetX: number
  grabOffsetY: number
  active: boolean
  insertIndex: number
  pointerId: number
}

/**
 * Pointer-driven row/column reorder from a handle (IX15, B5). Below the 4px
 * threshold a pointer-up is a click and selects; past it the drag tracks the
 * nearest insert boundary and commits on drop.
 */
export function useTableDragReorder({
  tableRef,
  metrics,
  onCommitRow,
  onCommitCol,
  onSelectRow,
  onSelectCol,
}: {
  tableRef: RefObject<HTMLTableElement | null>
  metrics: TableMetrics | null
  onCommitRow: (from: number, insertBefore: number) => void
  onCommitCol: (from: number, insertBefore: number) => void
  onSelectRow: (index: number) => void
  onSelectCol: (index: number) => void
}): {
  drag: DragState | null
  onHandlePointerDown: (
    kind: 'row' | 'column',
    index: number,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  isDragging: boolean
} {
  const sessionRef = useRef<DragState | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)

  const endSession = useCallback(() => {
    sessionRef.current = null
    setDrag(null)
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
  }, [])

  const onHandlePointerDown = useCallback(
    (
      kind: 'row' | 'column',
      index: number,
      event: ReactPointerEvent<HTMLButtonElement>,
    ) => {
      if (event.button !== 0) {
        return
      }
      event.preventDefault()
      event.stopPropagation()

      const target = event.currentTarget
      target.setPointerCapture(event.pointerId)

      const tableRect = tableRef.current?.getBoundingClientRect() ?? null
      const {grabOffsetX, grabOffsetY} = computeGhostGrabOffset(
        kind,
        index,
        event.clientX,
        event.clientY,
        tableRect,
        metrics,
      )

      sessionRef.current = {
        kind,
        index,
        startX: event.clientX,
        startY: event.clientY,
        clientX: event.clientX,
        clientY: event.clientY,
        grabOffsetX,
        grabOffsetY,
        active: false,
        insertIndex: index,
        pointerId: event.pointerId,
      }
      setDrag({...sessionRef.current})
      document.body.style.userSelect = 'none'

      const onMove = (moveEvent: PointerEvent) => {
        const session = sessionRef.current
        if (!session || moveEvent.pointerId !== session.pointerId) {
          return
        }
        const dx = moveEvent.clientX - session.startX
        const dy = moveEvent.clientY - session.startY
        const active = session.active || Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX

        const table = tableRef.current
        let insertIndex = session.insertIndex
        if (active && table && metrics) {
          const rect = table.getBoundingClientRect()
          insertIndex =
            session.kind === 'row'
              ? computeRowInsertIndex(moveEvent.clientY, rect, metrics.rows)
              : computeColInsertIndex(moveEvent.clientX, rect, metrics.cols)
        }

        sessionRef.current = {
          ...session,
          active,
          clientX: moveEvent.clientX,
          clientY: moveEvent.clientY,
          insertIndex,
        }
        setDrag({...sessionRef.current})

        if (active) {
          document.body.style.cursor = 'grabbing'
        }
      }

      const onUp = (upEvent: PointerEvent) => {
        const session = sessionRef.current
        if (!session || upEvent.pointerId !== session.pointerId) {
          return
        }
        try {
          target.releasePointerCapture(session.pointerId)
        } catch {
          // already released
        }

        if (session.active) {
          if (session.kind === 'row') {
            onCommitRow(session.index, session.insertIndex)
          } else {
            onCommitCol(session.index, session.insertIndex)
          }
        } else if (session.kind === 'row') {
          onSelectRow(session.index)
        } else {
          onSelectCol(session.index)
        }

        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
        endSession()
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    },
    [
      tableRef,
      metrics,
      onCommitRow,
      onCommitCol,
      onSelectRow,
      onSelectCol,
      endSession,
    ],
  )

  useEffect(() => () => endSession(), [endSession])

  return {drag, onHandlePointerDown, isDragging: Boolean(drag?.active)}
}
