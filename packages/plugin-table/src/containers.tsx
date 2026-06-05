import {
  defineContainer,
  useEditor,
  useEditorSelector,
  type ContainerRender,
  type EditorSnapshot,
  type Path,
  type PortableTextBlock,
} from '@portabletext/editor'
import {getEnclosingBlock} from '@portabletext/editor/traversal'
import {isKeyedSegment} from '@portabletext/editor/utils'
import {
  createContext,
  useContext,
  type CSSProperties,
  type ReactElement,
} from 'react'
import {isTable} from './behaviors/types'
import {getTableSelection} from './derivation'

/**
 * Which sides of a cell are perimeter edges of the rectangular
 * selection the cell belongs to. Cells in the interior of the
 * rectangle have all four edges false; cells on the rectangle's border
 * have one to four edges true.
 *
 * @alpha
 */
export type CellEdges = {
  top: boolean
  right: boolean
  bottom: boolean
  left: boolean
}

const EMPTY_MAP: ReadonlyMap<string, CellEdges> = new Map()

const SelectedCellsContext =
  createContext<ReadonlyMap<string, CellEdges>>(EMPTY_MAP)

/**
 * The default table render: a `<table>` wrapper with selection-derived
 * data attributes. Consumers can wrap or replace this via the
 * `components.Table` prop on `<TablePlugin>`.
 *
 * @alpha
 */
export const defaultTableRender: ContainerRender = ({
  attributes,
  children,
  node,
  path,
}) => (
  <TableRender attributes={attributes} node={node} path={path}>
    {children}
  </TableRender>
)

/**
 * The default row render: a bare `<tr>`. Consumers can wrap or replace
 * via the `components.Row` prop on `<TablePlugin>`.
 *
 * @alpha
 */
export const defaultRowRender: ContainerRender = ({attributes, children}) => (
  <tr {...attributes}>{children}</tr>
)

/**
 * The default cell render: a `<td>` that subscribes to its enclosing
 * table's selected-cells map. Consumers can wrap or replace via the
 * `components.Cell` prop on `<TablePlugin>`.
 *
 * @alpha
 */
export const defaultCellRender: ContainerRender = ({
  attributes,
  children,
  path,
}) => (
  <CellRender attributes={attributes} path={path}>
    {children}
  </CellRender>
)

/**
 * Per-kind renders consumers can pass to `<TablePlugin>` to wrap or
 * replace the plugin's defaults. Each render receives `renderDefault`
 * pointing at the plugin's default for that kind, not the engine
 * default — calling `renderDefault(props)` from a wrapper renders the
 * plugin's chrome verbatim.
 *
 * @alpha
 */
export type TableComponents = {
  Table?: ContainerRender
  Row?: ContainerRender
  Cell?: ContainerRender
}

/**
 * Builds the table/row/cell container registration. Consumer-supplied
 * renders in `components` wrap or replace the plugin defaults; omitted
 * keys use the plugin defaults directly.
 *
 * @alpha
 */
export function buildTableContainer(components: TableComponents = {}) {
  return defineContainer({
    type: 'table',
    arrayField: 'rows',
    render: components.Table
      ? (props) =>
          components.Table!({...props, renderDefault: defaultTableRender})
      : defaultTableRender,
    of: [
      defineContainer({
        type: 'row',
        arrayField: 'cells',
        render: components.Row
          ? (props) =>
              components.Row!({...props, renderDefault: defaultRowRender})
          : defaultRowRender,
        of: [
          defineContainer({
            type: 'cell',
            arrayField: 'content',
            render: components.Cell
              ? (props) =>
                  components.Cell!({...props, renderDefault: defaultCellRender})
              : defaultCellRender,
          }),
        ],
      }),
    ],
  })
}

function TableRender(props: {
  attributes: Record<string, unknown>
  children: ReactElement
  node: PortableTextBlock
  path: Path
}) {
  const editor = useEditor()
  const selectedCells = useEditorSelector(
    editor,
    (snapshot) => selectSelectedCells(snapshot, props.path),
    compareSelectedCells,
  )
  const headerRow = isTable(props.node) && props.node.headerRow === true
  return (
    <SelectedCellsContext.Provider value={selectedCells}>
      <table
        {...props.attributes}
        data-pt-plugin-table-selected={selectedCells.size > 0 || undefined}
        data-pt-plugin-table-header-row={headerRow || undefined}
      >
        <tbody>{props.children}</tbody>
      </table>
    </SelectedCellsContext.Provider>
  )
}

