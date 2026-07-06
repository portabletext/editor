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
 * A table node in the value. `headerRows` is a fixed field name regardless
 * of configuration.
 *
 * @public
 */
export type TableNode = PortableTextBlock & {
  _key: string
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
