import {useState, type JSX} from 'react'
import {BLUE, BORDER} from './table-cell-style'
import {snapPx, type TableMetrics} from './table-metrics'

// Top gutter holds the column handles + table menu. No left gutter: the table
// is flush and the row handles overhang into the editable's own padding.
const GUTTER_TOP = 20
const GUTTER_LEFT = 0

const HANDLE_REST_ROW = {w: 3, h: 16}
const HANDLE_REST_COL = {w: 16, h: 3}
const HANDLE_BTN_ROW = {w: 12, h: 16}
const HANDLE_BTN_COL = {w: 16, h: 12}
const HANDLE_BTN_PAD = 3
const HANDLE_REST_BG = '#bbbdc9'
const HANDLE_HIT = 24
const HANDLE_EXPANDED_SHADOW = `inset 0 0 0 0.5px rgba(255,255,255,0.9), 0 0 0 1px ${BORDER}`
const HANDLE_EXPANDED_SHADOW_SELECTED =
  'inset 0 0 0 0.5px rgba(255,255,255,0.9), 0 0 0 1px #fff'
const HANDLE_DOT = 2
const HANDLE_DOT_GAP = 2
const HANDLE_GREY = '#c1c4ca'
const BOUNDARY_DOT = 4
const BOUNDARY_PLUS = 17
const GRID_LINE_HALF = 0.5
const INSERT_GUIDE = 1.5

type BoundaryHover = {kind: 'row' | 'column'; index: number} | null

/** Vertical grid line at a column insert boundary (relative to the table). */
function colBorderX(metrics: TableMetrics, index: number): number {
  const {cols, width} = metrics
  if (index <= 0) {
    return snapPx((cols[0]?.left ?? 0) + GRID_LINE_HALF)
  }
  if (index >= cols.length) {
    return snapPx(width - GRID_LINE_HALF)
  }
  return snapPx(cols[index].left - GRID_LINE_HALF)
}

/** Horizontal grid line at a row insert boundary (relative to the table). */
function rowBorderY(metrics: TableMetrics, index: number): number {
  const {rows, height} = metrics
  if (index <= 0) {
    return snapPx(GRID_LINE_HALF)
  }
  if (index >= rows.length) {
    return snapPx(height - GRID_LINE_HALF)
  }
  return snapPx(rows[index].top - GRID_LINE_HALF)
}

export type HoverCell = {row: number; col: number} | null

export function TableChrome({
  metrics,
  active,
  hoverCell,
  selectedRow,
  selectedCol,
  onSelectRow,
  onSelectCol,
  onInsertRow,
  onInsertCol,
}: {
  metrics: TableMetrics | null
  active: boolean
  hoverCell: HoverCell
  selectedRow: number | null
  selectedCol: number | null
  onSelectRow: (index: number) => void
  onSelectCol: (index: number) => void
  onInsertRow: (boundary: number) => void
  onInsertCol: (boundary: number) => void
}): JSX.Element | null {
  const [boundary, setBoundary] = useState<BoundaryHover>(null)
  if (!metrics) {
    return null
  }
  return (
    <>
      {metrics.cols.map((col, index) => (
        <Handle
          key={`col-${index}`}
          kind="column"
          x={GUTTER_LEFT + col.centerX}
          y={GUTTER_TOP}
          active={active}
          cellHot={hoverCell?.col === index}
          selected={selectedCol === index}
          onSelect={() => onSelectCol(index)}
        />
      ))}
      {metrics.rows.map((row, index) => (
        <Handle
          key={`row-${index}`}
          kind="row"
          x={GUTTER_LEFT}
          y={GUTTER_TOP + row.centerY}
          active={active}
          cellHot={hoverCell?.row === index}
          selected={selectedRow === index}
          onSelect={() => onSelectRow(index)}
        />
      ))}
      {/* Internal boundaries only (between columns/rows); the edges are handled
          by the extend bars, matching the default prototype variant. */}
      {Array.from({length: Math.max(metrics.cols.length - 1, 0)}, (_, k) => {
        const index = k + 1
        return (
          <BoundaryControl
            key={`col-boundary-${index}`}
            x={GUTTER_LEFT + colBorderX(metrics, index)}
            y={GUTTER_TOP}
            visible={active}
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
            visible={active}
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
    </>
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
            boxShadow: '0 1px 4px rgba(85,107,252,0.4)',
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
              stroke="#fff"
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
  onSelect,
}: {
  kind: 'row' | 'column'
  x: number
  y: number
  active: boolean
  cellHot: boolean
  selected: boolean
  onSelect: () => void
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
      onPointerDown={(event) => {
        event.preventDefault()
        onSelect()
      }}
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
        cursor: showExpanded ? 'grab' : 'pointer',
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
                background: selected ? BLUE : '#fff',
                boxShadow: selected
                  ? HANDLE_EXPANDED_SHADOW_SELECTED
                  : HANDLE_EXPANDED_SHADOW,
              }
            : showRest
              ? {
                  background: HANDLE_REST_BG,
                  boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.7)',
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
          key={index}
          style={{
            width: HANDLE_DOT,
            height: HANDLE_DOT,
            borderRadius: '50%',
            background: selected ? '#fff' : '#8a8f99',
          }}
        />
      ))}
    </div>
  )
}
