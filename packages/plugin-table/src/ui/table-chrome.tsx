import {
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type JSX,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import {createPortal} from 'react-dom'
import {EllipsisIcon, PanelTopIcon, TableIcon, Trash2Icon} from './icons'
import {BLUE, BORDER} from './table-cell-style'
import type {DragState} from './table-drag'
import {snapPxCenter, type TableMetrics} from './table-metrics'

// Top gutter holds the column handles + table menu.
const GUTTER_TOP = 20
// Reserved inside the component's own box so the row handles and boundary
// dots never overhang into space the host may clip (tight editable padding,
// or the scroll container in overflow mode).
const GUTTER_LEFT = 12
// The wrapper reserves its former top margin as padding for the same reason:
// the menu rides above the gutter and must stay inside the clipable box.
const WRAPPER_PAD_TOP = 20

const HANDLE_REST_ROW = {w: 3, h: 16}
const HANDLE_REST_COL = {w: 16, h: 3}
const HANDLE_BTN_ROW = {w: 12, h: 16}
const HANDLE_BTN_COL = {w: 16, h: 12}
const HANDLE_BTN_PAD = 3
const HANDLE_REST_BG = 'var(--pt-plugin-table-handle-rest)'
const HANDLE_HIT = 24
const HANDLE_EXPANDED_SHADOW = `inset 0 0 0 0.5px var(--pt-plugin-table-handle-ring), 0 0 0 1px ${BORDER}`
const HANDLE_EXPANDED_SHADOW_SELECTED =
  'inset 0 0 0 0.5px var(--pt-plugin-table-handle-ring), 0 0 0 1px var(--pt-plugin-table-handle-bg)'
const HANDLE_DOT = 2
const HANDLE_DOT_GAP = 2
const HANDLE_GREY = 'var(--pt-plugin-table-boundary-dot)'
const BOUNDARY_DOT = 4
const BOUNDARY_PLUS = 18
const GRID_LINE_HALF = 0.5
const INSERT_GUIDE = 1.5
const EXTEND_SIZE = 17
const EXTEND_GAP = 3
/** The reserved add-row / add-column lane: bar + gap. */
export const EXTEND_LANE = EXTEND_SIZE + EXTEND_GAP
const EXTEND_BAR_BG = 'var(--pt-plugin-table-lane-bg)'
const EXTEND_BAR_BG_HOVER = 'var(--pt-plugin-table-lane-bg-hover)'
const EXTEND_ICON = 'var(--pt-plugin-table-lane-icon)'
const EXTEND_ICON_HOVER = 'var(--pt-plugin-table-lane-icon-hover)'
const TRASH_SIZE = 26
const TRASH_GAP = 8
/** Above the toolbar and field chrome; delete must stay clickable. */
const TRASH_Z_INDEX = 10050

type BoundaryHover = {kind: 'row' | 'column'; index: number} | null

/** Vertical grid line at a column insert boundary (relative to the table). */
function colBorderX(metrics: TableMetrics, index: number): number {
  const {cols, width} = metrics
  if (index <= 0) {
    return snapPxCenter((cols[0]?.left ?? 0) + GRID_LINE_HALF)
  }
  if (index >= cols.length) {
    return snapPxCenter(width - GRID_LINE_HALF)
  }
  return snapPxCenter(cols[index].left - GRID_LINE_HALF)
}

/** Horizontal grid line at a row insert boundary (relative to the table). */
function rowBorderY(metrics: TableMetrics, index: number): number {
  const {rows, height} = metrics
  if (index <= 0) {
    return snapPxCenter(GRID_LINE_HALF)
  }
  if (index >= rows.length) {
    return snapPxCenter(height - GRID_LINE_HALF)
  }
  return snapPxCenter(rows[index].top - GRID_LINE_HALF)
}

export type HoverCell = {row: number; col: number} | null

export function TableChrome({
  metrics,
  active,
  hoverCell,
  selectedRow,
  selectedCol,
  onHandlePointerDown,
  drag,
  onInsertRow,
  onInsertCol,
}: {
  metrics: TableMetrics | null
  active: boolean
  hoverCell: HoverCell
  selectedRow: number | null
  selectedCol: number | null
  onHandlePointerDown: (
    kind: 'row' | 'column',
    index: number,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  drag: DragState | null
  onInsertRow: (boundary: number) => void
  onInsertCol: (boundary: number) => void
}): JSX.Element | null {
  const [boundary, setBoundary] = useState<BoundaryHover>(null)
  if (!metrics) {
    return null
  }
  const dragging = Boolean(drag?.active)
  const lastRow = metrics.rows.length - 1
  const lastCol = metrics.cols.length - 1
  return (
    // Chrome inside the contentEditable must be marked non-editable, or the
    // engine's DOM-point normalization treats it as content: an element-level
    // selection endpoint after the table then descends into a chrome button
    // instead of resolving to the table's last leaf.
    <div
      contentEditable={false}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
    >
      {/* The gutter is chrome territory, but structurally it is padding on
          an editable-context div, so browsers hit-test carets into it with
          divergent heuristics (some resolve to the table's document-order
          end). Swallow its clicks like every other chrome element does. */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: GUTTER_LEFT,
          width: metrics.width,
          height: GUTTER_TOP,
          pointerEvents: 'auto',
        }}
        onPointerDown={(event) => {
          event.preventDefault()
        }}
      />
      <ExtendBar
        label="Add row at end"
        visible={active && !dragging && hoverCell?.row === lastRow}
        style={{
          left: GUTTER_LEFT,
          top: GUTTER_TOP + metrics.height + EXTEND_GAP,
          width: metrics.width,
          height: EXTEND_SIZE,
        }}
        onClick={() => onInsertRow(metrics.rows.length)}
      />
      <ExtendBar
        label="Add column at end"
        visible={active && !dragging && hoverCell?.col === lastCol}
        style={{
          left: GUTTER_LEFT + metrics.width + EXTEND_GAP,
          top: GUTTER_TOP,
          width: EXTEND_SIZE,
          height: metrics.height,
        }}
        onClick={() => onInsertCol(metrics.cols.length)}
      />
      {metrics.cols.map((col, index) => (
        <Handle
          // biome-ignore lint/suspicious/noArrayIndexKey: positional by design; the index is the identity
          key={`col-${index}`}
          kind="column"
          x={GUTTER_LEFT + col.centerX}
          y={GUTTER_TOP}
          active={active}
          cellHot={hoverCell?.col === index}
          selected={selectedCol === index}
          dragging={dragging && drag?.kind === 'column'}
          onPointerDown={(event) => onHandlePointerDown('column', index, event)}
        />
      ))}
      {metrics.rows.map((row, index) => (
        <Handle
          // biome-ignore lint/suspicious/noArrayIndexKey: positional by design; the index is the identity
          key={`row-${index}`}
          kind="row"
          x={GUTTER_LEFT}
          y={GUTTER_TOP + row.centerY}
          active={active}
          cellHot={hoverCell?.row === index}
          selected={selectedRow === index}
          dragging={dragging && drag?.kind === 'row'}
          onPointerDown={(event) => onHandlePointerDown('row', index, event)}
        />
      ))}
      {drag?.active ? (
        <ReorderInsertLine
          metrics={metrics}
          kind={drag.kind}
          insertIndex={drag.insertIndex}
        />
      ) : null}
      {/* Internal boundaries only (between columns/rows); the edges are handled
          by the extend bars, matching the default prototype variant. */}
      {Array.from({length: Math.max(metrics.cols.length - 1, 0)}, (_, k) => {
        const index = k + 1
        return (
          <BoundaryControl
            key={`col-boundary-${index}`}
            x={GUTTER_LEFT + colBorderX(metrics, index)}
            y={GUTTER_TOP}
            visible={active && !dragging}
            hot={boundary?.kind === 'column' && boundary.index === index}
            onEnter={() => setBoundary({kind: 'column', index})}
            onLeave={() => setBoundary(null)}
            onInsert={() => onInsertCol(index)}
          />
        )
      })}
      {Array.from({length: Math.max(metrics.rows.length - 1, 0)}, (_, k) => {
        const index = k + 1
        return (
          <BoundaryControl
            key={`row-boundary-${index}`}
            x={GUTTER_LEFT}
            y={GUTTER_TOP + rowBorderY(metrics, index)}
            visible={active && !dragging}
            hot={boundary?.kind === 'row' && boundary.index === index}
            onEnter={() => setBoundary({kind: 'row', index})}
            onLeave={() => setBoundary(null)}
            onInsert={() => onInsertRow(index)}
          />
        )
      })}
      {active && boundary ? (
        <InsertGuideline metrics={metrics} hovered={boundary} />
      ) : null}
    </div>
  )
}

function ExtendBar({
  label,
  visible,
  style,
  onClick,
}: {
  label: string
  visible: boolean
  style: {left: number; top: number; width: number; height: number}
  onClick: () => void
}): JSX.Element {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      aria-label={label}
      tabIndex={visible ? 0 : -1}
      onPointerDown={(event) => {
        event.preventDefault()
        onClick()
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: 3,
        padding: 0,
        pointerEvents: visible ? 'auto' : 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 100ms ease, background 100ms ease',
        background: hovered ? EXTEND_BAR_BG_HOVER : EXTEND_BAR_BG,
        color: hovered ? EXTEND_ICON_HOVER : EXTEND_ICON,
        cursor: 'pointer',
        zIndex: 1,
      }}
    >
      <svg
        aria-hidden="true"
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
      >
        <path
          d="M7 2.5v9M2.5 7h9"
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinecap="round"
        />
      </svg>
    </button>
  )
}

