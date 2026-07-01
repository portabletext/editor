import type {EditorSelection, EditorSnapshot, Path} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {isSelectionCollapsed} from '@portabletext/editor/selectors'
import {
  getBlock,
  getChildren,
  getEnclosingBlock,
  getFirstChild,
  getLastChild,
} from '@portabletext/editor/traversal'
import {getBlockEndPoint, getBlockStartPoint} from '@portabletext/editor/utils'
import {createKeyboardShortcut} from '@portabletext/keyboard-shortcuts'
import {resolveCell} from '../resolve-cell'

type Dom = {getSelectionRect: (snapshot: EditorSnapshot) => DOMRect | null}
type Entry = {path: Path}

const tab = createKeyboardShortcut({
  default: [{key: 'Tab', alt: false, ctrl: false, meta: false, shift: false}],
})
const shiftTab = createKeyboardShortcut({
  default: [{key: 'Tab', alt: false, ctrl: false, meta: false, shift: true}],
})
const arrowDown = createKeyboardShortcut({
  default: [
    {key: 'ArrowDown', alt: false, ctrl: false, meta: false, shift: false},
  ],
})
const arrowUp = createKeyboardShortcut({
  default: [
    {key: 'ArrowUp', alt: false, ctrl: false, meta: false, shift: false},
  ],
})

export const navBehaviors = [
  // Tab: move to the start of the next cell, wrapping to the first cell of the
  // next row. At the last cell the guard fails, so Tab falls through to the
  // editor default and is not overwritten.
  defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) => {
      if (!tab.guard(event.originEvent)) {
        return false
      }
      const position = resolveFocusCell(snapshot)
      if (!position) {
        return false
      }
      const cells = getChildren(snapshot, position.row.path)
      const nextRow = adjacentRow(snapshot, position.table, position.row, 1)
      const target =
        cells[indexOf(cells, position.cell) + 1] ??
        (nextRow && getFirstChild(snapshot, nextRow.path))
      const at = target && cellStart(snapshot, target.path)
      return at ? {at} : false
    },
    actions: [(_, {at}) => [raise({type: 'select', at})]],
  }),

  // Shift+Tab: move to the start of the previous cell, wrapping to the last
  // cell of the previous row. At the first cell it falls through.
  defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) => {
      if (!shiftTab.guard(event.originEvent)) {
        return false
      }
      const position = resolveFocusCell(snapshot)
      if (!position) {
        return false
      }
      const cells = getChildren(snapshot, position.row.path)
      const columnIndex = indexOf(cells, position.cell)
      const previousRow = adjacentRow(
        snapshot,
        position.table,
        position.row,
        -1,
      )
      const target =
        (columnIndex > 0 ? cells[columnIndex - 1] : undefined) ??
        (previousRow && getLastChild(snapshot, previousRow.path))
      const at = target && cellStart(snapshot, target.path)
      return at ? {at} : false
    },
    actions: [(_, {at}) => [raise({type: 'select', at})]],
  }),

  // ArrowDown: when the caret is in the last block of a cell, move to the cell
  // directly below (same column). Otherwise fall through so the caret moves
  // within the cell.
  defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event, dom}) => {
      if (!arrowDown.guard(event.originEvent)) {
        return false
      }
      const position = resolveFocusCell(snapshot)
      if (!position || !focusAtCellEdge(snapshot, position.cell.path, 'last')) {
        return false
      }
      if (!focusOnVisualEdge(snapshot, dom, 'last')) {
        return false
      }
      const rowBelow = adjacentRow(snapshot, position.table, position.row, 1)
      const target =
        rowBelow &&
        sameColumnCell(snapshot, position.cell, position.row, rowBelow)
      const at = target && cellStart(snapshot, target.path)
      return at ? {at} : false
    },
    actions: [(_, {at}) => [raise({type: 'select', at})]],
  }),

  // ArrowUp: when the caret is in the first block of a cell, move to the cell
  // directly above (same column). Otherwise fall through.
  defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event, dom}) => {
      if (!arrowUp.guard(event.originEvent)) {
        return false
      }
      const position = resolveFocusCell(snapshot)
      if (
        !position ||
        !focusAtCellEdge(snapshot, position.cell.path, 'first')
      ) {
        return false
      }
      if (!focusOnVisualEdge(snapshot, dom, 'first')) {
        return false
      }
      const rowAbove = adjacentRow(snapshot, position.table, position.row, -1)
      const target =
        rowAbove &&
        sameColumnCell(snapshot, position.cell, position.row, rowAbove)
      const at = target && cellEnd(snapshot, target.path)
      return at ? {at} : false
    },
    actions: [(_, {at}) => [raise({type: 'select', at})]],
  }),
]

/**
 * The table cell the collapsed selection focus sits in, with its enclosing row
 * and table. Returns `undefined` when the focus isn't inside a cell.
 */
