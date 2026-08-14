import type {Schema} from '@portabletext/schema'
import {flattenNestedBlocks} from '../deserializer/flatten-nested-blocks'
import {isTableElement, tagName} from '../deserializer/helpers'
import {normalizeBlock} from '../deserializer/normalize-block'
import {keyGenerator as defaultKeyGenerator} from '../deserializer/random-key'
import type {
  ArbitraryTypedObject,
  DeserializerRule,
  TypedObject,
} from '../types'

/**
 * The type names and array fields of the three table levels, role-keyed to
 * mirror `@portabletext/plugin-table`'s `defineTable({containers})`. Only
 * `type` and `arrayField` are read, so the container definitions passed to
 * `defineTable` can be passed here unchanged; any render or `of` they carry
 * is ignored. Omitted roles and fields fall back to the canonical names
 * (`table`/`rows`, `row`/`cells`, `cell`/`value`).
 *
 * @beta
 */
export type TableRuleContainers = {
  table?: {type?: string; arrayField?: string}
  row?: {type?: string; arrayField?: string}
  cell?: {type?: string; arrayField?: string}
}

/**
 * A `DeserializerRule` that converts `<table>` HTML into a nested table
 * shape: one custom block carrying `rows`, each row carrying `cells`, each
 * cell carrying a Portable Text `value` array. Matches the block/array-field
 * names `@portabletext/plugin-table`'s `defineTable` produces, configurable
 * through `containers` for consumers that renamed them.
 *
 * @example
 * ```html
 * <table>
 *   <thead>
 *     <tr><th>Year</th><th>Sales</th></tr>
 *   </thead>
 *   <tbody>
 *     <tr><td>2022</td><td>$8,000</td></tr>
 *   </tbody>
 * </table>
 * ```
 * Turns into
 * ```json
 * {
 *   "_type": "table",
 *   "headerRows": 1,
 *   "rows": [
 *     {"_type": "row", "cells": [{"_type": "cell", "value": [...Year...]}, ...]},
 *     {"_type": "row", "cells": [{"_type": "cell", "value": [...2022...]}, ...]}
 *   ]
 * }
 * ```
 *
 * `colspan`/`rowspan` are ignored: a spanning cell contributes one cell,
 * and rows shorter than the widest row are padded with empty cells.
 *
 * @beta
 */
export function createTableRule({
  schema,
  keyGenerator = defaultKeyGenerator,
  containers,
}: {
  schema: Schema
  keyGenerator?: () => string
  containers?: TableRuleContainers
}): DeserializerRule {
  const tableType = containers?.table?.type ?? 'table'
  const rowsField = containers?.table?.arrayField ?? 'rows'
  const rowType = containers?.row?.type ?? 'row'
  const cellsField = containers?.row?.arrayField ?? 'cells'
  const cellType = containers?.cell?.type ?? 'cell'
  const valueField = containers?.cell?.arrayField ?? 'value'

  return {
    deserialize: (node, next, createBlock) => {
      if (!isTableElement(node)) {
        return undefined
      }

      const rowElements = [...node.rows]

      if (rowElements.length === 0) {
        return undefined
      }

      const rowCells = rowElements.map((row) => [...row.cells])

      let headerRows = 0
      for (let i = 0; i < rowElements.length; i++) {
        const row = rowElements[i]
        const cells = rowCells[i]
        if (!row || !cells) {
          break
        }
        const isInThead = tagName(row.parentNode) === 'thead'
        const isAllHeaderCells =
          cells.length > 0 && cells.every((cell) => tagName(cell) === 'th')
        if (isInThead || isAllHeaderCells) {
          headerRows++
        } else {
          break
        }
      }

      const widestRow = Math.max(...rowCells.map((cells) => cells.length))

      const emptyCellValue = (): TypedObject[] => [
        {
          _type: schema.block.name,
          _key: keyGenerator(),
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: keyGenerator(), text: '', marks: []},
          ],
        } as ArbitraryTypedObject,
      ]

      const cellValue = (cellElement: Element): TypedObject[] => {
        const result = next(cellElement)
        const items =
          result === undefined ? [] : ([] as TypedObject[]).concat(result)
        const flattened = flattenNestedBlocks(
          {schema},
          items as Array<ArbitraryTypedObject>,
        )

        if (flattened.length === 0) {
          return emptyCellValue()
        }

        return flattened.map(
          (item) => normalizeBlock(item, {keyGenerator}) as TypedObject,
        )
      }

      const rows = rowCells.map((cells) => {
        const rowKey = keyGenerator()
        return {
          _type: rowType,
          _key: rowKey,
          [cellsField]: Array.from({length: widestRow}, (_, column) => {
            const cellElement = cells[column]
            return {
              _type: cellType,
              _key: keyGenerator(),
              [valueField]: cellElement
                ? cellValue(cellElement)
                : emptyCellValue(),
            }
          }),
        }
      })

      const tableKey = keyGenerator()

      return createBlock({
        _type: tableType,
        _key: tableKey,
        ...(headerRows > 0 ? {headerRows} : {}),
        [rowsField]: rows,
      })
    },
  }
}