function BoundaryControl({
  x,
  y,
  visible,
  hot,
  onEnter,
  onLeave,
  onInsert,
}: {
  x: number
  y: number
  visible: boolean
  hot: boolean
  onEnter: () => void
  onLeave: () => void
  onInsert: () => void
}): JSX.Element {
  const hit = 20
  return (
    <button
      type="button"
      aria-label="Insert here"
      tabIndex={visible ? 0 : -1}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onPointerDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onInsert()
      }}
      style={{
        position: 'absolute',
        left: x - hit / 2,
        top: y - hit / 2,
        width: hit,
        height: hit,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: visible ? 'auto' : 'none',
        cursor: 'pointer',
        zIndex: 6,
        border: 'none',
        background: 'transparent',
        padding: 0,
      }}
    >
      {hot ? (
        <div
          style={{
            width: BOUNDARY_PLUS,
            height: BOUNDARY_PLUS,
            borderRadius: '50%',
            background: BLUE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow:
              '0 1px 4px color-mix(in srgb, var(--pt-plugin-table-accent) 40%, transparent)',
          }}
        >
          <svg
            aria-hidden="true"
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
          >
            <path
              d="M5 1v8M1 5h8"
              stroke="var(--pt-plugin-table-accent-fg)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      ) : (
        <div
          style={{
            width: BOUNDARY_DOT,
            height: BOUNDARY_DOT,
            borderRadius: '50%',
            background: HANDLE_GREY,
            opacity: visible ? 1 : 0,
            transition: 'opacity 100ms ease',
          }}
        />
      )}
    </button>
  )
}

