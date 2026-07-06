import type {Path, PortableTextBlock} from '@portabletext/editor'

/**
 * A cell node in the table's value. The content array's field name is
 * configurable (see `defineTable`), so structural reads go through the
 * config-bound accessors rather than properties.
 *
 * @public
 */
export type CellNode = PortableTextBlock & {_key: string}

/**
 * A row node in the table's value.
 *
 * @public
 */
export type RowNode = PortableTextBlock & {_key: string}

/**
 * Per-column alignment, positional (array index = column index). `null` is an
 * explicitly unaligned column.
 *
 * @public
 */
export type ColumnAlignment = 'left' | 'center' | 'right' | null

/**
 * A table node in the value. `headerRows` and `alignment` are fixed field
 * names regardless of configuration.
 *
 * @public
 */
export type TableNode = PortableTextBlock & {
  _key: string
  alignment?: Array<ColumnAlignment>
  /** Number of leading rows that are header rows. */
  headerRows?: number
}

/**
 * @public
 */
export type TableSelection = {
  tablePath: Path
  rowRange: [number, number]
  colRange: [number, number]
}
