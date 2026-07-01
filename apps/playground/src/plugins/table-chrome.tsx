import {useState, type JSX} from 'react'
import {BLUE, BORDER} from './table-cell-style'
import type {TableMetrics} from './table-metrics'

// Top gutter holds the column handles + table menu. No left gutter: the table
// is flush and the row handles overhang into the editable's own padding.
export const GUTTER_TOP = 20
export const GUTTER_LEFT = 0

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

export type HoverCell = {row: number; col: number} | null

export function TableChrome({
  metrics,
  active,
  hoverCell,
  selectedRow,
  selectedCol,
  onSelectRow,
  onSelectCol,
}: {
  metrics: TableMetrics | null
  active: boolean
  hoverCell: HoverCell
  selectedRow: number | null
  selectedCol: number | null
  onSelectRow: (index: number) => void
  onSelectCol: (index: number) => void
}): JSX.Element | null {
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
    </>
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
    <div
      role="button"
      aria-label={isColumn ? 'Column handle' : 'Row handle'}
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
    </div>
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
