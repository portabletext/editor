import type {
  EditorSelection,
  EditorSelectionPoint,
  EditorSnapshot,
  PortableTextBlock,
  Path,
} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {
  getFocusBlockObject,
  getFocusTextBlock,
  isSelectionCollapsed,
} from '@portabletext/editor/selectors'
import {
  getChildren,
  getEnclosingBlock,
  getFirstChild,
  getLastChild,
  getSibling,
} from '@portabletext/editor/traversal'
import {
  getBlockEndPoint,
  getBlockStartPoint,
  isEqualPaths,
} from '@portabletext/editor/utils'
import {createKeyboardShortcut} from '@portabletext/keyboard-shortcuts'
import {cellEndPoint, cellStartPoint} from '../cell-points'
import {resolveCell} from '../resolve-cell'
import type {TableConfig} from '../table-config'

type Dom = {
  getSelectionRect: (snapshot: EditorSnapshot) => DOMRect | null
  getPointAtCoordinates: (coordinates: {
    x: number
    y: number
  }) => EditorSelectionPoint | null
}
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

export function createNavBehaviors(config: TableConfig) {
  return [
    // Tab: move to the start of the next cell, wrapping to the first cell of the
    // next row. At the last cell the guard fails, so Tab falls through to the
    // editor default and is not overwritten.
    defineBehavior({
      on: 'keyboard.keydown',
      guard: ({snapshot, event}) => {
        if (!tab.guard(event.originEvent)) {
          return false
        }
        if (getFocusTextBlock(snapshot)?.node.listItem !== undefined) {
          // Core owns `Tab` on list items (indent); cell navigation yields.
          return false
        }
        const position = resolveFocusCell(config, snapshot)
        if (!position) {
          return false
        }
        const cells = getChildren(snapshot, position.row.path)
        const nextRow = getSibling(snapshot, position.row.path, {
          direction: 'next',
        })
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
        if (getFocusTextBlock(snapshot)?.node.listItem !== undefined) {
          // Same yield as `Tab`: core unindents list items on `Shift+Tab`.
          return false
        }
        const position = resolveFocusCell(config, snapshot)
        if (!position) {
          return false
        }
        const cells = getChildren(snapshot, position.row.path)
        const columnIndex = indexOf(cells, position.cell)
        const previousRow = getSibling(snapshot, position.row.path, {
          direction: 'previous',
        })
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
    defineBehavior<
      Record<string, never>,
      'keyboard.keydown',
      {at: NonNullable<EditorSelection>} | {escapeTablePath: Path}
    >({
      on: 'keyboard.keydown',
      guard: ({snapshot, event, dom}) => {
        if (!arrowDown.guard(event.originEvent)) {
          return false
        }
        if (getFocusBlockObject(snapshot)) {
          // The engine's lonely-block-object escape owns arrows on a
          // focused block object: it inserts a text block beside it,
          // inside the cell.
          return false
        }
        const position = resolveFocusCell(config, snapshot)
        if (
          !position ||
          !focusAtCellEdge(snapshot, position.cell.path, 'last')
        ) {
          return false
        }
        if (!focusOnVisualEdge(snapshot, dom, 'last')) {
          return false
        }
        const rowBelow = getSibling(snapshot, position.row.path, {
          direction: 'next',
        })
        if (!rowBelow) {
          const siblingBelow = getSibling(snapshot, position.table.path, {
            direction: 'next',
          })
          if (siblingBelow) {
            // Native ArrowDown at the bottom row walks forward through the
            // cells instead of exiting, so the plugin owns the move into
            // the sibling below.
            const at = blockEntrySelection(snapshot, dom, siblingBelow, 'first')
            return at ? {at} : false
          }
          // Nothing below the table: escape it, the way block objects do.
          return {escapeTablePath: position.table.path}
        }
        const target = sameColumnCell(
          snapshot,
          position.cell,
          position.row,
          rowBelow,
        )
        const at =
          target &&
          cellEntrySelection(config, snapshot, dom, target.path, 'first')
        if (!at) {
          return false
        }
        return {at}
      },
      actions: [
        ({snapshot}, result) =>
          'at' in result
            ? [raise({type: 'select', at: result.at})]
            : [escapeTableAction(snapshot, result.escapeTablePath, 'after')],
      ],
    }),

    // ArrowUp: when the caret is in the first block of a cell, move to the cell
    // directly above (same column). Otherwise fall through.
    defineBehavior<
      Record<string, never>,
      'keyboard.keydown',
      {at: NonNullable<EditorSelection>} | {escapeTablePath: Path}
    >({
      on: 'keyboard.keydown',
      guard: ({snapshot, event, dom}) => {
        if (!arrowUp.guard(event.originEvent)) {
          return false
        }
        if (getFocusBlockObject(snapshot)) {
          // Same split as ArrowDown: block objects escape, they don't
          // navigate.
          return false
        }
        const position = resolveFocusCell(config, snapshot)
        if (
          !position ||
          !focusAtCellEdge(snapshot, position.cell.path, 'first')
        ) {
          return false
        }
        if (!focusOnVisualEdge(snapshot, dom, 'first')) {
          return false
        }
        const rowAbove = getSibling(snapshot, position.row.path, {
          direction: 'previous',
        })
        if (!rowAbove) {
          const siblingAbove = getSibling(snapshot, position.table.path, {
            direction: 'previous',
          })
          if (siblingAbove) {
            // Native ArrowUp at the top row walks backwards through the
            // cells instead of exiting, so the plugin owns the move into
            // the sibling above.
            const at = blockEntrySelection(snapshot, dom, siblingAbove, 'last')
            return at ? {at} : false
          }
          // Nothing above the table: escape it, the way block objects do.
          return {escapeTablePath: position.table.path}
        }
        const target = sameColumnCell(
          snapshot,
          position.cell,
          position.row,
          rowAbove,
        )
        const at =
          target &&
          cellEntrySelection(config, snapshot, dom, target.path, 'last')
        if (!at) {
          return false
        }
        return {at}
      },
      actions: [
        ({snapshot}, result) =>
          'at' in result
            ? [raise({type: 'select', at: result.at})]
            : [escapeTableAction(snapshot, result.escapeTablePath, 'before')],
      ],
    }),
  ]
}

/**
 * Insert an empty text block beyond the table and move the caret into it.
 * Arrow navigation at a table edge with no sibling to land in would
 * otherwise trap the caret.
 */
function escapeTableAction(
  snapshot: EditorSnapshot,
  tablePath: Path,
  placement: 'before' | 'after',
) {
  return raise({
    type: 'insert.block',
    block: {_type: snapshot.context.schema.block.name},
    placement,
    at: {
      anchor: {path: tablePath, offset: 0},
      focus: {path: tablePath, offset: 0},
    },
    select: 'start',
  })
}

/**
 * The table cell the collapsed selection focus sits in, with its enclosing row
 * and table. Returns `undefined` when the focus isn't inside a cell.
 */
function resolveFocusCell(config: TableConfig, snapshot: EditorSnapshot) {
  const selection = snapshot.context.selection
  if (!selection || !isSelectionCollapsed(snapshot)) {
    return undefined
  }
  return resolveCell(snapshot, selection.focus.path, config)
}

/** A collapsed selection at the start of the cell's first block. */
function cellStart(
  snapshot: EditorSnapshot,
  cellPath: Path,
): EditorSelection | undefined {
  const point = cellStartPoint(snapshot, cellPath)
  return point && {anchor: point, focus: point}
}

/** A collapsed selection at the end of the cell's last block. */
function cellEnd(
  snapshot: EditorSnapshot,
  cellPath: Path,
): EditorSelection | undefined {
  const point = cellEndPoint(snapshot, cellPath)
  return point && {anchor: point, focus: point}
}

/**
 * A collapsed selection in the cell, at the caret's current x where possible:
 * hit-tests the caret's x on the cell's first (or last) line and uses the
 * resolved point when it lands inside the cell. Falls back to the start (or
 * end) of the cell, e.g. when the cell is narrower than the caret's x.
 */
function cellEntrySelection(
  config: TableConfig,
  snapshot: EditorSnapshot,
  dom: Dom,
  cellPath: Path,
  edge: 'first' | 'last',
): EditorSelection | undefined {
  const fallback =
    edge === 'first'
      ? cellStart(snapshot, cellPath)
      : cellEnd(snapshot, cellPath)
  if (!fallback) {
    return undefined
  }
  const caretRect = dom.getSelectionRect(snapshot)
  const entryLineRect = dom.getSelectionRect({
    ...snapshot,
    context: {...snapshot.context, selection: fallback},
  })
  if (!caretRect || !entryLineRect) {
    return fallback
  }
  const point = dom.getPointAtCoordinates({
    x: caretRect.left,
    y: entryLineRect.top + entryLineRect.height / 2,
  })
  const resolved = point && resolveCell(snapshot, point.path, config)
  if (!resolved || !isEqualPaths(resolved.cell.path, cellPath)) {
    return fallback
  }
  return {anchor: point, focus: point}
}

/**
 * A collapsed selection in a sibling block outside the table, at the
 * caret's current x where possible, the same hit-testing idiom as
 * `cellEntrySelection`. Falls back to the block's edge point, e.g. when
 * the rects cannot be measured.
 */
function blockEntrySelection(
  snapshot: EditorSnapshot,
  dom: Dom,
  sibling: {node: unknown; path: Path},
  edge: 'first' | 'last',
): EditorSelection | undefined {
  const block = {
    // A root-level sibling is a block by the data model; the traversal
    // node union cannot prove it.
    node: sibling.node as PortableTextBlock,
    path: sibling.path,
  }
  const edgePoint =
    edge === 'first'
      ? getBlockStartPoint({context: snapshot.context, block})
      : getBlockEndPoint({context: snapshot.context, block})
  const fallback = {anchor: edgePoint, focus: edgePoint}
  const caretRect = dom.getSelectionRect(snapshot)
  const entryLineRect = dom.getSelectionRect({
    ...snapshot,
    context: {...snapshot.context, selection: fallback},
  })
  if (!caretRect || !entryLineRect) {
    return fallback
  }
  const point = dom.getPointAtCoordinates({
    x: caretRect.left,
    y: entryLineRect.top + entryLineRect.height / 2,
  })
  const pointRootSegment = point?.path[0]
  const blockRootSegment = block.path[0]
  if (
    !point ||
    pointRootSegment === undefined ||
    blockRootSegment === undefined ||
    !isEqualPaths([pointRootSegment], [blockRootSegment])
  ) {
    return fallback
  }
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
    !!focusBlock && !!edgeBlock && isEqualPaths(focusBlock.path, edgeBlock.path)
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
/** The cell in `neighborRow` sharing `cell`'s column, clamped to the row width. */
function sameColumnCell(
  snapshot: EditorSnapshot,
  cell: Entry,
  row: Entry,
  neighborRow: Entry,
): Entry | undefined {
  const columnIndex = indexOf(getChildren(snapshot, row.path), cell)
  const cells = getChildren(snapshot, neighborRow.path)
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

/** The index of `entry` among `entries`. */
function indexOf(entries: Array<Entry>, entry: Entry): number {
  return entries.findIndex((candidate) =>
    isEqualPaths(candidate.path, entry.path),
  )
}
