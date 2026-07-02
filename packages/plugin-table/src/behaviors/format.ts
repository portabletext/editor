import type {EditorSelection, EditorSnapshot} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {isActiveDecorator} from '@portabletext/editor/selectors'
import {isEqualSelectionPoints} from '@portabletext/editor/utils'
import {cellEndPoint, cellStartPoint} from '../cell-points'
import {memberCells, resolveTableSelection} from '../get-table-selection'

type RectangleDecorator = {
  decorator: string
  ranges: Array<NonNullable<EditorSelection>>
  active: boolean
}

/**
 * A rectangular cell selection is represented as a linear anchor->focus
 * range, and the two disagree about membership: a column selection's linear
 * range covers every intermediate cell. Formatting events therefore get
 * re-raised once per member cell, each carrying an explicit `at`, instead of
 * acting on the linear range.
 */
export const formatBehaviors = [
  defineBehavior<Record<string, never>, 'decorator.toggle', RectangleDecorator>(
    {
      on: 'decorator.toggle',
      guard: ({snapshot, event}) => {
        if (event.at) {
          // Addressed events (including our own re-raises) already know
          // where to apply; only selection-scoped events need remapping.
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
]

function resolveRectangleDecorator(
  snapshot: EditorSnapshot,
  decorator: string,
): RectangleDecorator | false {
  const resolved = resolveTableSelection(snapshot)
  if (!resolved) {
    return false
  }

  const ranges: Array<NonNullable<EditorSelection>> = []
  let active = true
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
      // decorate, and `isActiveDecorator` would read the caret's mark state
      // instead of the cell's content.
      continue
    }
    const range = {anchor, focus}
    ranges.push(range)
    if (
      !isActiveDecorator(decorator)({
        ...snapshot,
        context: {...snapshot.context, selection: range},
      })
    ) {
      active = false
    }
  }
  if (ranges.length === 0) {
    return false
  }
  return {decorator, ranges, active}
}
