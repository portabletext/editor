import type {PortableTextBlock} from '@portabletext/editor'

export type Cell = {
  _type: 'cell'
  _key: string
  value: Array<PortableTextBlock>
}
export type Row = PortableTextBlock & {_type: 'row'; cells: Array<Cell>}

/** Per-column alignment, positional (array index = column index). `null` is an explicitly unaligned column. */
export type ColumnAlignment = 'left' | 'center' | 'right' | null

export type Table = PortableTextBlock & {
  _type: 'table'
  rows: Array<Row>
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
