import type {Path, PortableTextBlock} from '@portabletext/editor'

/**
 * @alpha
 */
export type CellNode = {
  _type: 'cell'
  _key: string
  value: Array<PortableTextBlock>
}

/**
 * @alpha
 */
export type RowNode = PortableTextBlock & {_type: 'row'; cells: Array<CellNode>}

/**
 * Per-column alignment, positional (array index = column index). `null` is an
 * explicitly unaligned column.
 *
 * @alpha
 */
export type ColumnAlignment = 'left' | 'center' | 'right' | null

/**
 * @alpha
 */
export type TableNode = PortableTextBlock & {
  _type: 'table'
  rows: Array<RowNode>
  alignment?: Array<ColumnAlignment>
  /** Number of leading rows that are header rows. */
  headerRows?: number
}

/**
 * @alpha
 */
export function isRow(node: PortableTextBlock): node is RowNode {
  // biome-ignore lint/complexity/useLiteralKeys: tsconfig has noPropertyAccessFromIndexSignature
  return node._type === 'row' && 'cells' in node && Array.isArray(node['cells'])
}

/**
 * @alpha
 */
export function isCell(node: PortableTextBlock): node is CellNode {
  return node._type === 'cell'
}

/**
 * @alpha
 */
export function isTable(node: PortableTextBlock): node is TableNode {
  // biome-ignore lint/complexity/useLiteralKeys: tsconfig has noPropertyAccessFromIndexSignature
  return node._type === 'table' && 'rows' in node && Array.isArray(node['rows'])
}

/**
 * @alpha
 */
export type TableSelection = {
  tablePath: Path
  rowRange: [number, number]
  colRange: [number, number]
}
