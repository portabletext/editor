import type {KeyedSegment, Path} from '@portabletext/patches'
import {childAtTextOffset, textOffsetOfChild} from './lib/child-text-offset'
import {isKeyedSegment} from './lib/is-keyed-segment'
import {pathContains} from './lib/path-contains'
import {pathEquals} from './lib/path-equals'

/**
 * A step's own path never carries a numeric or tuple segment: a producer
 * holding a numeric path resolves it to keys before emitting a step, so
 * every step path compares by key identity, never by array position.
 */
export type StepPath = Array<string | KeyedSegment>

/**
 * A position in a Portable Text document: a path plus a UTF-16 offset.
 * Point paths use the full `Path` union; the names-only restriction
 * applies to step paths, not points.
 * @public
 */
export type Point = {path: Path; offset: number}

/**
 * A span of a Portable Text document, marked by an `anchor` and a
 * `focus` point.
 * @public
 */
export type Range = {anchor: Point; focus: Point}

/**
 * Text was inserted into a span, `length` UTF-16 units of it starting at
 * `offset`.
 * @public
 */
export type InsertTextStep = {
  type: 'insert.text'
  path: StepPath
  offset: number
  length: number
}

/**
 * Text was removed from a span, `length` UTF-16 units of it starting at
 * `offset`.
 * @public
 */
export type RemoveTextStep = {
  type: 'remove.text'
  path: StepPath
  offset: number
  length: number
}

/**
 * A point strictly inside `from` always rides to `to` with its relative
 * offset. A point exactly at either edge of `from` rides under
 * `'forward'` affinity (the default) and stays under `'backward'`.
 * @public
 */
export type MoveTextStep = {
  type: 'move.text'
  from: {path: StepPath; offset: number; length: number}
  to: {path: StepPath; offset: number}
}

/**
 * A node (a block, or a child within one) was removed.
 * @public
 */
export type RemoveNodeStep = {
  type: 'remove.node'
  path: StepPath
}

/**
 * A node moved from one array position to another, addressed by key
 * rather than index on both ends.
 * @public
 */
export type MoveNodeStep = {
  type: 'move.node'
  from: StepPath
  to: StepPath
}

/**
 * `length` is the new text's length, not its content: the mapper only
 * ever reads `.length` (the offset clamps to zero, which is also how
 * text removed outright maps).
 * @public
 */
export type SetTextStep = {
  type: 'set.text'
  path: StepPath
  length: number
}

/**
 * `field` names the array property the replaced children belong to
 * (`'children'` for a block's spans, or a container's own registered
 * array field): `path` alone cannot name which of a node's arrays was
 * swapped once a node holds more than one. Children are typed to
 * exactly what the mapping reads: `_key` to follow identity, `text` to
 * clamp an offset against a surviving span's new length.
 * @public
 */
export type SetChildrenStep = {
  type: 'set.children'
  path: StepPath
  field: string
  oldChildren: Array<{_key: string; text?: string}>
  newChildren: Array<{_key: string; text?: string}>
}

/**
 * `path` ends at the renamed node itself, addressed by its OLD key: the
 * node's own segment is only rewritten at that exact address, never
 * wherever the key value happens to recur. A rename only ever touches one
 * node; matching by key value alone would also rewrite an unrelated point
 * that merely walks through a same-keyed node elsewhere in the tree (a
 * duplicate-key merge's destination block, most notably, since it starts
 * out sharing every key the donor block does).
 * @public
 */
export type SetKeyStep = {
  type: 'set.key'
  path: StepPath
  newKey: string
}

/**
 * The union of every step kind a transaction can produce.
 * @public
 */
export type Step =
  | InsertTextStep
  | RemoveTextStep
  | MoveTextStep
  | RemoveNodeStep
  | MoveNodeStep
  | SetTextStep
  | SetChildrenStep
  | SetKeyStep

