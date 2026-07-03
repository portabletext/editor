import type {
  EditorSelection,
  EditorSnapshot,
  Path,
  PortableTextBlock,
} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {isSelectionCollapsed} from '@portabletext/editor/selectors'
import {getPathSubSchema} from '@portabletext/editor/traversal'
import {getBlockEndPoint, getBlockStartPoint} from '@portabletext/editor/utils'
import {getTableSelection} from '../get-table-selection'
import {resolveCell} from '../resolve-cell'
import {
  isTable,
  type Cell,
  type ColumnAlignment,
  type Row,
  type Table,
} from './types'

type CellReplacement = {
  cellPath: Path
  originalBlockKeys: Array<string>
  blocks: Array<PortableTextBlock>
}

type CellAppend = {
  afterCellPath: Path
  cell: Cell
}

type RowAppend = {
  afterRowPath: Path
  row: Row
}

type Distribution = {
  replacements: Array<CellReplacement>
  cellAppends: Array<CellAppend>
  rowAppends: Array<RowAppend>
  grownAlignment: Array<ColumnAlignment> | undefined
  tablePath: Path
  selection: NonNullable<EditorSelection>
}

/**
 * Pasting a table fragment into a table distributes it cell-per-cell from
 * the anchor (the target rectangle's top-left, or the caret's cell), the
 * spreadsheet convention, instead of dropping the whole fragment into one
 * cell. A larger target rectangle only provides the anchor; a fragment
 * extending past the table's edges grows rows and columns, padding
 * off-fragment positions with empty cells. Non-table fragments fall through
 * to the editor's paste handling, which replaces the rectangle through the
 * `delete` decomposition.
 */
export const pasteBehaviors = [
  defineBehavior<Record<string, never>, 'clipboard.paste', Distribution>({
    on: 'clipboard.paste',
    guard: ({snapshot, event}) => {
      const fragment = tableFragment(snapshot, event.originEvent.dataTransfer)
      if (!fragment) {
        return false
      }
      const anchor = resolveAnchorCell(snapshot)
      if (!anchor) {
        return false
      }
      return planDistribution(snapshot, fragment, anchor)
    },
    actions: [
      (
        _,
        {
          replacements,
          cellAppends,
          rowAppends,
          grownAlignment,
          tablePath,
          selection,
        },
      ) => [
        ...cellAppends.map((append) =>
          raise({
            type: 'insert' as const,
            at: append.afterCellPath,
            value: append.cell,
            position: 'after' as const,
          }),
        ),
        ...rowAppends.map((append) =>
          raise({
            type: 'insert' as const,
            at: append.afterRowPath,
            value: append.row,
            position: 'after' as const,
          }),
        ),
        ...replacements.flatMap((replacement) => {
          const lastOriginalKey =
            replacement.originalBlockKeys[
              replacement.originalBlockKeys.length - 1
            ]
          if (lastOriginalKey === undefined) {
            return []
          }
          return [
            ...replacement.blocks.map((block, index) =>
              raise({
                type: 'insert' as const,
                at: [
                  ...replacement.cellPath,
                  'value',
                  {
                    _key:
                      index === 0
                        ? lastOriginalKey
                        : (replacement.blocks[index - 1]?._key as string),
                  },
                ],
                value: block,
                position: 'after' as const,
              }),
            ),
            ...replacement.originalBlockKeys.map((blockKey) =>
              raise({
                type: 'unset' as const,
                at: [...replacement.cellPath, 'value', {_key: blockKey}],
              }),
            ),
          ]
        }),
        ...(grownAlignment
          ? [
              raise({
                type: 'block.set' as const,
                at: tablePath,
                props: {alignment: grownAlignment},
              }),
            ]
          : []),
        raise({type: 'select', at: selection}),
      ],
    ],
  }),
]

