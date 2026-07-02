import type {EditorSelection, EditorSnapshot} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {
  getSelectedTextBlocks,
  isActiveAnnotation,
  isActiveDecorator,
  isActiveListItem,
  isActiveStyle,
} from '@portabletext/editor/selectors'
import {getPathSubSchema} from '@portabletext/editor/traversal'
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

type SelectedTextBlocks = ReturnType<typeof getSelectedTextBlocks>

/**
 * A rectangular cell selection is represented as a linear anchor->focus
 * range, and the two disagree about membership: a column selection's linear
 * range covers every intermediate cell. Formatting events therefore get
 * re-raised once per member cell, each carrying an explicit `at`, instead of
 * acting on the linear range.
 *
 * The span-level guards (decorators, annotations) bail when the event
 * carries an explicit `at`: addressed events (including our own re-raises)
 * already know where to apply, so only selection-scoped events need
 * remapping. This is also what keeps the re-raises from recursing. The
 * block-level events (styles, list items) carry no `at` at all; their
 * decomposition terminates in path-addressed `block.set`/`block.unset`
 * primitives instead.
 */
export const formatBehaviors = [
  defineBehavior<
    Record<string, never>,
    'decorator.toggle',
    RectangleFormatting
  >({
    on: 'decorator.toggle',
    guard: ({snapshot, event}) => {
      if (event.at) {
        return false
      }
      const ranges = spanRanges(snapshot)
      return ranges
        ? resolveMembers(snapshot, ranges, isActiveDecorator(event.decorator))
        : false
    },
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
    guard: ({snapshot, event}) => {
      if (event.at) {
        return false
      }
      const ranges = spanRanges(snapshot)
      return ranges
        ? resolveMembers(
            snapshot,
            ranges,
            isActiveAnnotation(event.annotation.name),
          )
        : false
    },
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
  defineBehavior<Record<string, never>, 'style.toggle', {active: boolean}>({
    on: 'style.toggle',
    guard: ({snapshot, event}) => {
      const ranges = rectangleRanges(snapshot)
      return ranges
        ? resolveMembers(snapshot, ranges, isActiveStyle(event.style))
        : false
    },
    actions: [
      ({event}, {active}) => [
        // The re-raise is address-less and re-enters the interceptors
        // below, which decompose it per member cell.
        raise({
          type: active ? 'style.remove' : 'style.add',
          style: event.style,
        }),
      ],
    ],
  }),
  defineBehavior<Record<string, never>, 'list item.toggle', {active: boolean}>({
    on: 'list item.toggle',
    guard: ({snapshot, event}) => {
      const ranges = rectangleRanges(snapshot)
      return ranges
        ? resolveMembers(snapshot, ranges, isActiveListItem(event.listItem))
        : false
    },
    actions: [
      ({event}, {active}) => [
        raise({
          type: active ? 'list item.remove' : 'list item.add',
          listItem: event.listItem,
        }),
      ],
    ],
  }),
  // Keep in sync with core's `behavior.abstract.style.ts`, which decomposes
  // the selection-scoped style events into `block.set`/`block.unset` per
  // selected text block. Here they decompose over the member cells' ranges
  // instead of the linear selection.
  defineBehavior<Record<string, never>, 'style.add', SelectedTextBlocks>({
    on: 'style.add',
    guard: ({snapshot}) => rectangleTextBlocks(snapshot),
    actions: [
      ({event}, blocks) =>
        blocks.map((block) =>
          raise({
            type: 'block.set',
            at: block.path,
            props: {style: event.style},
          }),
        ),
    ],
  }),
  defineBehavior<Record<string, never>, 'style.remove', SelectedTextBlocks>({
    on: 'style.remove',
    guard: ({snapshot}) => rectangleTextBlocks(snapshot),
    actions: [
      (_, blocks) =>
        blocks.map((block) =>
          raise({type: 'block.unset', at: block.path, props: ['style']}),
        ),
    ],
  }),
  // Keep in sync with core's `behavior.abstract.list-item.ts`: adding only
  // touches blocks whose sub-schema declares the list, removing unsets both
  // `level` and `listItem`.
  defineBehavior<Record<string, never>, 'list item.add', SelectedTextBlocks>({
    on: 'list item.add',
    guard: ({snapshot, event}) => {
      const blocks = rectangleTextBlocks(snapshot)
      if (!blocks) {
        return false
      }
      const listBlocks = blocks.filter((block) =>
        getPathSubSchema(snapshot, block.path).lists.some(
          (list) => list.name === event.listItem,
        ),
      )
      return listBlocks.length > 0 ? listBlocks : false
    },
    actions: [
      ({event}, blocks) =>
        blocks.map((block) =>
          raise({
            type: 'block.set',
            at: block.path,
            props: {level: block.node.level ?? 1, listItem: event.listItem},
          }),
        ),
    ],
  }),
  defineBehavior<Record<string, never>, 'list item.remove', SelectedTextBlocks>(
    {
      on: 'list item.remove',
      guard: ({snapshot}) => rectangleTextBlocks(snapshot),
      actions: [
        (_, blocks) =>
          blocks.map((block) =>
            raise({
              type: 'block.unset',
              at: block.path,
              props: ['level', 'listItem'],
            }),
          ),
      ],
    },
  ),
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
    guard: ({snapshot, event}) => (event.at ? false : spanRanges(snapshot)),
    actions: [
      ({event}, ranges) => ranges.map((range) => raise({...event, at: range})),
    ],
  })
}

/**
 * Each range paired with whether the formatting is active on it, plus the
 * aggregate across all of them, so toggles can decide once and apply
 * uniformly. The active state comes from core's own selectors, evaluated
 * against each member cell's range.
 */
function resolveMembers(
  snapshot: EditorSnapshot,
  ranges: Ranges,
  isActive: (snapshot: EditorSnapshot) => boolean,
): RectangleFormatting {
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
 * The selected text blocks of every member cell, resolved per member-cell
 * range, or `false` when the selection isn't a rectangle. Block-level
 * formatting includes empty cells: their blocks are legitimately styleable.
 */
function rectangleTextBlocks(
  snapshot: EditorSnapshot,
): SelectedTextBlocks | false {
  const ranges = rectangleRanges(snapshot)
  if (!ranges) {
    return false
  }
  const blocks = ranges.flatMap((range) =>
    getSelectedTextBlocks({
      ...snapshot,
      context: {...snapshot.context, selection: range},
    }),
  )
  return blocks.length > 0 ? blocks : false
}

/**
 * Member ranges with content. Empty cells are excluded: there is nothing
 * span-level to format in them, and span-level active selectors would read
 * the caret's mark state instead of the cell's content.
 */
function spanRanges(snapshot: EditorSnapshot): Ranges | false {
  const ranges = rectangleRanges(snapshot)
  if (!ranges) {
    return false
  }
  const inhabited = ranges.filter(
    (range) => !isEqualSelectionPoints(range.anchor, range.focus),
  )
  return inhabited.length > 0 ? inhabited : false
}

/**
 * The content range of every member cell in the rectangle, or `false` when
 * the selection isn't a rectangle.
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
    ranges.push({anchor, focus})
  }
  return ranges.length > 0 ? ranges : false
}
