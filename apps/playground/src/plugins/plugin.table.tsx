import {
  defineContainer,
  defineTextBlock,
  useEditor,
  useEditorSelector,
  type ContainerRenderProps,
} from '@portabletext/editor'
import {BehaviorPlugin, NodePlugin} from '@portabletext/editor/plugins'
import {getEnclosingBlock, getParent} from '@portabletext/editor/traversal'
import {isEqualPaths} from '@portabletext/editor/utils'
import {
  getTableSelection,
  isCell,
  isRow,
  isTable,
  tableBehaviors,
} from '@portabletext/plugin-table'
import {useMemo, type JSX} from 'react'
import {DragHandle} from './drag-handle'
import {ListItemBlock} from './list-item-block'
import {calloutContainer} from './plugin.callout'
import {cellImageLeaf} from './plugin.image'
import {cellStyle, type CellRange} from './table-cell-style'

const tableContainer = defineContainer({
  type: 'table',
  arrayField: 'rows',
  render: (props) => <TableContainer {...props} />,
  of: [
    defineContainer({
      type: 'row',
      arrayField: 'cells',
      render: ({attributes, children, selected}) => (
        <tr {...attributes} data-selected={selected ? '' : undefined}>
          {children}
        </tr>
      ),
      of: [
        defineContainer({
          type: 'cell',
          arrayField: 'value',
          render: (props) => <TableCell {...props} />,
          of: [
            defineTextBlock({
              type: 'block',
              render: ({attributes, children, node, path}) =>
                node.listItem !== undefined ? (
                  <ListItemBlock
                    attributes={attributes}
                    node={node}
                    path={path}
                    children={children}
                  />
                ) : (
                  <div {...attributes}>{children}</div>
                ),
            }),
            cellImageLeaf,
            calloutContainer,
          ],
        }),
      ],
    }),
  ],
})

export function TablePlugin(): JSX.Element {
  return (
    <>
      <NodePlugin nodes={[tableContainer]} />
      <BehaviorPlugin behaviors={tableBehaviors} />
    </>
  )
}

function TableContainer({
  attributes,
  children,
  node,
  path,
  readOnly,
  selected,
}: ContainerRenderProps): JSX.Element {
  const editor = useEditor()
  const table = isTable(node) ? node : undefined
  const columnCount = table?.rows[0]?.cells.length ?? 0
  const hasCellRange = useEditorSelector(editor, (snapshot) => {
    const selection = getTableSelection(snapshot)
    return selection ? isEqualPaths(selection.tablePath, path) : false
  })
  return (
    <div
      {...attributes}
      data-selected={selected ? '' : undefined}
      className="playground-table-chrome group"
    >
      <table
        className="playground-table cursor-text"
        data-cell-range={hasCellRange ? '' : undefined}
      >
        <colgroup>
          {Array.from({length: columnCount}, (_, index) => (
            <col key={index} />
          ))}
        </colgroup>
        <tbody>{children}</tbody>
      </table>
      <DragHandle readOnly={readOnly} />
    </div>
  )
}

type CellDescriptor = {
  rowIdx: number
  colIdx: number
  rowCount: number
  colCount: number
  isHeader: boolean
  range: CellRange | null
}

// Cells read the derived `getTableSelection` (a rectangle) and draw the grey
// grid + blue selection outline + overlay per cell. Position and header state
// come from resolving the cell -> row -> table by path.
function TableCell({
  attributes,
  children,
  path,
}: ContainerRenderProps): JSX.Element {
  const editor = useEditor()
  const descriptor = useEditorSelector(
    editor,
    (snapshot): CellDescriptor | null => {
      const cell = getEnclosingBlock(snapshot, path, {match: isCell})
      const row = cell && getParent(snapshot, cell.path, {match: isRow})
      const table = row && getParent(snapshot, row.path, {match: isTable})
      if (!cell || !row || !table) {
        return null
      }
      const rowIdx = table.node.rows.findIndex(
        (candidate) => candidate._key === row.node._key,
      )
      const colIdx = row.node.cells.findIndex(
        (candidate) => candidate._key === cell.node._key,
      )
      const selection = getTableSelection(snapshot)
      const range =
        selection && isEqualPaths(selection.tablePath, table.path)
          ? {
              r0: selection.rowRange[0],
              r1: selection.rowRange[1],
              c0: selection.colRange[0],
              c1: selection.colRange[1],
            }
          : null
      return {
        rowIdx,
        colIdx,
        rowCount: table.node.rows.length,
        colCount: table.node.rows[0]?.cells.length ?? 0,
        isHeader: (Number(table.node.headerRows) || 0) >= 1 && rowIdx === 0,
        range,
      }
    },
    isEqualCellDescriptor,
  )
  const style = useMemo(
    () => (descriptor ? cellStyle(descriptor) : undefined),
    [descriptor],
  )
  return (
    <td {...attributes} style={style}>
      {children}
    </td>
  )
}

function isEqualCellDescriptor(
  a: CellDescriptor | null,
  b: CellDescriptor | null,
): boolean {
  if (a === b) {
    return true
  }
  if (!a || !b) {
    return false
  }
  return (
    a.rowIdx === b.rowIdx &&
    a.colIdx === b.colIdx &&
    a.rowCount === b.rowCount &&
    a.colCount === b.colCount &&
    a.isHeader === b.isHeader &&
    isEqualCellRange(a.range, b.range)
  )
}

function isEqualCellRange(a: CellRange | null, b: CellRange | null): boolean {
  if (a === b) {
    return true
  }
  if (!a || !b) {
    return false
  }
  return a.r0 === b.r0 && a.r1 === b.r1 && a.c0 === b.c0 && a.c1 === b.c1
}
