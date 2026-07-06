import {
  useEditor,
  useEditorSelector,
  type ContainerRenderProps,
  type EditorSnapshot,
  type Path,
} from '@portabletext/editor'
import {
  getBlock,
  getChildren,
  getEnclosingBlock,
  getFirstChild,
  getParent,
  getText,
} from '@portabletext/editor/traversal'
import {getBlockStartPoint, isEqualPaths} from '@portabletext/editor/utils'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type JSX,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import {isCell, isRow, isTable, type TableSelection} from '../behaviors/types'

/**
 * What the `renderMenu` slot receives: the menu's state and actions. The
 * widget itself (trigger, popover, items) is entirely consumer-rendered.
 *
 * @alpha
 */
export type TableMenuProps = TableMenuHandlers & {
  /** Report the widget's open state so the anchor stays visible while open. */
  onOpenChange: (open: boolean) => void
}
import {getTableSelection} from '../get-table-selection'
import {cellStyle, type CellRange} from './table-cell-style'
import {
  EXTEND_LANE,
  ReorderGhost,
  TableChrome,
  TableMenu,
  TableMenuAnchor,
  TableScrollFade,
  TableTrashLayer,
  type HoverCell,
  type TableMenuHandlers,
} from './table-chrome'
import {useTableDragReorder} from './table-drag'
import {useTableMetrics} from './table-metrics'
import {
  MIN_COL_PX,
  SCROLL_PADDING_BOTTOM,
  useScrollFade,
  useTableHorizontalLayout,
} from './table-overflow'
import {reorderIndex} from './table-reorder'

// The source row/column dims while it's being drag-reordered; cells read this
// to know whether they're part of the lifted row/column.
const TableDragContext = createContext<{
  kind: 'row' | 'column'
  index: number
} | null>(null)

/**
 * The reference render for the `table` container: chrome (handles, lanes,
 * menu, trash, drag ghost), scroll handling, and selection visuals around the
 * editable `<table>`. Wire it into the container registration:
 *
 * ```tsx
 * defineContainer({
 *   type: 'table',
 *   arrayField: 'rows',
 *   render: (props) => <TableContainer {...props} />,
 *   of: [...],
 * })
 * ```
 *
 * @alpha
 */
