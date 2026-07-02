import type {EditorSelection, EditorSnapshot} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {
  isActiveAnnotation,
  isActiveDecorator,
} from '@portabletext/editor/selectors'
import {isEqualSelectionPoints} from '@portabletext/editor/utils'
import {cellEndPoint, cellStartPoint} from '../cell-points'
import {memberCells, resolveTableSelection} from '../get-table-selection'

type Ranges = Array<NonNullable<EditorSelection>>

type MemberRange = {
  range: NonNullable<EditorSelection>
  active: boolean
}

type RectangleFormatting = {
  members: Array<MemberRange>
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
  defineBehavior<
    Record<string, never>,
    'decorator.toggle',
    RectangleFormatting
  >({
    on: 'decorator.toggle',
    guard: ({snapshot, event}) =>
      event.at
        ? false
        : resolveRectangleFormatting(
            snapshot,
            isActiveDecorator(event.decorator),
          ),
    actions: [
      ({event}, {members, active}) =>
        // Toggling each member cell separately would checkerboard a mixed
        // rectangle. Aggregate first: if any member cell misses the
        // decorator, add it where missing, otherwise remove it everywhere.
        members
          .filter((member) => (active ? true : !member.active))
          .map((member) =>
            raise({
              type: active ? 'decorator.remove' : 'decorator.add',
              decorator: event.decorator,
              at: member.range,
            }),
          ),
    ],
  }),
  defineBehavior<
    Record<string, never>,
    'annotation.toggle',
    RectangleFormatting
  >({
    on: 'annotation.toggle',
    guard: ({snapshot, event}) =>
      event.at
        ? false
        : resolveRectangleFormatting(
            snapshot,
            isActiveAnnotation(event.annotation.name),
          ),
    actions: [
      ({event}, {members, active}) =>
        // Unlike decorator marks, annotations are not set-semantic: every
        // `annotation.add` mints a new markDef. The add branch must skip
        // members that are already active, or a mixed rectangle would
        // stack a second annotation onto them.
        members
          .filter((member) => (active ? true : !member.active))
          .map((member) =>
            active
              ? raise({
                  type: 'annotation.remove',
                  annotation: {name: event.annotation.name},
                  at: member.range,
                })
              : raise({
                  type: 'annotation.add',
                  annotation: event.annotation,
                  at: member.range,
                }),
          ),
    ],
  }),
  fanOutOverRectangle('decorator.add'),
  fanOutOverRectangle('decorator.remove'),
  fanOutOverRectangle('annotation.add'),
  fanOutOverRectangle('annotation.remove'),
]

/**
 * Re-raise the event once per member cell. No aggregate is involved: add
 * adds and remove removes.
 */
function fanOutOverRectangle<
  TEventType extends
    | 'decorator.add'
    | 'decorator.remove'
    | 'annotation.add'
    | 'annotation.remove',
>(on: TEventType) {
  return defineBehavior<Record<string, never>, TEventType, Ranges>({
    on,
    guard: ({snapshot, event}) =>
      event.at ? false : rectangleRanges(snapshot),
    actions: [
      ({event}, ranges) => ranges.map((range) => raise({...event, at: range})),
    ],
  })
}

/**
 * The member-cell content ranges together with whether the formatting is
 * active on each and across all of them, so toggles can aggregate first and
 * apply uniformly. The active state comes from core's own selector,
 * evaluated against each member cell's range.
 */
function resolveRectangleFormatting(
  snapshot: EditorSnapshot,
  isActive: (snapshot: EditorSnapshot) => boolean,
): RectangleFormatting | false {
  const ranges = rectangleRanges(snapshot)
  if (!ranges) {
    return false
  }
  const members = ranges.map((range) => ({
    range,
    active: isActive({
      ...snapshot,
      context: {...snapshot.context, selection: range},
    }),
  }))
  return {members, active: members.every((member) => member.active)}
}

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