/**
 * Map a point through one step. Returns the same `point` reference when the
 * step doesn't actually move the point, so callers can use referential
 * equality to detect "nothing changed."
 */
export function mapPointThroughStep(
  step: Step,
  point: Point | null,
  options?: {affinity?: 'forward' | 'backward'},
): Point | null {
  if (point === null) {
    return null
  }

  const {affinity = 'forward'} = options ?? {}

  switch (step.type) {
    case 'insert.text': {
      if (
        pathEquals(step.path, point.path) &&
        (step.offset < point.offset ||
          (step.offset === point.offset && affinity === 'forward'))
      ) {
        return {path: point.path, offset: point.offset + step.length}
      }

      return point
    }

    case 'remove.text': {
      if (pathEquals(step.path, point.path) && step.offset <= point.offset) {
        return {
          path: point.path,
          offset:
            point.offset - Math.min(point.offset - step.offset, step.length),
        }
      }

      return point
    }

    case 'set.text': {
      if (!pathEquals(step.path, point.path)) {
        return point
      }

      const offset = point.offset > step.length ? step.length : point.offset

      if (offset === point.offset) {
        return point
      }

      return {path: point.path, offset}
    }

    case 'set.key': {
      if (
        point.path.length < step.path.length ||
        !pathEquals(point.path.slice(0, step.path.length), step.path)
      ) {
        return point
      }

      return {
        path: [
          ...step.path.slice(0, -1),
          {_key: step.newKey},
          ...point.path.slice(step.path.length),
        ],
        offset: point.offset,
      }
    }

    case 'set.children': {
      const remapped = remapPointThroughChildrenReplacement(
        point,
        step.path,
        step.field,
        step.newChildren,
        step.oldChildren,
      )

      return remapped ?? point
    }

    case 'remove.node': {
      if (pathContains(step.path, point.path)) {
        return null
      }

      return point
    }

    case 'move.text': {
      if (!pathEquals(step.from.path, point.path)) {
        return point
      }

      const atStart = point.offset === step.from.offset
      const atEnd = point.offset === step.from.offset + step.from.length
      const insideRange =
        step.from.offset < point.offset &&
        point.offset < step.from.offset + step.from.length
      const rides =
        insideRange || ((atStart || atEnd) && affinity === 'forward')

      if (!rides) {
        return point
      }

      return {
        path: step.to.path,
        offset: step.to.offset + (point.offset - step.from.offset),
      }
    }

    case 'move.node': {
      if (pathContains(step.from, point.path)) {
        return {
          path: [...step.to, ...point.path.slice(step.from.length)],
          offset: point.offset,
        }
      }

      return point
    }
  }
}

/**
 * Map a point through a batch of steps, in order. A step that invalidates
 * the point (a node removal) short-circuits the remaining steps.
 *
 * `options.affinity` defaults to `'forward'`: say it loudly, a point
 * exactly at an insertion offset moves with the insertion by default.
 * Pass `'backward'` to have it stay instead.
 * @public
 */
export function mapPoint(
  steps: ReadonlyArray<Step>,
  point: Point | null,
  options?: {affinity?: 'forward' | 'backward'},
): Point | null {
  let current = point

  for (const step of steps) {
    if (current === null) {
      return null
    }
    current = mapPointThroughStep(step, current, options)
  }

  return current
}

/**
 * Map a range through a batch of steps with inward affinity: the anchor
 * rides forward, the focus rides backward, so text inserted exactly at a
 * range edge lands outside the range rather than being swallowed into it.
 * This assumes a normalized forward range (anchor before focus);
 * consumers normalize a backward range before calling.
 *
 * A collapsed range (anchor and focus at the same address) maps both ends
 * with backward affinity instead, so it can never inflate into an
 * inverted range at an insertion point.
 *
 * Returns `null` when either end is lost. Output for a backward range
 * (anchor after focus) is unspecified.
 * @public
 */