function planDistribution(
  snapshot: EditorSnapshot,
  fragment: Table,
  anchor: {table: Table; tablePath: Path; rowIndex: number; colIndex: number},
): Distribution | false {
  const keyGenerator = snapshot.context.keyGenerator
  const fragmentColCount = Math.max(
    ...fragment.rows.map((row) => row.cells.length),
  )
  const tableColCount = Math.max(
    ...anchor.table.rows.map((row) => row.cells.length),
  )
  const grownColCount = Math.max(
    tableColCount,
    anchor.colIndex + fragmentColCount,
  )
  const grownRowCount = Math.max(
    anchor.table.rows.length,
    anchor.rowIndex + fragment.rows.length,
  )

  // The deserializing converter is deliberately lenient (`validateFields:
  // false`), and the distribution applies content through raw `insert`
  // primitives, so the plugin is the last line of defense: only block types
  // the cell's sub-schema declares may land in a cell.
  const firstRow = anchor.table.rows[0]
  const firstCell = firstRow?.cells[0]
  if (!firstRow || !firstCell) {
    return false
  }
  const cellSchema = getPathSubSchema(
    snapshot,
    cellPathFor(anchor.tablePath, firstRow._key, firstCell._key),
  )
  const allowedTypes = new Set([
    cellSchema.block.name,
    ...cellSchema.blockObjects.map((blockObject) => blockObject.name),
  ])

  const contentAt = (rowIndex: number, colIndex: number) => {
    const fragmentCell =
      fragment.rows[rowIndex - anchor.rowIndex]?.cells[
        colIndex - anchor.colIndex
      ]
    if (!fragmentCell) {
      return undefined
    }
    const blocks = fragmentCell.value.filter((block) =>
      allowedTypes.has(block._type),
    )
    return blocks.length > 0 ? {...fragmentCell, value: blocks} : undefined
  }

  const replacements: Array<CellReplacement> = []
  const cellAppends: Array<CellAppend> = []
  const rowAppends: Array<RowAppend> = []
  const contentTargets: Array<{
    cellPath: Path
    blocks: Array<PortableTextBlock>
  }> = []

  const buildCell = (fragmentCell: Cell | undefined): Cell => ({
    _type: 'cell',
    _key: keyGenerator(),
    value: fragmentCell
      ? rekeyBlocks(keyGenerator, fragmentCell.value)
      : [emptyBlock(keyGenerator)],
  })

  let previousRowKey = anchor.table.rows[anchor.table.rows.length - 1]?._key
  if (previousRowKey === undefined) {
    return false
  }

  for (let rowIndex = 0; rowIndex < grownRowCount; rowIndex++) {
    const existingRow = anchor.table.rows[rowIndex]

    if (!existingRow) {
      const row: Row = {
        _type: 'row',
        _key: keyGenerator(),
        cells: [],
      }
      for (let colIndex = 0; colIndex < grownColCount; colIndex++) {
        const fragmentCell = contentAt(rowIndex, colIndex)
        const cellNode = buildCell(fragmentCell)
        row.cells.push(cellNode)
        if (fragmentCell) {
          contentTargets.push({
            cellPath: cellPathFor(anchor.tablePath, row._key, cellNode._key),
            blocks: cellNode.value as Array<PortableTextBlock>,
          })
        }
      }
      rowAppends.push({
        afterRowPath: [...anchor.tablePath, 'rows', {_key: previousRowKey}],
        row,
      })
      previousRowKey = row._key
      continue
    }

    let previousCellKey = existingRow.cells[existingRow.cells.length - 1]?._key
    for (let colIndex = 0; colIndex < grownColCount; colIndex++) {
      const fragmentCell = contentAt(rowIndex, colIndex)
      const existingCell = existingRow.cells[colIndex]

      if (existingCell) {
        if (fragmentCell) {
          const blocks = rekeyBlocks(keyGenerator, fragmentCell.value)
          const cellPath = cellPathFor(
            anchor.tablePath,
            existingRow._key,
            existingCell._key,
          )
          replacements.push({
            cellPath,
            originalBlockKeys: existingCell.value.map((block) => block._key),
            blocks,
          })
          contentTargets.push({cellPath, blocks})
        }
        continue
      }

      // Column growth: the row is shorter than the grown width. Padding
      // keeps the grid rectangular where the fragment has no content.
      if (previousCellKey === undefined) {
        return false
      }
      const cellNode = buildCell(fragmentCell)
      cellAppends.push({
        afterCellPath: [
          ...anchor.tablePath,
          'rows',
          {_key: existingRow._key},
          'cells',
          {_key: previousCellKey},
        ],
        cell: cellNode,
      })
      previousCellKey = cellNode._key
      if (fragmentCell) {
        contentTargets.push({
          cellPath: cellPathFor(
            anchor.tablePath,
            existingRow._key,
            cellNode._key,
          ),
          blocks: cellNode.value as Array<PortableTextBlock>,
        })
      }
    }
  }

  const selection = pastedSelection(snapshot.context, contentTargets)
  if (!selection) {
    return false
  }

  const grownAlignment =
    grownColCount > tableColCount && anchor.table.alignment
      ? [
          ...anchor.table.alignment,
          ...Array<ColumnAlignment>(grownColCount - tableColCount).fill(null),
        ]
      : undefined

  return {
    replacements,
    cellAppends,
    rowAppends,
    grownAlignment,
    tablePath: anchor.tablePath,
    selection,
  }
}

function cellPathFor(tablePath: Path, rowKey: string, cellKey: string): Path {
  return [...tablePath, 'rows', {_key: rowKey}, 'cells', {_key: cellKey}]
}

function emptyBlock(keyGenerator: () => string): PortableTextBlock {
  return {
    _type: 'block',
    _key: keyGenerator(),
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: keyGenerator(), text: '', marks: []}],
  }
}

/**
 * The single table block in the clipboard's Portable Text data, or
 * `undefined` when the clipboard carries anything else. The data goes
 * through the same converter the editor's own paste uses, which validates
 * the fragment against this editor's schema, down into the cells' blocks.
 * The parser preserves existing keys, so re-keying stays a separate step.
 */
