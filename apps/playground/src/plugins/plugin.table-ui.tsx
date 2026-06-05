import {
  useEditor,
  type ContainerRender,
  type Path,
  type PortableTextBlock,
} from '@portabletext/editor'
import {isKeyedSegment} from '@portabletext/editor/utils'
import {
  defaultCellRender,
  defaultRowRender,
  defaultTableRender,
  TablePlugin,
} from '@portabletext/plugin-table'
import {GripHorizontalIcon, GripVerticalIcon} from 'lucide-react'
import {createContext, useContext} from 'react'
import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from 'react-aria-components'

type Cell = {_key: string}
type Row = PortableTextBlock & {_key: string; cells: ReadonlyArray<Cell>}
type TableNode = PortableTextBlock & {rows: ReadonlyArray<Row>}

type TableMeta = {firstRowKey: string | null; rowCount: number}
const TableMetaCtx = createContext<TableMeta>({firstRowKey: null, rowCount: 0})
const RowKeyCtx = createContext<{
  rowPath: Path
  cellKeys: ReadonlyArray<string>
} | null>(null)

/**
 * Playground table UI: wraps the table/row/cell renders to add per-row
 * and per-column affordances that dispatch the plugin's existing
 * insert/unset behaviors. The first row is always treated as the header
 * row — its row handle disables row insertion above and deletion so the
 * header stays in place.
 *
 * Handles are anchored inside the cells they control — row handle in
 * the first cell of each row, column handle in each cell of the first
 * row — and the action menu uses `react-aria-components` for portal
 * rendering, focus management, and keyboard navigation.
 */
export function PlaygroundTablePlugin() {
  return (
    <TablePlugin
      components={{
        Table: PlaygroundTableRender,
        Row: PlaygroundRowRender,
        Cell: PlaygroundCellRender,
      }}
    />
  )
}

const PlaygroundTableRender: ContainerRender = (props) => {
  const table = props.node as TableNode
  const firstRowKey = table.rows.at(0)?._key ?? null
  const rowCount = table.rows.length
  return (
    <TableMetaCtx.Provider value={{firstRowKey, rowCount}}>
      {defaultTableRender(props)}
    </TableMetaCtx.Provider>
  )
}

const PlaygroundRowRender: ContainerRender = (props) => {
  const row = props.node as Row
  return (
    <RowKeyCtx.Provider
      value={{
        rowPath: props.path,
        cellKeys: row.cells.map((cell) => cell._key),
      }}
    >
      {defaultRowRender(props)}
    </RowKeyCtx.Provider>
  )
}

const PlaygroundCellRender: ContainerRender = (props) => {
  const rowCtx = useContext(RowKeyCtx)
  const {firstRowKey, rowCount} = useContext(TableMetaCtx)
  const cellSegment = props.path.at(-1)
  const rowSegment = props.path.at(-3)
  if (!rowCtx || !isKeyedSegment(cellSegment) || !isKeyedSegment(rowSegment)) {
    return defaultCellRender(props)
  }
  const isFirstCellInRow = rowCtx.cellKeys[0] === cellSegment._key
  const isFirstRowInTable =
    firstRowKey !== null && rowSegment._key === firstRowKey
  const columnCount = rowCtx.cellKeys.length

  return (
    <td {...props.attributes} className="pt-plugin-table-ui__cell">
      {isFirstCellInRow ? (
        <RowHandle
          rowPath={rowCtx.rowPath}
          isHeaderRow={isFirstRowInTable}
          canDelete={rowCount > 1 && !isFirstRowInTable}
        />
      ) : null}
      {isFirstRowInTable ? (
        <ColumnHandle cellPath={props.path} canDelete={columnCount > 1} />
      ) : null}
      <div className="pt-plugin-table-ui__cell-content">{props.children}</div>
    </td>
  )
}

type ActionKey = string

function RowHandle(props: {
  rowPath: Path
  canDelete: boolean
  isHeaderRow: boolean
}) {
  const editor = useEditor()
  const handleAction = (key: ActionKey) => {
    if (key === 'insert-above') {
      editor.send({
        type: 'custom.insert.row',
        at: props.rowPath,
        position: 'before',
      })
    } else if (key === 'insert-below') {
      editor.send({
        type: 'custom.insert.row',
        at: props.rowPath,
        position: 'after',
      })
    } else if (key === 'delete') {
      editor.send({type: 'custom.unset.row', at: props.rowPath})
    }
  }
  return (
    <MenuTrigger>
      <Button
        aria-label="Row actions"
        className="pt-plugin-table-ui__row-handle"
        excludeFromTabOrder
        onPress={(event) => event.continuePropagation()}
      >
        <GripVerticalIcon size={14} />
      </Button>
      <Popover className="pt-plugin-table-ui__popover" placement="bottom start">
        <Menu
          className="pt-plugin-table-ui__menu"
          onAction={(key) => handleAction(String(key))}
        >
          <MenuItem
            id="insert-above"
            className="pt-plugin-table-ui__menu-item"
            isDisabled={props.isHeaderRow}
          >
            Insert row above
          </MenuItem>
          <MenuItem id="insert-below" className="pt-plugin-table-ui__menu-item">
            Insert row below
          </MenuItem>
          <MenuItem
            id="delete"
            className="pt-plugin-table-ui__menu-item"
            isDisabled={!props.canDelete}
          >
            Delete row
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  )
}

function ColumnHandle(props: {cellPath: Path; canDelete: boolean}) {
  const editor = useEditor()
  const handleAction = (key: ActionKey) => {
    if (key === 'insert-left') {
      editor.send({
        type: 'custom.insert.column',
        at: props.cellPath,
        position: 'before',
      })
    } else if (key === 'insert-right') {
      editor.send({
        type: 'custom.insert.column',
        at: props.cellPath,
        position: 'after',
      })
    } else if (key === 'delete') {
      editor.send({type: 'custom.unset.column', at: props.cellPath})
    }
  }
  return (
    <MenuTrigger>
      <Button
        aria-label="Column actions"
        className="pt-plugin-table-ui__column-handle"
        excludeFromTabOrder
        onPress={(event) => event.continuePropagation()}
      >
        <GripHorizontalIcon size={14} />
      </Button>
      <Popover className="pt-plugin-table-ui__popover" placement="bottom start">
        <Menu
          className="pt-plugin-table-ui__menu"
          onAction={(key) => handleAction(String(key))}
        >
          <MenuItem id="insert-left" className="pt-plugin-table-ui__menu-item">
            Insert column left
          </MenuItem>
          <MenuItem id="insert-right" className="pt-plugin-table-ui__menu-item">
            Insert column right
          </MenuItem>
          <MenuItem
            id="delete"
            className="pt-plugin-table-ui__menu-item"
            isDisabled={!props.canDelete}
          >
            Delete column
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  )
}
