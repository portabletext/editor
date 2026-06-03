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
import {createContext, useContext, type ReactElement} from 'react'
import {isTable} from './behaviors/types'
import {getTableSelection} from './derivation'

const EMPTY_SET: ReadonlySet<string> = new Set()

const SelectedCellKeysContext = createContext<ReadonlySet<string>>(EMPTY_SET)

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
 * table's selected-cells set. Consumers can wrap or replace via the
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
  const selectedCellKeys = useEditorSelector(
    editor,
    (snapshot) => selectSelectedCellKeys(snapshot, props.path),
    compareSelectedCellKeys,
  )
  const headerRow = isTable(props.node) && props.node.headerRow === true
  return (
    <SelectedCellKeysContext.Provider value={selectedCellKeys}>
      <table
        {...props.attributes}
        data-pt-plugin-table-selected={selectedCellKeys.size > 0 || undefined}
        data-pt-plugin-table-header-row={headerRow || undefined}
      >
        <tbody>{props.children}</tbody>
      </table>
    </SelectedCellKeysContext.Provider>
  )
}

function CellRender(props: {
  attributes: Record<string, unknown>
  children: ReactElement
  path: Path
}) {
  const selectedCellKeys = useContext(SelectedCellKeysContext)
  const cellSegment = props.path.at(-1)
  const isSelected =
    isKeyedSegment(cellSegment) && selectedCellKeys.has(cellSegment._key)
  return (
    <td
      {...props.attributes}
      data-pt-plugin-table-selected={isSelected || undefined}
    >
      {props.children}
    </td>
  )
}

function selectSelectedCellKeys(
  snapshot: EditorSnapshot,
  tablePath: Path,
): ReadonlySet<string> {
  const tableSelection = getTableSelection(snapshot)
  if (!tableSelection) {
    return EMPTY_SET
  }
  if (firstKey(tableSelection.tablePath) !== firstKey(tablePath)) {
    return EMPTY_SET
  }
  const table = getEnclosingBlock(snapshot, tablePath, {match: isTable})
  if (!table) {
    return EMPTY_SET
  }
  const keys = new Set<string>()
  const [rowStart, rowEnd] = tableSelection.rowRange
  const [colStart, colEnd] = tableSelection.colRange
  for (let r = rowStart; r <= rowEnd; r++) {
    const row = table.node.rows[r]
    if (!row) {
      continue
    }
    for (let c = colStart; c <= colEnd; c++) {
      const cell = row.cells[c]
      if (cell) {
        keys.add(cell._key)
      }
    }
  }
  return keys
}

function compareSelectedCellKeys(
  a: ReadonlySet<string>,
  b: ReadonlySet<string>,
): boolean {
  if (a === b) {
    return true
  }
  if (a.size !== b.size) {
    return false
  }
  for (const key of a) {
    if (!b.has(key)) {
      return false
    }
  }
  return true
}

function firstKey(path: Path): string | undefined {
  const segment = path[0]
  return isKeyedSegment(segment) ? segment._key : undefined
}
