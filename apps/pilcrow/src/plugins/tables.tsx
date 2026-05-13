import {
  defineContainer,
  type BlockPath,
  type EditorSnapshot,
} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {BehaviorPlugin, ContainerPlugin} from '@portabletext/editor/plugins'
import {getAncestor} from '@portabletext/editor/traversal'
import type {CSSProperties} from 'react'
import type {schemaDefinition} from '../schema'

/**
 * Tables. Three nested containers - table > row > cell - mirror the
 * markdown shape (rows of cells with simple text content per cell).
 *
 * Custom behavior events let consumers add/remove rows and columns
 * around the focus cell:
 *   custom.tables.add-row         insert a new row after the focus row
 *   custom.tables.remove-row      remove the focus row
 *   custom.tables.add-column      insert a new cell at focus.colIndex+1 in every row
 *   custom.tables.remove-column   remove the cell at focus.colIndex in every row
 */
const tableContainer = defineContainer<typeof schemaDefinition>({
  type: 'table',
  childField: 'rows',
  render: ({attributes, children, node}) => {
    const block = node as {headerRows?: number; rows?: Array<unknown>}
    const firstRow = block.rows?.[0] as {cells?: Array<unknown>} | undefined
    const columnCount = firstRow?.cells?.length ?? 1
    return (
      <div
        {...attributes}
        className="pc-table"
        style={{'--pc-table-columns': columnCount} as CSSProperties}
        data-header-rows={block.headerRows ?? 0}
      >
        {children}
      </div>
    )
  },
})

const tableRowContainer = defineContainer<typeof schemaDefinition>({
  type: 'row',
  childField: 'cells',
  render: ({attributes, children}) => (
    <div {...attributes} className="pc-table-row">
      {children}
    </div>
  ),
})

const tableCellContainer = defineContainer<typeof schemaDefinition>({
  type: 'cell',
  childField: 'content',
  render: ({attributes, children}) => (
    <div {...attributes} className="pc-table-cell">
      {children}
    </div>
  ),
})

// ---------------------------------------------------------------------------
// Row / column operations
// ---------------------------------------------------------------------------

type TableContext = {
  tableNode: TableNode
  tablePath: BlockPath
  rowNode: RowNode
  rowPath: BlockPath
  rowIndex: number
  cellIndex: number
}

type CellNode = {_key: string; _type: 'cell'; content: Array<unknown>}
type RowNode = {_key: string; _type: 'row'; cells: Array<CellNode>}
type TableNode = {_key: string; _type: 'table'; rows: Array<RowNode>}

function isTable(node: unknown): node is TableNode {
  return (node as {_type?: unknown})?._type === 'table'
}

function isRow(node: unknown): node is RowNode {
  return (node as {_type?: unknown})?._type === 'row'
}

function resolveTableContext(snapshot: EditorSnapshot): TableContext | null {
  const focusPath = snapshot.context.selection?.focus.path as
    | BlockPath
    | undefined
  if (!focusPath) {
    return null
  }
  const row = getAncestor(snapshot, focusPath, isRow) as
    | {node: RowNode; path: BlockPath}
    | undefined
  if (!row) {
    return null
  }
  const table = getAncestor(snapshot, row.path, isTable) as
    | {node: TableNode; path: BlockPath}
    | undefined
  if (!table) {
    return null
  }
  const rowIndex = table.node.rows.findIndex((r) => r._key === row.node._key)
  // Find the cell key in the focus path
  const cellKeySeg = focusPath.find(
    (seg, idx) =>
      idx > 0 &&
      typeof seg === 'object' &&
      seg !== null &&
      focusPath[idx - 1] === 'cells',
  )
  const cellKey =
    cellKeySeg && typeof cellKeySeg === 'object' && '_key' in cellKeySeg
      ? (cellKeySeg as {_key: string})._key
      : null
  if (!cellKey) {
    return null
  }
  const cellIndex = row.node.cells.findIndex((c) => c._key === cellKey)
  if (cellIndex < 0) {
    return null
  }
  return {
    tableNode: table.node,
    tablePath: table.path,
    rowNode: row.node,
    rowPath: row.path,
    rowIndex,
    cellIndex,
  }
}