function resolveFocusCell(snapshot: EditorSnapshot) {
  const selection = snapshot.context.selection
  if (!selection || !isSelectionCollapsed(snapshot)) {
    return undefined
  }
  return resolveCell(snapshot, selection.focus.path)
}

/** A collapsed selection at the start of the cell's first block. */
function cellStart(
  snapshot: EditorSnapshot,
  cellPath: Path,
): EditorSelection | undefined {
  const firstChild = getFirstChild(snapshot, cellPath)
  const firstBlock = firstChild && getBlock(snapshot, firstChild.path)
  if (!firstBlock) {
    return undefined
  }
  const point = getBlockStartPoint({
    context: snapshot.context,
    block: firstBlock,
  })
  return {anchor: point, focus: point}
}

/** A collapsed selection at the end of the cell's last block. */
function cellEnd(
  snapshot: EditorSnapshot,
  cellPath: Path,
): EditorSelection | undefined {
  const lastChild = getLastChild(snapshot, cellPath)
  const lastBlock = lastChild && getBlock(snapshot, lastChild.path)
  if (!lastBlock) {
    return undefined
  }
  const point = getBlockEndPoint({context: snapshot.context, block: lastBlock})
  return {anchor: point, focus: point}
}

/** Whether the focus sits in the cell's first (or last) block. */
function focusAtCellEdge(
  snapshot: EditorSnapshot,
  cellPath: Path,
  edge: 'first' | 'last',
): boolean {
  const selection = snapshot.context.selection
  if (!selection) {
    return false
  }
  const focusBlock = getEnclosingBlock(snapshot, selection.focus.path)
  const edgeBlock =
    edge === 'first'
      ? getFirstChild(snapshot, cellPath)
      : getLastChild(snapshot, cellPath)
  return (
    !!focusBlock &&
    !!edgeBlock &&
    getKey(focusBlock.path) === getKey(edgeBlock.path)
  )
}

/**
 * Whether the caret sits on the first (or last) visual line of its block. The
 * caret's client rect and the block edge point's rect share a vertical band
 * when they render on the same line. Returns `false` when either rect can't be
 * measured, e.g. the selection isn't currently rendered.
 */
function focusOnVisualEdge(
  snapshot: EditorSnapshot,
  dom: Dom,
  edge: 'first' | 'last',
): boolean {
  const selection = snapshot.context.selection
  if (!selection) {
    return false
  }
  const focusBlock = getEnclosingBlock(snapshot, selection.focus.path)
  if (!focusBlock) {
    return false
  }
  const edgePoint =
    edge === 'first'
      ? getBlockStartPoint({context: snapshot.context, block: focusBlock})
      : getBlockEndPoint({context: snapshot.context, block: focusBlock})
  const caretRect = dom.getSelectionRect(snapshot)
  const edgeRect = dom.getSelectionRect({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: {anchor: edgePoint, focus: edgePoint},
    },
  })
  return !!caretRect && !!edgeRect && sameLine(caretRect, edgeRect)
}

/** The row `offset` positions above (-1) or below (+1) `row` in `table`. */
function adjacentRow(
  snapshot: EditorSnapshot,
  table: Entry,
  row: Entry,
  offset: 1 | -1,
): Entry | undefined {
  const rows = getChildren(snapshot, table.path)
  const index = indexOf(rows, row) + offset
  return index >= 0 ? rows[index] : undefined
}

/** The cell in `adjacentRow` sharing `cell`'s column, clamped to the row width. */
function sameColumnCell(
  snapshot: EditorSnapshot,
  cell: Entry,
  row: Entry,
  adjacentRow: Entry,
): Entry | undefined {
  const columnIndex = indexOf(getChildren(snapshot, row.path), cell)
  const cells = getChildren(snapshot, adjacentRow.path)
  return cells[Math.min(columnIndex, cells.length - 1)]
}

/** Whether two client rects share a vertical band, i.e. render on one line. */
function sameLine(first: DOMRect, second: DOMRect): boolean {
  return withinBand(first, second) && withinBand(second, first)
}

function withinBand(rect: DOMRect, compareRect: DOMRect): boolean {
  const middle = (compareRect.top + compareRect.bottom) / 2
  return rect.top <= middle && rect.bottom >= middle
}

/** The index of `entry` among `entries`, matched by keyed path segment. */
function indexOf(entries: Array<Entry>, entry: Entry): number {
  return entries.findIndex(
    (candidate) => getKey(candidate.path) === getKey(entry.path),
  )
}

/** The `_key` of a path's last keyed segment. */
function getKey(path: Path): string | undefined {
  const segment = path.at(-1)
  return typeof segment === 'object' && segment !== null && '_key' in segment
    ? segment._key
    : undefined
}
