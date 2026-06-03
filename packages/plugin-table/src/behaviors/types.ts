import type {Path, PortableTextBlock} from '@portabletext/editor'

export type Cell = {_type: 'cell'; _key: string}
export type Row = PortableTextBlock & {_type: 'row'; cells: Array<Cell>}
export type Table = PortableTextBlock & {
  _type: 'table'
  rows: Array<Row>
  headerRow?: boolean
}

export function isRow(node: PortableTextBlock): node is Row {
  return node._type === 'row' && 'cells' in node && Array.isArray(node['cells'])
}

export function isCell(node: PortableTextBlock): node is Cell {
  return node._type === 'cell'
}

export function isTable(node: PortableTextBlock): node is Table {
  return node._type === 'table' && 'rows' in node && Array.isArray(node['rows'])
}

export type TableSelection = {
  tablePath: Path
  rowRange: [number, number]
  colRange: [number, number]
}