function newCell(keyGen: () => string, columnCount?: number): CellNode {
  void columnCount
  return {
    _type: 'cell',
    _key: keyGen(),
    content: [
      {
        _type: 'block',
        _key: keyGen(),
        style: 'normal',
        children: [{_type: 'span', _key: keyGen(), text: '', marks: []}],
        markDefs: [],
      } as unknown,
    ],
  }
}

function newRow(keyGen: () => string, columnCount: number): RowNode {
  const cells: Array<CellNode> = []
  for (let i = 0; i < columnCount; i++) {
    cells.push(newCell(keyGen))
  }
  return {_type: 'row', _key: keyGen(), cells}
}

const addRowBehavior = defineBehavior({
  on: 'custom.tables.add-row',
  guard: ({snapshot}) => {
    const ctx = resolveTableContext(snapshot as never)
    if (!ctx) {
      return false
    }
    const columnCount = ctx.rowNode.cells.length
    const keyGen = snapshot.context.keyGenerator
    return {ctx, row: newRow(keyGen, columnCount)}
  },
  actions: [
    (_, planned) => {
      const {ctx, row} = planned as {ctx: TableContext; row: RowNode}
      return [
        raise({
          type: 'insert',
          at: ctx.rowPath as never,
          value: row as never,
          position: 'after',
        }),
      ]
    },
  ],
})

const removeRowBehavior = defineBehavior({
  on: 'custom.tables.remove-row',
  guard: ({snapshot}) => {
    const ctx = resolveTableContext(snapshot as never)
    if (!ctx) {
      return false
    }
    if (ctx.tableNode.rows.length <= 1) {
      // Refuse to remove the only row. Caller should remove the whole table.
      return false
    }
    return {ctx}
  },
  actions: [
    (_, planned) => {
      const {ctx} = planned as {ctx: TableContext}
      return [raise({type: 'unset', at: ctx.rowPath as never})]
    },
  ],
})

const addColumnBehavior = defineBehavior({
  on: 'custom.tables.add-column',
  guard: ({snapshot}) => {
    const ctx = resolveTableContext(snapshot as never)
    if (!ctx) {
      return false
    }
    const keyGen = snapshot.context.keyGenerator
    const inserts: Array<{
      rowKey: string
      afterCellKey: string
      cell: CellNode
    }> = []
    for (const r of ctx.tableNode.rows) {
      const target = r.cells[ctx.cellIndex]
      if (!target) {
        continue
      }
      inserts.push({
        rowKey: r._key,
        afterCellKey: target._key,
        cell: newCell(keyGen),
      })
    }
    return {ctx, inserts}
  },
  actions: [
    (_, planned) => {
      const {ctx, inserts} = planned as {
        ctx: TableContext
        inserts: Array<{rowKey: string; afterCellKey: string; cell: CellNode}>
      }
      return inserts.map((entry) =>
        raise({
          type: 'insert',
          at: [
            ...ctx.tablePath,
            'rows',
            {_key: entry.rowKey},
            'cells',
            {_key: entry.afterCellKey},
          ] as never,
          value: entry.cell as never,
          position: 'after',
        }),
      )
    },
  ],
})

const removeColumnBehavior = defineBehavior({
  on: 'custom.tables.remove-column',
  guard: ({snapshot}) => {
    const ctx = resolveTableContext(snapshot as never)
    if (!ctx) {
      return false
    }
    if (ctx.rowNode.cells.length <= 1) {
      // Refuse to remove the only column. Caller should remove the whole table.
      return false
    }
    return {ctx}
  },
  actions: [
    (_, planned) => {
      const {ctx} = planned as {ctx: TableContext}
      const removes: Array<ReturnType<typeof raise>> = []
      for (const r of ctx.tableNode.rows) {
        const target = r.cells[ctx.cellIndex]
        if (!target) {
          continue
        }
        removes.push(
          raise({
            type: 'unset',
            at: [
              ...ctx.tablePath,
              'rows',
              {_key: r._key},
              'cells',
              {_key: target._key},
            ] as never,
          }),
        )
      }
      return removes
    },
  ],
})

export function TablesPlugin() {
  return (
    <>
      <ContainerPlugin
        containers={[tableContainer, tableRowContainer, tableCellContainer]}
      />
      <BehaviorPlugin
        behaviors={[
          addRowBehavior,
          removeRowBehavior,
          addColumnBehavior,
          removeColumnBehavior,
        ]}
      />
    </>
  )
}