export function mapRange(
  steps: ReadonlyArray<Step>,
  range: Range,
): Range | null {
  const isCollapsed =
    pathEquals(range.anchor.path, range.focus.path) &&
    range.anchor.offset === range.focus.offset

  if (isCollapsed) {
    const point = mapPoint(steps, range.anchor, {
      affinity: 'backward',
    })
    return point === null ? null : {anchor: point, focus: point}
  }

  const anchor = mapPoint(steps, range.anchor, {
    affinity: 'forward',
  })
  const focus = mapPoint(steps, range.focus, {
    affinity: 'backward',
  })

  if (anchor === null || focus === null) {
    return null
  }

  return {anchor, focus}
}

/**
 * Map a point through a wholesale children replacement via its text
 * offset within the node. A surviving key (identity intact) only ever
 * needs its offset clamped to the surviving child's new `text` length;
 * beyond that, returns `undefined` (leave the point untransformed) unless
 * every precondition for the vanished-key remap holds: the point
 * addresses a direct child of the node's `field` array, that child's key
 * is gone from the new children, and the old and new children carry
 * identical concatenated span text, the condition that makes offset
 * mapping lossless.
 *
 * Spans are detected structurally (`text` being a string) rather than
 * through the schema: this mapper is deliberately schema-free, and
 * text-carrying children are the only ones that occupy offsets.
 *
 * The offset arithmetic is a verbatim copy of the editor's own
 * `util.child-text-offset.ts` (shared there with `util.block-offset.ts`);
 * drift in the boundary convention (an offset landing exactly on a span
 * boundary stays at the end of the earlier span) is caught by the pinned
 * boundary tests. Only the span detection differs: structural here,
 * schema-based elsewhere.
 *
 * A container's own array field may also hold blocks rather than spans.
 * The text requirement makes that a no-op by construction: blocks carry
 * no `text` of their own, so a point addressing a replaced block bails
 * at the offset walk, and points deeper inside such blocks fail the
 * direct-child path guard.
 */
function remapPointThroughChildrenReplacement(
  point: Point,
  nodePath: StepPath,
  field: string,
  newChildren: Array<{_key: string; text?: string}>,
  oldChildren: Array<{_key: string; text?: string}>,
): Point | undefined {
  if (
    point.path.length !== nodePath.length + 2 ||
    !pathEquals(point.path.slice(0, nodePath.length), nodePath) ||
    point.path[nodePath.length] !== field
  ) {
    return undefined
  }

  const pointSegment = point.path[point.path.length - 1]
  if (!isKeyedSegment(pointSegment)) {
    return undefined
  }

  const survivingChild = newChildren.find(
    (child) => child._key === pointSegment._key,
  )
  if (survivingChild !== undefined) {
    if (
      typeof survivingChild.text === 'string' &&
      point.offset > survivingChild.text.length
    ) {
      // The point's span survived the replacement, but shrank out from
      // under the offset; clamp to the new length.
      return {path: point.path, offset: survivingChild.text.length}
    }

    // The point's span survived the replacement; identity wins over
    // offset mapping.
    return undefined
  }

  const getSpanText = (child: unknown) => (child as {text?: string}).text

  const nodeTextOffset = textOffsetOfChild(
    oldChildren,
    getSpanText,
    pointSegment._key,
    point.offset,
  )
  if (nodeTextOffset === undefined) {
    return undefined
  }

  if (concatenatedText(oldChildren) !== concatenatedText(newChildren)) {
    return undefined
  }

  const placed = childAtTextOffset(newChildren, getSpanText, nodeTextOffset)
  if (placed === undefined) {
    return undefined
  }

  return {
    path: [...nodePath, field, {_key: placed.key}],
    offset: placed.offset,
  }
}

function concatenatedText(children: Array<{text?: string}>): string {
  let text = ''
  for (const child of children) {
    if (child.text !== undefined) {
      text += child.text
    }
  }
  return text
}
