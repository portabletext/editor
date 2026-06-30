import type {Path, PortableTextBlock} from '@portabletext/editor'

export type Cell = {
  _type: 'cell'
  _key: string
  value: Array<PortableTextBlock>
}
export type Row = PortableTextBlock & {_type: 'row'; cells: Array<Cell>}

/**
 * Per-column alignment, indexed by column. Shares the shape
 * `@portabletext/markdown` round-trips so the editable table and the
 * serializers agree on what a table is.
 */
export type ColumnAlignment = 'left' | 'center' | 'right' | null

export type Table = PortableTextBlock & {
  _type: 'table'
  rows: Array<Row>
  headerRows?: number
  alignment?: Array<ColumnAlignment>
}

export function isRow(node: PortableTextBlock): node is Row {
  // biome-ignore lint/complexity/useLiteralKeys: tsconfig has noPropertyAccessFromIndexSignature
  return node._type === 'row' && 'cells' in node && Array.isArray(node['cells'])
}

export function isCell(node: PortableTextBlock): node is Cell {
  return node._type === 'cell'
}

export function isTable(node: PortableTextBlock): node is Table {
  // biome-ignore lint/complexity/useLiteralKeys: tsconfig has noPropertyAccessFromIndexSignature
  return node._type === 'table' && 'rows' in node && Array.isArray(node['rows'])
}

export type TableSelection = {
  tablePath: Path
  rowRange: [number, number]
  colRange: [number, number]
}
