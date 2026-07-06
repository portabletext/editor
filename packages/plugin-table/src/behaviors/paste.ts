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
  cellValue,
  createTableGuards,
  rowCells,
  tableRows,
  type TableConfig,
} from '../table-config'
import type {CellNode, RowNode, TableNode} from './types'

type CellReplacement = {
  cellPath: Path
  originalBlockKeys: Array<string>
  blocks: Array<PortableTextBlock>
}

type CellAppend = {
  afterCellPath: Path
  cell: CellNode
}

type RowAppend = {
  afterRowPath: Path
  row: RowNode
}

type Distribution = {
  replacements: Array<CellReplacement>
  cellAppends: Array<CellAppend>
  rowAppends: Array<RowAppend>
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
export function createPasteBehaviors(config: TableConfig) {
  return [
    defineBehavior<Record<string, never>, 'clipboard.paste', Distribution>({
      on: 'clipboard.paste',
      guard: ({snapshot, event}) => {
        const fragment = tableFragment(
          config,
          snapshot,
          event.originEvent.dataTransfer,
        )
        if (!fragment) {
          return false
        }
        const anchor = resolveAnchorCell(config, snapshot)
        if (!anchor) {
          return false
        }
        return planDistribution(config, snapshot, fragment, anchor)
      },
      actions: [
        (_, {replacements, cellAppends, rowAppends, selection}) => [
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
                    config.valueField,
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
                  at: [
                    ...replacement.cellPath,
                    config.valueField,
                    {_key: blockKey},
                  ],
                }),
              ),
            ]
          }),
          raise({type: 'select', at: selection}),
        ],
      ],
    }),
  ]
}

