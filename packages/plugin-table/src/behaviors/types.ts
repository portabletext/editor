import type {Path, PortableTextBlock} from '@portabletext/editor'
import {createTableGuards, defaultTableConfig} from '../table-config'

/**
 * A cell node in the table's value. The content array's field name is
 * configurable (see `defineTable`), so structural reads go through the
 * config-bound accessors rather than properties.
 *
 * @alpha
 */
export type CellNode = PortableTextBlock & {_key: string}

/**
 * A row node in the table's value.
 *
 * @alpha
 */
export type RowNode = PortableTextBlock & {_key: string}

/**
 * Per-column alignment, positional (array index = column index). `null` is an
 * explicitly unaligned column.
 *
 * @alpha
 */
export type ColumnAlignment = 'left' | 'center' | 'right' | null

/**
 * A table node in the value. `headerRows` and `alignment` are fixed field
 * names regardless of configuration.
 *
 * @alpha
 */
export type TableNode = PortableTextBlock & {
  _key: string
  alignment?: Array<ColumnAlignment>
  /** Number of leading rows that are header rows. */
  headerRows?: number
}

const defaultGuards = createTableGuards(defaultTableConfig)

/**
 * @alpha
 */
export const isTable: (node: PortableTextBlock) => node is TableNode =
  defaultGuards.isTable

/**
 * @alpha
 */
export const isRow: (node: PortableTextBlock) => node is RowNode =
  defaultGuards.isRow

/**
 * @alpha
 */
export const isCell: (node: PortableTextBlock) => node is CellNode =
  defaultGuards.isCell

/**
 * @alpha
 */
export type TableSelection = {
  tablePath: Path
  rowRange: [number, number]
  colRange: [number, number]
}
