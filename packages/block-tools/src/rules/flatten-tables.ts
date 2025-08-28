import {
  isTextBlock,
  type PortableTextObject,
  type PortableTextSpan,
  type Schema,
} from '@portabletext/schema'
import {flattenNestedBlocks} from '../HtmlDeserializer/flatten-nested-blocks'
import {isElement, tagName} from '../HtmlDeserializer/helpers'
import type {
  ArbitraryTypedObject,
  DeserializerRule,
  TypedObject,
} from '../types'

/**
 * An opinionated `DeserializerRule` that flattens tables in a way that repeats
 * the header row for each cell in the row.
 *
 * @example
 * ```html
 * <table>
 *   <thead>
 *     <tr>
 *       <th>Header 1</th>
 *       <th>Header 2</th>
 *     </tr>
 *   </thead>
 *   <tbody>
 *     <tr>
 *       <td>Cell 1</td>
 *       <td>Cell 2</td>
 *     </tr>
 *   </tbody>
 * </table>
 * ```
 * Turns into
 * ```json
 * [
 *   {
 *     _type: 'block',
 *     children: [
 *       {
 *         _type: 'text',
 *         text: 'Header 1'
 *       },
 *       {
 *         _type: 'text',
 *         text: 'Cell 1'
 *       }
 *     ]
 *   },
 *   {
 *     _type: 'block',
 *     children: [
 *       {
 *         _type: 'text',
 *         text: 'Header 2'
 *       },
 *       {
 *         _type: 'text',
 *         text: 'Cell 2'
 *       }
 *     ]
 *   }
 * ]
 * ```
 *
 * Use the `separator` option to control if a child element should separate
 * headers and cells.
 *
 * @beta
 */
export function createFlattenTableRule({
  schema,
  separator,
}: {
  schema: Schema
  separator?: () =>
    | (Omit<PortableTextSpan, '_key'> & {_key?: string})
    | (Omit<PortableTextObject, '_key'> & {_key?: string})
    | undefined
}): DeserializerRule {
  return {
    deserialize: (node, next) => {
      if (!isElement(node) || tagName(node) !== 'table') {
        return undefined
      }

      const thead = node.querySelector('thead')
      let headerRow = thead?.querySelector('tr')
      const tbody = node.querySelector('tbody')
      let bodyRows = tbody ? [...tbody.querySelectorAll('tr')] : []

      if (!headerRow || !bodyRows) {
        // If there is not thead or tbody, we look at the column count. If the
        // column count is greater than 2 then we infer that the first row is
        // the header row and the rest are the body rows.

        const columnCounts = [...node.querySelectorAll('tr')].map((row) => {
          const cells = row.querySelectorAll('td')
          return cells.length
        })

        const firstColumnCount = columnCounts[0]

        if (
          !firstColumnCount ||
          !columnCounts.every((count) => count === firstColumnCount)
        ) {
          return undefined
        }

        if (firstColumnCount < 3) {
          return undefined
        }

        // Now we know that all rows have the same column count and that
        // count is >2
        const rows = [...node.querySelectorAll('tr')]
        headerRow = rows.slice(0, 1)[0]
        bodyRows = rows.slice(1)
      }

      if (!headerRow) {
        return undefined
      }

      const headerCells = headerRow.querySelectorAll('th, td')
      const headerResults = [...headerCells].map((headerCell) =>
        next(headerCell),
      )

      // Process tbody rows and combine with headers
      const rows: TypedObject[] = []

      for (const row of bodyRows) {
        const cells = row.querySelectorAll('td')

        let cellIndex = 0
        for (const cell of cells) {
          const result = next(cell)

          if (!result) {
            cellIndex++
            continue
          }

          const headerResult = headerResults[cellIndex]

          if (!headerResult) {
            // If we can't find a corresponding header, then we just push
            // the deserialized cell as is.
            if (Array.isArray(result)) {
              rows.push(...result)
            } else {
              rows.push(result)
            }
            cellIndex++
            continue
          }

          const flattenedHeaderResult = flattenNestedBlocks(
            {schema},
            (Array.isArray(headerResult)
              ? headerResult
              : [headerResult]) as Array<ArbitraryTypedObject>,
          )
          const firstFlattenedHeaderResult = flattenedHeaderResult[0]
          const flattenedResult = flattenNestedBlocks(
            {schema},
            (Array.isArray(result)
              ? result
              : [result]) as Array<ArbitraryTypedObject>,
          )
          const firstFlattenedResult = flattenedResult[0]

          if (
            flattenedHeaderResult.length === 1 &&
            isTextBlock({schema}, firstFlattenedHeaderResult) &&
            flattenedResult.length === 1 &&
            isTextBlock({schema}, firstFlattenedResult)
          ) {
            const separatorChild = separator?.()
            // If the header result and the cell result are text blocks then
            //   we merge them together.
            const mergedTextBlock = {
              ...firstFlattenedHeaderResult,
              children: [
                ...firstFlattenedHeaderResult.children,
                ...(separatorChild ? [separatorChild] : []),
                ...firstFlattenedResult.children,
              ],
              markDefs: [
                ...(firstFlattenedHeaderResult.markDefs ?? []),
                ...(firstFlattenedResult.markDefs ?? []),
              ],
            }

            rows.push(mergedTextBlock)
            cellIndex++
            continue
          }

          // Otherwise, we push the header result and the cell result as is.
          if (Array.isArray(headerResult)) {
            rows.push(...headerResult)
          } else {
            rows.push(headerResult)
          }

          if (Array.isArray(result)) {
            rows.push(...result)
          } else {
            rows.push(result)
          }

          cellIndex++
        }
      }

      // Return the processed rows as individual text blocks
      return rows
    },
  }
}