function planDistribution(
  config: TableConfig,
  snapshot: EditorSnapshot,
  fragment: TableNode,
  anchor: {
    table: TableNode
    tablePath: Path
    rowIndex: number
    colIndex: number
  },
): Distribution | false {
  const keyGenerator = snapshot.context.keyGenerator
  const fragmentRows = tableRows(config, fragment)
  const anchorRows = tableRows(config, anchor.table)
  const fragmentColCount = Math.max(
    ...fragmentRows.map((row) => rowCells(config, row).length),
  )
  const tableColCount = Math.max(
    ...anchorRows.map((row) => rowCells(config, row).length),
  )
  const grownColCount = Math.max(
    tableColCount,
    anchor.colIndex + fragmentColCount,
  )
  const grownRowCount = Math.max(
    anchorRows.length,
    anchor.rowIndex + fragmentRows.length,
  )

  // The deserializing converter is deliberately lenient (`validateFields:
  // false`), and the distribution applies content through raw `insert`
  // primitives, so the plugin is the last line of defense: only block types
  // the cell's sub-schema declares may land in a cell.
  const firstRow = anchorRows[0]
  const firstCell = firstRow ? rowCells(config, firstRow)[0] : undefined
  if (!firstRow || !firstCell) {
    return false
  }
  const cellSchema = getPathSubSchema(
    snapshot,
    cellPathFor(config, anchor.tablePath, firstRow._key, firstCell._key),
  )
  const allowedTypes = new Set([
    cellSchema.block.name,
    ...cellSchema.blockObjects.map((blockObject) => blockObject.name),
  ])

  const contentAt = (rowIndex: number, colIndex: number) => {
    const fragmentRow = fragmentRows[rowIndex - anchor.rowIndex]
    const fragmentCell = fragmentRow
      ? rowCells(config, fragmentRow)[colIndex - anchor.colIndex]
      : undefined
    if (!fragmentCell) {
      return undefined
    }
    const blocks = cellValue(config, fragmentCell).filter((block) =>
      allowedTypes.has(block._type),
    )
    return blocks.length > 0
      ? ({...fragmentCell, [config.valueField]: blocks} as CellNode)
      : undefined
  }

  const replacements: Array<CellReplacement> = []
  const cellAppends: Array<CellAppend> = []
  const rowAppends: Array<RowAppend> = []
  const contentTargets: Array<{
    cellPath: Path
    blocks: Array<PortableTextBlock>
  }> = []

  const buildCell = (fragmentCell: CellNode | undefined): CellNode => ({
    _type: config.cellType,
    _key: keyGenerator(),
    [config.valueField]: fragmentCell
      ? rekeyBlocks(keyGenerator, cellValue(config, fragmentCell))
      : [emptyBlock(keyGenerator)],
  })

  let previousRowKey = anchorRows[anchorRows.length - 1]?._key
  if (previousRowKey === undefined) {
    return false
  }

  for (let rowIndex = 0; rowIndex < grownRowCount; rowIndex++) {
    const existingRow = anchorRows[rowIndex]

    if (!existingRow) {
      const newCells: Array<CellNode> = []
      const row: RowNode = {
        _type: config.rowType,
        _key: keyGenerator(),
        [config.cellsField]: newCells,
      }
      for (let colIndex = 0; colIndex < grownColCount; colIndex++) {
        const fragmentCell = contentAt(rowIndex, colIndex)
        const cellNode = buildCell(fragmentCell)
        newCells.push(cellNode)
        if (fragmentCell) {
          contentTargets.push({
            cellPath: cellPathFor(
              config,
              anchor.tablePath,
              row._key,
              cellNode._key,
            ),
            blocks: cellValue(config, cellNode),
          })
        }
      }
      rowAppends.push({
        afterRowPath: [
          ...anchor.tablePath,
          config.rowsField,
          {_key: previousRowKey},
        ],
        row,
      })
      previousRowKey = row._key
      continue
    }

    const existingCells = rowCells(config, existingRow)
    let previousCellKey = existingCells[existingCells.length - 1]?._key
    for (let colIndex = 0; colIndex < grownColCount; colIndex++) {
      const fragmentCell = contentAt(rowIndex, colIndex)
      const existingCell = existingCells[colIndex]

      if (existingCell) {
        if (fragmentCell) {
          const blocks = rekeyBlocks(
            keyGenerator,
            cellValue(config, fragmentCell),
          )
          const cellPath = cellPathFor(
            config,
            anchor.tablePath,
            existingRow._key,
            existingCell._key,
          )
          replacements.push({
            cellPath,
            originalBlockKeys: cellValue(config, existingCell).map(
              (block) => block._key,
            ),
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
          config.rowsField,
          {_key: existingRow._key},
          config.cellsField,
          {_key: previousCellKey},
        ],
        cell: cellNode,
      })
      previousCellKey = cellNode._key
      if (fragmentCell) {
        contentTargets.push({
          cellPath: cellPathFor(
            config,
            anchor.tablePath,
            existingRow._key,
            cellNode._key,
          ),
          blocks: cellValue(config, cellNode),
        })
      }
    }
  }

  const selection = pastedSelection(config, snapshot.context, contentTargets)
  if (!selection) {
    return false
  }

  return {replacements, cellAppends, rowAppends, selection}
}

function cellPathFor(
  config: TableConfig,
  tablePath: Path,
  rowKey: string,
  cellKey: string,
): Path {
  return [
    ...tablePath,
    config.rowsField,
    {_key: rowKey},
    config.cellsField,
    {_key: cellKey},
  ]
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
  config: TableConfig,
  snapshot: EditorSnapshot,
  dataTransfer: DataTransfer,
): TableNode | undefined {
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
  const {isTable} = createTableGuards(config)
  if (!isTable(block)) {
    return undefined
  }
  const blockRows = tableRows(config, block)
  const wellFormed =
    blockRows.length > 0 &&
    blockRows.every((row) => {
      const cells = rowCells(config, row)
      return (
        cells.length > 0 &&
        cells.every((cellNode) => Array.isArray(cellValue(config, cellNode)))
      )
    })
  return wellFormed ? block : undefined
}

/**
 * The cell the distribution starts from: the target rectangle's top-left,
 * or the caret's cell.
 */
function resolveAnchorCell(
  config: TableConfig,
  snapshot: EditorSnapshot,
):
  | {
      table: TableNode
      tablePath: Path
      rowIndex: number
      colIndex: number
    }
  | undefined {
  const tableSelection = getTableSelection(snapshot, config)
  if (tableSelection) {
    const anchorCell = resolveCell(
      snapshot,
      snapshot.context.selection?.anchor.path ?? [],
      config,
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
    config,
  )
  if (!caretCell) {
    return undefined
  }
  const rowIndex = tableRows(config, caretCell.table.node).findIndex(
    (row) => row._key === caretCell.row.node._key,
  )
  const colIndex = rowCells(config, caretCell.row.node).findIndex(
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
  config: TableConfig,
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
        path: [...first.cellPath, config.valueField, {_key: firstBlock._key}],
      },
    }),
    focus: getBlockEndPoint({
      context,
      block: {
        node: lastBlock,
        path: [...last.cellPath, config.valueField, {_key: lastBlock._key}],
      },
    }),
  }
}