function tableFragment(
  snapshot: EditorSnapshot,
  dataTransfer: DataTransfer,
): Table | undefined {
  const data = dataTransfer.getData('application/x-portable-text')
  if (!data) {
    return undefined
  }
  const converter = snapshot.context.converters.find(
    (candidate) => candidate.mimeType === 'application/x-portable-text',
  )
  if (!converter) {
    return undefined
  }
  const result = converter.deserialize({
    snapshot,
    event: {type: 'deserialize', data},
  })
  if (result.type !== 'deserialization.success') {
    return undefined
  }
  const blocks = result.data
  if (!Array.isArray(blocks) || blocks.length !== 1) {
    return undefined
  }
  const block = blocks[0]
  if (!isTable(block)) {
    return undefined
  }
  const wellFormed =
    block.rows.length > 0 &&
    block.rows.every(
      (row) =>
        Array.isArray(row.cells) &&
        row.cells.length > 0 &&
        row.cells.every((cellNode) => Array.isArray(cellNode.value)),
    )
  return wellFormed ? block : undefined
}

/**
 * The cell the distribution starts from: the target rectangle's top-left,
 * or the caret's cell.
 */
function resolveAnchorCell(snapshot: EditorSnapshot):
  | {
      table: Table
      tablePath: Path
      rowIndex: number
      colIndex: number
    }
  | undefined {
  const tableSelection = getTableSelection(snapshot)
  if (tableSelection) {
    const anchorCell = resolveCell(
      snapshot,
      snapshot.context.selection?.anchor.path ?? [],
    )
    if (!anchorCell) {
      return undefined
    }
    return {
      table: anchorCell.table.node,
      tablePath: anchorCell.table.path,
      rowIndex: tableSelection.rowRange[0],
      colIndex: tableSelection.colRange[0],
    }
  }

  if (!isSelectionCollapsed(snapshot)) {
    return undefined
  }
  const caretCell = resolveCell(
    snapshot,
    snapshot.context.selection?.focus.path ?? [],
  )
  if (!caretCell) {
    return undefined
  }
  const rowIndex = caretCell.table.node.rows.findIndex(
    (row) => row._key === caretCell.row.node._key,
  )
  const colIndex = caretCell.row.node.cells.findIndex(
    (cellNode) => cellNode._key === caretCell.cell.node._key,
  )
  if (rowIndex === -1 || colIndex === -1) {
    return undefined
  }
  return {
    table: caretCell.table.node,
    tablePath: caretCell.table.path,
    rowIndex,
    colIndex,
  }
}

/**
 * Deep-copy blocks with fresh keys, remapping span marks that reference
 * re-keyed markDefs. Pasting a column next to itself must not duplicate
 * keys; the deserializing parser preserves keys, so this cannot be
 * delegated to it.
 */
function rekeyBlocks(
  keyGenerator: () => string,
  blocks: Array<PortableTextBlock>,
): Array<PortableTextBlock> {
  return blocks.map((block) => {
    const blockKey = keyGenerator()
    if (!Array.isArray(block.children)) {
      return {...block, _key: blockKey}
    }
    const markDefKeys = new Map<string, string>()
    const markDefs = (Array.isArray(block.markDefs) ? block.markDefs : []).map(
      (markDef: {_key: string}) => {
        const markDefKey = keyGenerator()
        markDefKeys.set(markDef._key, markDefKey)
        return {...markDef, _key: markDefKey}
      },
    )
    const children = block.children.map((child) => ({
      ...child,
      _key: keyGenerator(),
      ...(Array.isArray(child.marks)
        ? {
            marks: child.marks.map(
              (mark: string) => markDefKeys.get(mark) ?? mark,
            ),
          }
        : {}),
    }))
    return {...block, _key: blockKey, markDefs, children}
  })
}

/** An expanded selection spanning the pasted cells leaf-to-leaf. */
function pastedSelection(
  context: EditorSnapshot['context'],
  targets: Array<{cellPath: Path; blocks: Array<PortableTextBlock>}>,
): NonNullable<EditorSelection> | undefined {
  const first = targets.find((target) => target.blocks.length > 0)
  const last = [...targets].reverse().find((target) => target.blocks.length > 0)
  if (!first || !last) {
    return undefined
  }
  const firstBlock = first.blocks[0] as PortableTextBlock
  const lastBlock = last.blocks[last.blocks.length - 1] as PortableTextBlock
  return {
    anchor: getBlockStartPoint({
      context,
      block: {
        node: firstBlock,
        path: [...first.cellPath, 'value', {_key: firstBlock._key}],
      },
    }),
    focus: getBlockEndPoint({
      context,
      block: {
        node: lastBlock,
        path: [...last.cellPath, 'value', {_key: lastBlock._key}],
      },
    }),
  }
}
