import type {EditorSelection, EditorSnapshot} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {isActiveDecorator} from '@portabletext/editor/selectors'
import {isEqualSelectionPoints} from '@portabletext/editor/utils'
import {cellEndPoint, cellStartPoint} from '../cell-points'
import {memberCells, resolveTableSelection} from '../get-table-selection'

type Ranges = Array<NonNullable<EditorSelection>>

type RectangleDecorator = {
  decorator: string
  ranges: Ranges
  active: boolean
}

/**
 * A rectangular cell selection is represented as a linear anchor->focus
 * range, and the two disagree about membership: a column selection's linear
 * range covers every intermediate cell. Formatting events therefore get
 * re-raised once per member cell, each carrying an explicit `at`, instead of
 * acting on the linear range.
 *
 * Every guard bails when the event carries an explicit `at`: addressed
 * events (including our own re-raises) already know where to apply, so only
 * selection-scoped events need remapping. This is also what keeps the
 * re-raises from recursing.
 */
export const formatBehaviors = [
  defineBehavior<Record<string, never>, 'decorator.toggle', RectangleDecorator>(
    {
      on: 'decorator.toggle',
      guard: ({snapshot, event}) => {
        if (event.at) {
          return false
        }
        return resolveRectangleDecorator(snapshot, event.decorator)
      },
      actions: [
        (_, {decorator, ranges, active}) =>
          ranges.map((range) =>
            raise({
              // Toggling each member cell separately would checkerboard a
              // mixed rectangle. Aggregate first: if any member cell misses
              // the decorator, add it everywhere, otherwise remove it
              // everywhere.
              type: active ? 'decorator.remove' : 'decorator.add',
              decorator,
              at: range,
            }),
          ),
      ],
    },
  ),
  defineBehavior<Record<string, never>, 'decorator.add', Ranges>({
    on: 'decorator.add',
    guard: ({snapshot, event}) =>
      event.at ? false : rectangleRanges(snapshot),
    actions: [
      ({event}, ranges) => ranges.map((range) => raise({...event, at: range})),
    ],
  }),
  defineBehavior<Record<string, never>, 'decorator.remove', Ranges>({
    on: 'decorator.remove',
    guard: ({snapshot, event}) =>
      event.at ? false : rectangleRanges(snapshot),
    actions: [
      ({event}, ranges) => ranges.map((range) => raise({...event, at: range})),
    ],
  }),
]

/**
 * The content range of every member cell in the rectangle, or `false` when
 * the selection isn't a rectangle or no member cell has content.
 */
function rectangleRanges(snapshot: EditorSnapshot): Ranges | false {
  const resolved = resolveTableSelection(snapshot)
  if (!resolved) {
    return false
  }

  const ranges: Ranges = []
  for (const cell of memberCells(
    resolved.tableSelection,
    resolved.table.node,
  )) {
    const anchor = cellStartPoint(snapshot, cell.path)
    const focus = cellEndPoint(snapshot, cell.path)
    if (!anchor || !focus) {
      continue
    }
    if (isEqualSelectionPoints(anchor, focus)) {
      // An empty cell's content range is collapsed: there is nothing to
      // format, and active-state selectors would read the caret's mark
      // state instead of the cell's content.
      continue
    }
    ranges.push({anchor, focus})
  }
  return ranges.length > 0 ? ranges : false
}

function resolveRectangleDecorator(
  snapshot: EditorSnapshot,
  decorator: string,
): RectangleDecorator | false {
  const ranges = rectangleRanges(snapshot)
  if (!ranges) {
    return false
  }
  const active = ranges.every((range) =>
    isActiveDecorator(decorator)({
      ...snapshot,
      context: {...snapshot.context, selection: range},
    }),
  )
  return {decorator, ranges, active}
}