function CellRender(props: {
  attributes: Record<string, unknown>
  children: ReactElement
  path: Path
}) {
  const edges = useTableCellSelectionEdges(props.path)
  const style = selectionBorderStyle(edges)
  return (
    <td
      {...props.attributes}
      data-pt-plugin-table-selected={edges ? '' : undefined}
      data-pt-plugin-table-selected-edge-top={edges?.top ? '' : undefined}
      data-pt-plugin-table-selected-edge-right={edges?.right ? '' : undefined}
      data-pt-plugin-table-selected-edge-bottom={edges?.bottom ? '' : undefined}
      data-pt-plugin-table-selected-edge-left={edges?.left ? '' : undefined}
      style={style}
    >
      {props.children}
    </td>
  )
}

/**
 * Inline CSS for a cell's perimeter sides of the rectangular selection.
 *
 * Each selected perimeter side becomes a 2px blue border; the other
 * sides stay at the cell's default border. Inline styles beat the
 * cascade (including header-row rules), so the outline paints cleanly
 * regardless of what consumer CSS targets the table.
 *
 * Returns `undefined` for cells outside any active rectangular
 * selection, so React strips the `style` attribute entirely instead of
 * forcing a no-op recompute.
 *
 * @alpha
 */
export function selectionBorderStyle(
  edges: CellEdges | undefined,
): CSSProperties | undefined {
  if (!edges) {
    return undefined
  }
  const blue = 'rgb(85, 107, 252)'
  const style: CSSProperties = {}
  if (edges.top) {
    style.borderTopColor = blue
    style.borderTopWidth = 1.5
  }
  if (edges.right) {
    style.borderRightColor = blue
    style.borderRightWidth = 1.5
  }
  if (edges.bottom) {
    style.borderBottomColor = blue
    style.borderBottomWidth = 1.5
  }
  if (edges.left) {
    style.borderLeftColor = blue
    style.borderLeftWidth = 1.5
  }
  return style
}

/**
 * Returns which sides of the cell at `path` are perimeter edges of the
 * current rectangular table selection - or `undefined` if the cell is
 * not part of any rectangular selection right now.
 *
 * Consumers that replace the default Cell render still want the
 * selection chrome the plugin provides; this hook lets them subscribe
 * to the same per-table edge map the default render does.
 *
 * @alpha
 */
export function useTableCellSelectionEdges(path: Path): CellEdges | undefined {
  const selectedCells = useContext(SelectedCellsContext)
  const cellSegment = path.at(-1)
  return isKeyedSegment(cellSegment)
    ? selectedCells.get(cellSegment._key)
    : undefined
}

function selectSelectedCells(
  snapshot: EditorSnapshot,
  tablePath: Path,
): ReadonlyMap<string, CellEdges> {
  const tableSelection = getTableSelection(snapshot)
  if (!tableSelection) {
    return EMPTY_MAP
  }
  if (firstKey(tableSelection.tablePath) !== firstKey(tablePath)) {
    return EMPTY_MAP
  }
  const table = getEnclosingBlock(snapshot, tablePath, {match: isTable})
  if (!table) {
    return EMPTY_MAP
  }
  const cells = new Map<string, CellEdges>()
  const [rowStart, rowEnd] = tableSelection.rowRange
  const [colStart, colEnd] = tableSelection.colRange
  for (let r = rowStart; r <= rowEnd; r++) {
    const row = table.node.rows[r]
    if (!row) {
      continue
    }
    for (let c = colStart; c <= colEnd; c++) {
      const cell = row.cells[c]
      if (!cell) {
        continue
      }
      cells.set(cell._key, {
        top: r === rowStart,
        right: c === colEnd,
        bottom: r === rowEnd,
        left: c === colStart,
      })
    }
  }
  return cells
}

function compareSelectedCells(
  a: ReadonlyMap<string, CellEdges>,
  b: ReadonlyMap<string, CellEdges>,
): boolean {
  if (a === b) {
    return true
  }
  if (a.size !== b.size) {
    return false
  }
  for (const [key, edgesA] of a) {
    const edgesB = b.get(key)
    if (
      !edgesB ||
      edgesA.top !== edgesB.top ||
      edgesA.right !== edgesB.right ||
      edgesA.bottom !== edgesB.bottom ||
      edgesA.left !== edgesB.left
    ) {
      return false
    }
  }
  return true
}

function firstKey(path: Path): string | undefined {
  const segment = path[0]
  return isKeyedSegment(segment) ? segment._key : undefined
}
