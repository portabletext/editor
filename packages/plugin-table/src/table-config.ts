import type {PortableTextBlock} from '@portabletext/editor'
import type {CellNode, RowNode, TableNode} from './behaviors/types'

/**
 * The resolved table configuration: which type names and array fields the
 * behaviors, guards, and selection derivation operate on. Derived from the
 * container definitions passed to `defineTable`; the shape itself (three
 * nested levels plus `headerRows`/`alignment` on the table) is fixed.
 */
export type TableConfig = {
  tableType: string
  rowsField: string
  rowType: string
  cellsField: string
  cellType: string
  valueField: string
}

export const defaultTableConfig: TableConfig = {
  tableType: 'table',
  rowsField: 'rows',
  rowType: 'row',
  cellsField: 'cells',
  cellType: 'cell',
  valueField: 'value',
}

/**
 * Node guards bound to a configuration.
 */
export function createTableGuards(config: TableConfig): {
  isTable: (node: PortableTextBlock) => node is TableNode
  isRow: (node: PortableTextBlock) => node is RowNode
  isCell: (node: PortableTextBlock) => node is CellNode
} {
  return {
    isTable: (node): node is TableNode =>
      node._type === config.tableType &&
      Array.isArray(readField(node, config.rowsField)),
    isRow: (node): node is RowNode =>
      node._type === config.rowType &&
      Array.isArray(readField(node, config.cellsField)),
    isCell: (node): node is CellNode => node._type === config.cellType,
  }
}

/**
 * Field accessors bound to a configuration. The node types carry no field
 * names (those are configurable), so all structural reads go through these.
 */
export function tableRows(
  config: TableConfig,
  table: TableNode,
): Array<RowNode> {
  return (readField(table, config.rowsField) ?? []) as Array<RowNode>
}

export function rowCells(config: TableConfig, row: RowNode): Array<CellNode> {
  return (readField(row, config.cellsField) ?? []) as Array<CellNode>
}

export function cellValue(
  config: TableConfig,
  cell: CellNode,
): Array<PortableTextBlock> {
  return (readField(cell, config.valueField) ?? []) as Array<PortableTextBlock>
}

function readField(node: PortableTextBlock, field: string): unknown {
  return (node as Record<string, unknown>)[field]
}