export function TableContainer({
  attributes,
  children,
  node,
  path,
  portalElement,
  renderMenu,
  icons,
}: ContainerRenderProps & {
  /**
   * Where the menu and trash layer portal (default `document.body`). Hosts
   * with their own portal/layer system pass their element so the chrome
   * joins the host's stacking context and inherits its styling scope.
   */
  portalElement?: HTMLElement | null
  /**
   * Replaces the built-in table menu with a consumer-rendered widget (for
   * example a host design system's menu button). The plugin keeps ownership
   * of the anchor position and hover reveal; report the widget's open state
   * through `onOpenChange` so the anchor stays visible while open.
   */
  renderMenu?: (props: TableMenuProps) => ReactNode
  /**
   * Replaces the built-in drawn icons with the host design system's
   * (currently the row/column trash chip; the menu's icons travel with
   * `renderMenu`).
   */
  icons?: {trash?: ReactNode}
}): JSX.Element {
  const editor = useEditor()
  const table = isTable(node) ? node : undefined
  const rowCount = table?.rows.length ?? 0
  const columnCount = table?.rows[0]?.cells.length ?? 0
  const tableRef = useRef<HTMLTableElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const metrics = useTableMetrics(tableRef, `${rowCount}x${columnCount}`)
  const scrollWide = useTableHorizontalLayout(
    scrollRef,
    columnCount,
    `${rowCount}x${columnCount}`,
  )
  const fade = useScrollFade(scrollRef, `${rowCount}x${columnCount}`)
  const [active, setActive] = useState(false)
  const [hoverCell, setHoverCell] = useState<HoverCell>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const readOnly = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )

  const tableSelection = useEditorSelector(
    editor,
    (snapshot) => {
      const selection = getTableSelection(snapshot)
      return selection && isEqualPaths(selection.tablePath, path)
        ? selection
        : null
    },
    isEqualTableSelection,
  )
  const hasCellRange = tableSelection !== null
  // A selected row/column is a range spanning exactly one row/column edge to
  // edge; that's when its handle shows as selected.
  const selectedRow =
    tableSelection &&
    tableSelection.rowRange[0] === tableSelection.rowRange[1] &&
    tableSelection.colRange[0] === 0 &&
    tableSelection.colRange[1] === columnCount - 1
      ? tableSelection.rowRange[0]
      : null
  const selectedCol =
    tableSelection &&
    tableSelection.colRange[0] === tableSelection.colRange[1] &&
    tableSelection.rowRange[0] === 0 &&
    tableSelection.rowRange[1] === rowCount - 1
      ? tableSelection.colRange[0]
      : null

  const selectCells = useCallback(
    (anchorCellPath: Path, focusCellPath: Path) => {
      const snapshot = editor.getSnapshot()
      const anchor = cellStartPoint(snapshot, anchorCellPath)
      const focus = cellStartPoint(snapshot, focusCellPath)
      if (anchor && focus) {
        editor.send({type: 'select', at: {anchor, focus}})
      }
    },
    [editor],
  )
  const selectRow = (index: number) => {
    const snapshot = editor.getSnapshot()
    const row = getChildren(snapshot, path).at(index)
    const cells = row ? getChildren(snapshot, row.path) : []
    const first = cells.at(0)
    const last = cells.at(-1)
    if (first && last) {
      selectCells(first.path, last.path)
    }
  }
  const selectCol = (index: number) => {
    const snapshot = editor.getSnapshot()
    const rows = getChildren(snapshot, path)
    const firstRow = rows.at(0)
    const lastRow = rows.at(-1)
    const first = firstRow && getChildren(snapshot, firstRow.path).at(index)
    const last = lastRow && getChildren(snapshot, lastRow.path).at(index)
    if (first && last) {
      selectCells(first.path, last.path)
    }
  }
  // The plugin's insert behaviors resolve `at` via `getEnclosingBlock`, so a
  // path inside the reference cell (its first block) is all they need.
  const insertRow = (boundary: number) => {
    const snapshot = editor.getSnapshot()
    const rows = getChildren(snapshot, path)
    const referenceRow = rows.at(Math.min(boundary, rows.length - 1))
    const referenceCell =
      referenceRow && getChildren(snapshot, referenceRow.path).at(0)
    const insideCell =
      referenceCell && getFirstChild(snapshot, referenceCell.path)
    if (insideCell) {
      editor.send({
        type: 'custom.insert.row',
        at: insideCell.path,
        position: boundary < rows.length ? 'before' : 'after',
      })
    }
  }
  const insertCol = (boundary: number) => {
    const snapshot = editor.getSnapshot()
    const firstRow = getChildren(snapshot, path).at(0)
    const cells = firstRow ? getChildren(snapshot, firstRow.path) : []
    const referenceCell = cells.at(Math.min(boundary, cells.length - 1))
    const insideCell =
      referenceCell && getFirstChild(snapshot, referenceCell.path)
    if (insideCell) {
      editor.send({
        type: 'custom.insert.column',
        at: insideCell.path,
        position: boundary < cells.length ? 'before' : 'after',
      })
    }
  }

  const hasHeader = (Number(table?.headerRows) || 0) >= 1
  const toggleHeader = () => {
    editor.send({
      type: 'block.set',
      at: path,
      props: {headerRows: hasHeader ? 0 : 1},
    })
  }
  const selectTable = useCallback(() => {
    const snapshot = editor.getSnapshot()
    const rows = getChildren(snapshot, path)
    const firstRow = rows.at(0)
    const lastRow = rows.at(-1)
    const first = firstRow && getChildren(snapshot, firstRow.path).at(0)
    const last = lastRow && getChildren(snapshot, lastRow.path).at(-1)
    if (first && last) {
      selectCells(first.path, last.path)
    }
  }, [editor, path, selectCells])
  const deleteTable = () => {
    const snapshot = editor.getSnapshot()
    const firstRow = getChildren(snapshot, path).at(0)
    const cell = firstRow && getChildren(snapshot, firstRow.path).at(0)
    const insideCell = cell && getFirstChild(snapshot, cell.path)
    if (insideCell) {
      editor.send({type: 'custom.unset.table', at: insideCell.path})
    }
  }

  const deleteRow = (index: number) => {
    const snapshot = editor.getSnapshot()
    const row = getChildren(snapshot, path).at(index)
    const cell = row && getChildren(snapshot, row.path).at(0)
    const insideCell = cell && getFirstChild(snapshot, cell.path)
    if (insideCell) {
      editor.send({type: 'custom.unset.row', at: insideCell.path})
    }
  }
  const deleteCol = (index: number) => {
    const snapshot = editor.getSnapshot()
    const firstRow = getChildren(snapshot, path).at(0)
    const cell = firstRow && getChildren(snapshot, firstRow.path).at(index)
    const insideCell = cell && getFirstChild(snapshot, cell.path)
    if (insideCell) {
      editor.send({type: 'custom.unset.column', at: insideCell.path})
    }
  }

  const commitRowDrag = (from: number, insertBefore: number) => {
    const finalIndex = reorderIndex(from, insertBefore)
    if (finalIndex === from) {
      return
    }
    const snapshot = editor.getSnapshot()
    const rows = getChildren(snapshot, path)
    const origin = rows.at(from)
    const destination = rows.at(finalIndex)
    if (origin && destination) {
      editor.send({
        type: 'custom.move.row',
        at: origin.path,
        to: destination.path,
      })
    }
  }
  const commitColDrag = (from: number, insertBefore: number) => {
    const finalIndex = reorderIndex(from, insertBefore)
    if (finalIndex === from) {
      return
    }
    const snapshot = editor.getSnapshot()
    const firstRow = getChildren(snapshot, path).at(0)
    const cells = firstRow ? getChildren(snapshot, firstRow.path) : []
    const origin = cells.at(from)
    const destination = cells.at(finalIndex)
    if (origin && destination) {
      editor.send({
        type: 'custom.move.column',
        at: origin.path,
        to: destination.path,
      })
    }
  }

  const {drag, onHandlePointerDown} = useTableDragReorder({
    tableRef,
    metrics,
    onCommitRow: commitRowDrag,
    onCommitCol: commitColDrag,
    onSelectRow: selectRow,
    onSelectCol: selectCol,
  })

  // Primitive projections keep the memos below ref-stable across pointermoves
  // (the drag object changes identity on every move) while matching the
  // dependencies the React Compiler infers.
  const activeDragKind = drag?.active ? drag.kind : null
  const activeDragIndex = drag?.active ? drag.index : null
  const dragKind = drag?.kind ?? null
  const dragIndex = drag?.index ?? null

  const dragContextValue = useMemo(
    () =>
      activeDragKind !== null && activeDragIndex !== null
        ? {kind: activeDragKind, index: activeDragIndex}
        : null,
    [activeDragKind, activeDragIndex],
  )

  // The lifted row/column's cell texts, for the drag ghost.
  const ghostCellTexts = useMemo(() => {
    if (dragKind === null || dragIndex === null) {
      return null
    }
    const snapshot = editor.getSnapshot()
    const rows = getChildren(snapshot, path)
    if (dragKind === 'row') {
      const row = rows.at(dragIndex)
      if (!row) {
        return null
      }
      return getChildren(snapshot, row.path).map(
        (cell) => getText(snapshot, cell.path) ?? '',
      )
    }
    return rows.map((row) => {
      const cell = getChildren(snapshot, row.path).at(dragIndex)
      return cell ? (getText(snapshot, cell.path) ?? '') : ''
    })
  }, [dragKind, dragIndex, editor, path])

  const onMouseMove = (event: ReactMouseEvent) => {
    const rect = tableRef.current?.getBoundingClientRect()
    if (!rect || !metrics) {
      return
    }
    const relY = event.clientY - rect.top
    const relX = event.clientX - rect.left
    let row = metrics.rows.findIndex(
      (candidate) =>
        relY >= candidate.top && relY < candidate.top + candidate.height,
    )
    let col = metrics.cols.findIndex(
      (candidate) =>
        relX >= candidate.left && relX < candidate.left + candidate.width,
    )
    // The extend lanes below/right of the table count as their edge
    // row/column, so the add bars are reachable directly (approaching from
    // outside the table) instead of only via the last row/column's cells.
    const lastRow = metrics.rows.at(-1)
    if (
      row === -1 &&
      lastRow &&
      relY >= lastRow.top &&
      relY <= metrics.height + EXTEND_LANE
    ) {
      row = metrics.rows.length - 1
    }
    const lastCol = metrics.cols.at(-1)
    if (
      col === -1 &&
      lastCol &&
      relX >= lastCol.left &&
      relX <= metrics.width + EXTEND_LANE
    ) {
      col = metrics.cols.length - 1
    }
    setHoverCell(row >= 0 && col >= 0 ? {row, col} : null)
  }

  return (
    // The render-props `attributes` land on their own element: hosts style
    // their block wrappers (Studio pads its PT blocks), and the chrome's
    // geometry (relative positioning, gutter padding) must not share an
    // element with styles it cannot control.
    <div {...attributes}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: mouse events only reveal the hover chrome; all interaction lives on the chrome's buttons */}
      <div
        className="pt-plugin-table-chrome"
        onMouseEnter={() => setActive(true)}
        onMouseLeave={() => {
          setActive(false)
          setHoverCell(null)
        }}
        onMouseMove={onMouseMove}
      >
        <div
          ref={scrollRef}
          className="pt-plugin-table-scroll"
          style={{
            overflowX: scrollWide ? 'auto' : undefined,
            paddingBottom: scrollWide ? SCROLL_PADDING_BOTTOM : undefined,
          }}
        >
          <div
            className="pt-plugin-table-inner"
            style={{
              position: 'relative',
              // Gutters: top for the column handles, right/bottom lanes for the
              // extend bars. The chrome is absolute in here so it scrolls with
              // the table.
              padding: '20px 20px 20px 12px',
              width: scrollWide ? columnCount * MIN_COL_PX + 32 : undefined,
            }}
          >
            <table
              ref={tableRef}
              className="pt-plugin-table"
              data-cell-range={hasCellRange ? '' : undefined}
            >
              {/* Leafless subtrees derail the engine's DOM-point
                normalization; mark them non-editable so it skips them. */}
              <colgroup contentEditable={false}>
                {Array.from({length: columnCount}, (_, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: positional by design; the index is the identity
                  <col key={index} />
                ))}
              </colgroup>
              <tbody>
                <TableDragContext.Provider value={dragContextValue}>
                  {children}
                </TableDragContext.Provider>
              </tbody>
            </table>
            {readOnly ? null : (
              <TableChrome
                metrics={metrics}
                active={active}
                hoverCell={hoverCell}
                selectedRow={selectedRow}
                selectedCol={selectedCol}
                onHandlePointerDown={onHandlePointerDown}
                drag={drag}
                onInsertRow={insertRow}
                onInsertCol={insertCol}
              />
            )}
          </div>
        </div>
        {readOnly ? null : (
          <ReorderGhost
            drag={drag}
            metrics={metrics}
            hasHeader={hasHeader}
            cellTexts={ghostCellTexts}
          />
        )}
        {readOnly ? null : renderMenu ? (
          <TableMenuAnchor
            right={scrollWide ? 0 : 20}
            visible={active || menuOpen}
          >
            {renderMenu({
              hasHeader,
              onToggleHeader: toggleHeader,
              onSelectTable: selectTable,
              onDeleteTable: deleteTable,
              onOpenChange: setMenuOpen,
            })}
          </TableMenuAnchor>
        ) : (
          <TableMenu
            right={scrollWide ? 0 : 20}
            active={active}
            portalElement={portalElement}
            handlers={{
              hasHeader,
              onToggleHeader: toggleHeader,
              onSelectTable: selectTable,
              onDeleteTable: deleteTable,
            }}
          />
        )}
        <TableScrollFade left={fade.left} right={fade.right} />
        {readOnly ? null : (
          <TableTrashLayer
            tableRef={tableRef}
            metrics={metrics}
            portalElement={portalElement}
            trashIcon={icons?.trash}
            selectedRow={selectedRow}
            selectedCol={selectedCol}
            canDeleteRow={rowCount > 1}
            canDeleteCol={columnCount > 1}
            onDeleteRow={deleteRow}
            onDeleteCol={deleteCol}
          />
        )}
      </div>
    </div>
  )
}

