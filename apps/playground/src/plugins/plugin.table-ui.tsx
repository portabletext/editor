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
import {createContext, useContext, useEffect, useState} from 'react'
import {createPortal} from 'react-dom'

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
 * insert/unset behaviors. Handles are anchored inside the cells they
 * control — row handle in the first cell of each row, column handle in
 * each cell of the first row — and the open menu portals to
 * `document.body` to escape any `overflow: hidden` on table wrappers.
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

type MenuAction = {label: string; onSelect: () => void; disabled?: boolean}

function RowHandle(props: {
  rowPath: Path
  canDelete: boolean
  isHeaderRow: boolean
}) {
  const editor = useEditor()
  const actions: ReadonlyArray<MenuAction> = [
    {
      label: 'Insert row above',
      onSelect: () =>
        editor.send({
          type: 'custom.insert.row',
          at: props.rowPath,
          position: 'before',
        }),
      disabled: props.isHeaderRow,
    },
    {
      label: 'Insert row below',
      onSelect: () =>
        editor.send({
          type: 'custom.insert.row',
          at: props.rowPath,
          position: 'after',
        }),
    },
    {
      label: 'Delete row',
      onSelect: () =>
        editor.send({type: 'custom.unset.row', at: props.rowPath}),
      disabled: !props.canDelete,
    },
  ]
  return (
    <Handle
      className="pt-plugin-table-ui__row-handle"
      label="Row actions"
      actions={actions}
    >
      <GripVerticalIcon size={14} />
    </Handle>
  )
}

function ColumnHandle(props: {cellPath: Path; canDelete: boolean}) {
  const editor = useEditor()
  const actions: ReadonlyArray<MenuAction> = [
    {
      label: 'Insert column left',
      onSelect: () =>
        editor.send({
          type: 'custom.insert.column',
          at: props.cellPath,
          position: 'before',
        }),
    },
    {
      label: 'Insert column right',
      onSelect: () =>
        editor.send({
          type: 'custom.insert.column',
          at: props.cellPath,
          position: 'after',
        }),
    },
    {
      label: 'Delete column',
      onSelect: () =>
        editor.send({type: 'custom.unset.column', at: props.cellPath}),
      disabled: !props.canDelete,
    },
  ]
  return (
    <Handle
      className="pt-plugin-table-ui__column-handle"
      label="Column actions"
      actions={actions}
    >
      <GripHorizontalIcon size={14} />
    </Handle>
  )
}

function Handle(props: {
  className: string
  label: string
  actions: ReadonlyArray<MenuAction>
  children: React.ReactNode
}) {
  const [menu, setMenu] = useState<{anchorRect: DOMRect} | null>(null)
  return (
    <>
      <button
        type="button"
        aria-label={props.label}
        aria-haspopup="menu"
        aria-expanded={menu !== null}
        contentEditable={false}
        className={props.className}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          setMenu((current) =>
            current
              ? null
              : {anchorRect: event.currentTarget.getBoundingClientRect()},
          )
        }}
      >
        {props.children}
      </button>
      {menu ? (
        <PortalMenu
          anchorRect={menu.anchorRect}
          actions={props.actions}
          onClose={() => setMenu(null)}
        />
      ) : null}
    </>
  )
}

function PortalMenu(props: {
  anchorRect: DOMRect
  actions: ReadonlyArray<MenuAction>
  onClose: () => void
}) {
  const {anchorRect, actions, onClose} = props

  useEffect(() => {
    function handleDocumentMouseDown(event: MouseEvent) {
      const target = event.target as Node | null
      if (!target) {
        return
      }
      const menu = document.querySelector('[data-pt-plugin-table-ui-menu]')
      if (menu && menu.contains(target)) {
        return
      }
      onClose()
    }
    document.addEventListener('mousedown', handleDocumentMouseDown)
    return () =>
      document.removeEventListener('mousedown', handleDocumentMouseDown)
  }, [onClose])

  const top = anchorRect.bottom + window.scrollY + 4
  const left = anchorRect.left + window.scrollX

  return createPortal(
    <div
      data-pt-plugin-table-ui-menu=""
      className="pt-plugin-table-ui__menu"
      style={{top, left}}
    >
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          className="pt-plugin-table-ui__menu-item"
          disabled={action.disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            action.onSelect()
            onClose()
          }}
        >
          {action.label}
        </button>
      ))}
    </div>,
    document.body,
  )
}