function InsertGuideline({
  metrics,
  hovered,
}: {
  metrics: TableMetrics
  hovered: NonNullable<BoundaryHover>
}): JSX.Element {
  if (hovered.kind === 'column') {
    return (
      <div
        style={{
          position: 'absolute',
          left: GUTTER_LEFT + colBorderX(metrics, hovered.index),
          top: GUTTER_TOP,
          width: INSERT_GUIDE,
          height: metrics.height,
          transform: 'translateX(-50%)',
          background: BLUE,
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />
    )
  }
  return (
    <div
      style={{
        position: 'absolute',
        left: GUTTER_LEFT,
        top: GUTTER_TOP + rowBorderY(metrics, hovered.index),
        width: metrics.width,
        height: INSERT_GUIDE,
        transform: 'translateY(-50%)',
        background: BLUE,
        pointerEvents: 'none',
        zIndex: 3,
      }}
    />
  )
}

function Handle({
  kind,
  x,
  y,
  active,
  cellHot,
  selected,
  dragging,
  onPointerDown,
}: {
  kind: 'row' | 'column'
  x: number
  y: number
  active: boolean
  cellHot: boolean
  selected: boolean
  dragging: boolean
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void
}): JSX.Element {
  const [hot, setHot] = useState(false)
  const isColumn = kind === 'column'
  const rest = isColumn ? HANDLE_REST_COL : HANDLE_REST_ROW
  const btn = isColumn ? HANDLE_BTN_COL : HANDLE_BTN_ROW
  const showRest = cellHot && !hot && !selected
  const showExpanded = hot || selected
  const lit = active && (cellHot || hot || selected)

  return (
    <button
      type="button"
      aria-label={isColumn ? 'Column handle' : 'Row handle'}
      tabIndex={lit ? 0 : -1}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        width: HANDLE_HIT,
        height: HANDLE_HIT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: lit ? 'auto' : 'none',
        opacity: lit ? 1 : 0,
        transition: 'opacity 100ms ease',
        cursor: dragging ? 'grabbing' : showExpanded ? 'grab' : 'pointer',
        zIndex: 5,
        border: 'none',
        background: 'transparent',
        padding: 0,
      }}
    >
      <div
        style={{
          width: showExpanded ? btn.w : rest.w,
          height: showExpanded ? btn.h : rest.h,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: showExpanded ? 4 : 3,
          padding: showExpanded ? HANDLE_BTN_PAD : 0,
          ...(showExpanded
            ? {
                background: selected
                  ? BLUE
                  : 'var(--pt-plugin-table-handle-bg)',
                boxShadow: selected
                  ? HANDLE_EXPANDED_SHADOW_SELECTED
                  : HANDLE_EXPANDED_SHADOW,
              }
            : showRest
              ? {
                  background: HANDLE_REST_BG,
                  boxShadow:
                    'inset 0 0 0 0.5px var(--pt-plugin-table-handle-ring)',
                }
              : {background: 'transparent'}),
        }}
      >
        {showExpanded ? (
          <DragDots isColumn={isColumn} selected={selected} />
        ) : null}
      </div>
    </button>
  )
}