/**
 * The reference render for the `row` container.
 *
 * @alpha
 */
export function TableRow({
  attributes,
  children,
  selected,
}: ContainerRenderProps): JSX.Element {
  return (
    <tr {...attributes} data-selected={selected ? '' : undefined}>
      {children}
    </tr>
  )
}

type CellDescriptor = {
  rowIdx: number
  colIdx: number
  rowCount: number
  colCount: number
  isHeader: boolean
  range: CellRange | null
}

/**
 * The reference render for the `cell` container. Cells read the derived
 * `getTableSelection` (a rectangle) and draw the grey grid + selection
 * outline + overlay per cell. Position and header state come from resolving
 * the cell -> row -> table by path.
 *
 * @alpha
 */
export function TableCell({
  attributes,
  children,
  path,
}: ContainerRenderProps): JSX.Element {
  const editor = useEditor()
  const descriptor = useEditorSelector(
    editor,
    (snapshot): CellDescriptor | null => {
      const cell = getEnclosingBlock(snapshot, path, {match: isCell})
      const row = cell && getParent(snapshot, cell.path, {match: isRow})
      const table = row && getParent(snapshot, row.path, {match: isTable})
      if (!cell || !row || !table) {
        return null
      }
      const rowIdx = table.node.rows.findIndex(
        (candidate) => candidate._key === row.node._key,
      )
      const colIdx = row.node.cells.findIndex(
        (candidate) => candidate._key === cell.node._key,
      )
      const selection = getTableSelection(snapshot)
      const range =
        selection && isEqualPaths(selection.tablePath, table.path)
          ? {
              r0: selection.rowRange[0],
              r1: selection.rowRange[1],
              c0: selection.colRange[0],
              c1: selection.colRange[1],
            }
          : null
      return {
        rowIdx,
        colIdx,
        rowCount: table.node.rows.length,
        colCount: table.node.rows[0]?.cells.length ?? 0,
        isHeader: (Number(table.node.headerRows) || 0) >= 1 && rowIdx === 0,
        range,
      }
    },
    isEqualCellDescriptor,
  )
  const dragContext = useContext(TableDragContext)
  const dimmed =
    descriptor !== null &&
    dragContext !== null &&
    (dragContext.kind === 'row'
      ? descriptor.rowIdx === dragContext.index
      : descriptor.colIdx === dragContext.index)
  const style = useMemo(
    () => (descriptor ? cellStyle(descriptor) : undefined),
    [descriptor],
  )
  return (
    <td {...attributes} style={dimmed ? {...style, opacity: 0.35} : style}>
      {children}
    </td>
  )
}

/** The point at the start of a cell's first block. */
function cellStartPoint(snapshot: EditorSnapshot, cellPath: Path) {
  const firstChild = getFirstChild(snapshot, cellPath)
  const block = firstChild && getBlock(snapshot, firstChild.path)
  if (!block) {
    return null
  }
  return getBlockStartPoint({context: snapshot.context, block})
}

function isEqualTableSelection(
  a: TableSelection | null,
  b: TableSelection | null,
): boolean {
  if (a === b) {
    return true
  }
  if (!a || !b) {
    return false
  }
  return (
    a.rowRange[0] === b.rowRange[0] &&
    a.rowRange[1] === b.rowRange[1] &&
    a.colRange[0] === b.colRange[0] &&
    a.colRange[1] === b.colRange[1] &&
    isEqualPaths(a.tablePath, b.tablePath)
  )
}

function isEqualCellDescriptor(
  a: CellDescriptor | null,
  b: CellDescriptor | null,
): boolean {
  if (a === b) {
    return true
  }
  if (!a || !b) {
    return false
  }
  return (
    a.rowIdx === b.rowIdx &&
    a.colIdx === b.colIdx &&
    a.rowCount === b.rowCount &&
    a.colCount === b.colCount &&
    a.isHeader === b.isHeader &&
    isEqualCellRange(a.range, b.range)
  )
}

function isEqualCellRange(a: CellRange | null, b: CellRange | null): boolean {
  if (a === b) {
    return true
  }
  if (!a || !b) {
    return false
  }
  return a.r0 === b.r0 && a.r1 === b.r1 && a.c0 === b.c0 && a.c1 === b.c1
}