function DragDots({
  isColumn,
  selected,
}: {
  isColumn: boolean
  selected: boolean
}): JSX.Element {
  return (
    <div
      aria-hidden
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${isColumn ? 3 : 2}, ${HANDLE_DOT}px)`,
        gap: HANDLE_DOT_GAP,
      }}
    >
      {Array.from({length: 6}, (_, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: positional by design; the index is the identity
          key={index}
          style={{
            width: HANDLE_DOT,
            height: HANDLE_DOT,
            borderRadius: '50%',
            background: selected
              ? 'var(--pt-plugin-table-accent-fg)'
              : 'var(--pt-plugin-table-handle-dots)',
          }}
        />
      ))}
    </div>
  )
}

type TrashLayout = {
  row: {left: number; top: number} | null
  col: {left: number; top: number} | null
}

/**
 * Row/column delete buttons in a top-level portal so they are never clipped
 * by the editable's scrollport. Fixed-positioned from the live table rect,
 * re-measured on resize and any scroll.
 */
export function TableTrashLayer({
  tableRef,
  metrics,
  selectedRow,
  selectedCol,
  canDeleteRow,
  canDeleteCol,
  onDeleteRow,
  onDeleteCol,
  portalElement,
  trashIcon,
}: {
  tableRef: RefObject<HTMLTableElement | null>
  metrics: TableMetrics | null
  selectedRow: number | null
  selectedCol: number | null
  canDeleteRow: boolean
  canDeleteCol: boolean
  onDeleteRow: (index: number) => void
  onDeleteCol: (index: number) => void
  /**
   * Where the layer portals. Hosts with their own portal/layer system (for
   * example Sanity Studio's document-panel portal) pass their element so the
   * chrome joins the host's stacking context and inherits its styling scope.
   */
  portalElement?: HTMLElement | null
  /** Replaces the built-in trash icon (host design systems pass their own). */
  trashIcon?: ReactNode
}): JSX.Element | null {
  const [layout, setLayout] = useState<TrashLayout | null>(null)

  const measure = useCallback(() => {
    const table = tableRef.current
    if (!table || !metrics) {
      setLayout(null)
      return
    }
    const rect = table.getBoundingClientRect()
    const next: TrashLayout = {row: null, col: null}
    if (selectedRow !== null && canDeleteRow && metrics.rows[selectedRow]) {
      const row = metrics.rows[selectedRow]
      const handleLeft = rect.left - HANDLE_BTN_ROW.w / 2
      next.row = {
        left: handleLeft - TRASH_GAP - TRASH_SIZE,
        top: rect.top + row.centerY,
      }
    }
    if (selectedCol !== null && canDeleteCol && metrics.cols[selectedCol]) {
      const col = metrics.cols[selectedCol]
      next.col = {
        left: rect.left + col.centerX,
        top: rect.top - HANDLE_BTN_COL.h / 2 - TRASH_GAP - TRASH_SIZE,
      }
    }
    setLayout(next)
  }, [tableRef, metrics, selectedRow, selectedCol, canDeleteRow, canDeleteCol])

  useLayoutEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [measure])

  if (!layout || (!layout.row && !layout.col)) {
    return null
  }

  return createPortal(
    <div className="pt-plugin-table-portal">
      {layout.row && selectedRow !== null ? (
        <TrashButton
          icon={trashIcon}
          label="Delete row"
          left={layout.row.left}
          top={layout.row.top}
          transform="translate(0, -50%)"
          onClick={() => onDeleteRow(selectedRow)}
        />
      ) : null}
      {layout.col && selectedCol !== null ? (
        <TrashButton
          icon={trashIcon}
          label="Delete column"
          left={layout.col.left}
          top={layout.col.top}
          transform="translate(-50%, 0)"
          onClick={() => onDeleteCol(selectedCol)}
        />
      ) : null}
    </div>,
    portalElement ?? document.body,
  )
}

function TrashButton({
  icon,
  label,
  left,
  top,
  transform,
  onClick,
}: {
  icon?: ReactNode
  label: string
  left: number
  top: number
  transform: string
  onClick: () => void
}): JSX.Element {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={(event) => {
        event.preventDefault()
        onClick()
      }}
      style={{
        fontSize: 15,
        position: 'fixed',
        left,
        top,
        transform,
        width: TRASH_SIZE,
        height: TRASH_SIZE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: hovered
          ? 'var(--pt-plugin-table-danger)'
          : 'var(--pt-plugin-table-trash-bg)',
        color: 'var(--pt-plugin-table-trash-fg)',
        border: 'none',
        borderRadius: 4,
        padding: 0,
        cursor: 'pointer',
        zIndex: TRASH_Z_INDEX,
        transition: 'background 100ms ease',
      }}
    >
      {icon ?? <Trash2Icon size={14} />}
    </button>
  )
}

const MENU_BTN = 25
const MENU_MIN_WIDTH = 200
const MENU_Z_INDEX = 10100
const MENU_ABOVE_GAP = 2

/**
 * Plugin-owned positioning for a consumer-rendered table menu (the
 * `renderMenu` slot): anchored top-right like the built-in menu, bottom edge
 * sitting just above the table's top edge regardless of the widget's height,
 * revealed on table hover or while the consumer reports the menu open.
 */
export function TableMenuAnchor({
  right,
  visible,
  children,
}: {
  right: number
  visible: boolean
  children: ReactNode
}): JSX.Element {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: preventing default on pointerdown keeps the editor focused; interaction lives on the consumer's widget
    <div
      contentEditable={false}
      onPointerDown={(event) => {
        // Keep DOM focus in the editable; a focus steal here would blur the
        // editor and hide the chrome mid-interaction.
        event.preventDefault()
      }}
      style={{
        position: 'absolute',
        right,
        top: WRAPPER_PAD_TOP + GUTTER_TOP - MENU_ABOVE_GAP,
        transform: 'translateY(-100%)',
        pointerEvents: visible ? 'auto' : 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 100ms ease',
        zIndex: 6,
      }}
    >
      {children}
    </div>
  )
}

export type TableMenuHandlers = {
  hasHeader: boolean
  onToggleHeader: () => void
  onSelectTable: () => void
  onDeleteTable: () => void
}

/**
 * The table-level `...` menu: trigger tight to the table's top edge, top-right,
 * fading in on table hover; dropdown portaled to document.body so it never
 * clips or scrolls the editable.
 */
export function TableMenu({
  right,
  active,
  handlers,
  portalElement,
}: {
  /** Distance from the wrapper's right edge; pins the trigger to the scrollport when the table overflows. */
  right: number
  active: boolean
  handlers: TableMenuHandlers
  /** See {@link TableTrashLayer}'s `portalElement`. */
  portalElement?: HTMLElement | null
}): JSX.Element {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [menuPos, setMenuPos] = useState<{left: number; top: number} | null>(
    null,
  )

  const syncMenuPos = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) {
      return
    }
    setMenuPos({left: rect.right - MENU_MIN_WIDTH, top: rect.bottom + 6})
  }, [])

  useLayoutEffect(() => {
    if (!open) {
      return
    }
    syncMenuPos()
    window.addEventListener('resize', syncMenuPos)
    window.addEventListener('scroll', syncMenuPos, true)
    return () => {
      window.removeEventListener('resize', syncMenuPos)
      window.removeEventListener('scroll', syncMenuPos, true)
    }
  }, [open, syncMenuPos])

  useLayoutEffect(() => {
    if (!open) {
      return
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (
        target instanceof Node &&
        (menuRef.current?.contains(target) ||
          triggerRef.current?.contains(target))
      ) {
        return
      }
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const visible = active || open

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        contentEditable={false}
        aria-label="Table options"
        aria-haspopup="menu"
        aria-expanded={open}
        tabIndex={visible ? 0 : -1}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onPointerDown={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen((wasOpen) => !wasOpen)
        }}
        style={{
          position: 'absolute',
          right,
          top: WRAPPER_PAD_TOP + GUTTER_TOP - MENU_BTN - MENU_ABOVE_GAP,
          width: MENU_BTN,
          height: MENU_BTN,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          borderRadius: 3,
          padding: 0,
          background: open
            ? 'var(--pt-plugin-table-lane-bg-hover)'
            : hovered
              ? 'var(--pt-plugin-table-header-bg)'
              : 'transparent',
          color: 'var(--pt-plugin-table-fg)',
          cursor: 'pointer',
          pointerEvents: visible ? 'auto' : 'none',
          opacity: visible ? 1 : 0,
          transition: 'opacity 100ms ease, background 100ms ease',
          zIndex: 6,
        }}
      >
        <EllipsisIcon size={20} />
      </button>
      {open && menuPos
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="pt-plugin-table-portal"
              style={{
                position: 'fixed',
                left: menuPos.left,
                top: menuPos.top,
                width: MENU_MIN_WIDTH,
                background: 'var(--pt-plugin-table-menu-bg)',
                border: '1px solid var(--pt-plugin-table-menu-border)',
                borderRadius: 'var(--pt-plugin-table-radius)',
                padding: 5,
                zIndex: MENU_Z_INDEX,
              }}
            >
              <MenuRow
                label="Header row"
                icon={<PanelTopIcon size={16} />}
                trailing={<ToggleSwitch checked={handlers.hasHeader} />}
                onClick={handlers.onToggleHeader}
              />
              <MenuRow
                label="Select table"
                icon={<TableIcon size={16} />}
                onClick={() => {
                  setOpen(false)
                  handlers.onSelectTable()
                }}
              />
              <MenuRow
                label="Delete table"
                icon={<Trash2Icon size={16} />}
                destructive
                onClick={() => {
                  setOpen(false)
                  handlers.onDeleteTable()
                }}
              />
            </div>,
            portalElement ?? document.body,
          )
        : null}
    </>
  )
}

function MenuRow({
  label,
  icon,
  trailing,
  destructive,
  onClick,
}: {
  label: string
  icon: JSX.Element
  trailing?: JSX.Element
  destructive?: boolean
  onClick: () => void
}): JSX.Element {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      role="menuitem"
      // Act on click but keep DOM focus in the editable; a focus steal here
      // leaves the editor caret-less after the menu (or the table) unmounts.
      onPointerDown={(event) => event.preventDefault()}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '8px 10px',
        border: 'none',
        background: hovered
          ? 'var(--pt-plugin-table-menu-hover)'
          : 'transparent',
        cursor: 'pointer',
        borderRadius: 4,
        textAlign: 'left',
        fontSize: 13,
        color: destructive
          ? 'var(--pt-plugin-table-danger)'
          : 'var(--pt-plugin-table-fg)',
      }}
    >
      <span
        style={{
          width: 21,
          height: 21,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{flex: 1, whiteSpace: 'nowrap'}}>{label}</span>
      {trailing}
    </button>
  )
}

function ToggleSwitch({checked}: {checked: boolean}): JSX.Element {
  return (
    // The row button carries the label and click; the switch is decorative.
    <span
      aria-hidden="true"
      style={{
        width: 28,
        height: 16,
        borderRadius: 8,
        padding: 2,
        background: checked
          ? 'var(--pt-plugin-table-toggle-track-on)'
          : 'var(--pt-plugin-table-toggle-track)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: checked ? 'flex-end' : 'flex-start',
        flexShrink: 0,
        transition: 'background 100ms ease',
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: 'var(--pt-plugin-table-toggle-knob)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
        }}
      />
    </span>
  )
}

/** IX15: insertion line while dragging to reorder. */
function ReorderInsertLine({
  metrics,
  kind,
  insertIndex,
}: {
  metrics: TableMetrics
  kind: 'row' | 'column'
  insertIndex: number
}): JSX.Element {
  if (kind === 'column') {
    return (
      <div
        style={{
          position: 'absolute',
          left: GUTTER_LEFT + colBorderX(metrics, insertIndex),
          top: GUTTER_TOP,
          width: INSERT_GUIDE,
          height: metrics.height,
          transform: 'translateX(-50%)',
          background: BLUE,
          pointerEvents: 'none',
          zIndex: 12,
        }}
      />
    )
  }
  return (
    <div
      style={{
        position: 'absolute',
        left: GUTTER_LEFT,
        top: GUTTER_TOP + rowBorderY(metrics, insertIndex),
        width: metrics.width,
        height: INSERT_GUIDE,
        transform: 'translateY(-50%)',
        background: BLUE,
        pointerEvents: 'none',
        zIndex: 12,
      }}
    />
  )
}

const GHOST_SHADOW =
  '0 10px 32px rgba(0, 0, 0, 0.14), 0 2px 6px rgba(0, 0, 0, 0.06)'

/** IX15: the lifted row/column follows the pointer as a solid preview. */
export function ReorderGhost({
  drag,
  metrics,
  hasHeader,
  cellTexts,
}: {
  drag: DragState | null
  metrics: TableMetrics | null
  hasHeader: boolean
  cellTexts: Array<string> | null
}): JSX.Element | null {
  if (!drag?.active || !metrics || !cellTexts) {
    return null
  }
  const left = drag.clientX - drag.grabOffsetX
  const top = drag.clientY - drag.grabOffsetY

  if (drag.kind === 'row') {
    const rowMetrics = metrics.rows[drag.index]
    if (!rowMetrics) {
      return null
    }
    const isHeader = hasHeader && drag.index === 0
    return (
      <div
        contentEditable={false}
        style={{
          position: 'fixed',
          left,
          top,
          width: metrics.width,
          height: rowMetrics.height,
          display: 'flex',
          pointerEvents: 'none',
          zIndex: 10000,
          borderRadius: 'var(--pt-plugin-table-radius)',
          border: `1px solid ${BORDER}`,
          background: isHeader
            ? 'var(--pt-plugin-table-header-bg)'
            : 'var(--pt-plugin-table-bg)',
          boxShadow: GHOST_SHADOW,
          overflow: 'hidden',
          fontWeight: isHeader ? 600 : 400,
        }}
      >
        {metrics.cols.map((col, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: positional by design; the index is the identity
            key={index}
            style={{
              width: col.width,
              padding: '8px 12px',
              borderRight:
                index < metrics.cols.length - 1
                  ? `1px solid ${BORDER}`
                  : 'none',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            {cellTexts[index]}
          </div>
        ))}
      </div>
    )
  }

  const colMetrics = metrics.cols[drag.index]
  if (!colMetrics) {
    return null
  }
  return (
    <div
      contentEditable={false}
      style={{
        position: 'fixed',
        left,
        top,
        width: colMetrics.width,
        height: metrics.height,
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: 'none',
        zIndex: 10000,
        borderRadius: 'var(--pt-plugin-table-radius)',
        border: `1px solid ${BORDER}`,
        background: 'var(--pt-plugin-table-bg)',
        boxShadow: GHOST_SHADOW,
        overflow: 'hidden',
      }}
    >
      {metrics.rows.map((row, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: positional by design; the index is the identity
          key={index}
          style={{
            height: row.height,
            padding: '8px 12px',
            borderBottom:
              index < metrics.rows.length - 1 ? `1px solid ${BORDER}` : 'none',
            background:
              hasHeader && index === 0
                ? 'var(--pt-plugin-table-header-bg)'
                : undefined,
            fontWeight: hasHeader && index === 0 ? 600 : 400,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {cellTexts[index]}
        </div>
      ))}
    </div>
  )
}

/** Left/right fade hints over the scrollport edges when the table overflows. */
export function TableScrollFade({
  left,
  right,
}: {
  left: boolean
  right: boolean
}): JSX.Element | null {
  if (!left && !right) {
    return null
  }
  const fadeBase = {
    position: 'absolute' as const,
    top: WRAPPER_PAD_TOP + GUTTER_TOP,
    bottom: EXTEND_SIZE + EXTEND_GAP + 12,
    width: 36,
    pointerEvents: 'none' as const,
    zIndex: 7,
  }
  return (
    <>
      {left ? (
        <div
          contentEditable={false}
          aria-hidden="true"
          style={{
            ...fadeBase,
            left: 0,
            background:
              'linear-gradient(to right, var(--pt-plugin-table-bg) 0%, transparent 100%)',
          }}
        />
      ) : null}
      {right ? (
        <div
          contentEditable={false}
          aria-hidden="true"
          style={{
            ...fadeBase,
            right: 0,
            background:
              'linear-gradient(to left, var(--pt-plugin-table-bg) 0%, transparent 100%)',
          }}
        />
      ) : null}
    </>
  )
}
