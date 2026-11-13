import type {KeyedSegment, Path} from '@portabletext/patches'
import {childAtTextOffset, textOffsetOfChild} from './lib/child-text-offset'
import {arrayIndex, arraySegments, isRecord} from './lib/document'
import {isKeyedSegment} from './lib/is-keyed-segment'
import {pathContains} from './lib/path-contains'
import {pathEquals} from './lib/path-equals'

/**
 * A node address uses a unique non-empty key when available, otherwise its
 * index among siblings.
 */
export type StepPath = Array<string | number | KeyedSegment>

/**
 * A position in a Portable Text document: a path plus a UTF-16 offset.
 * Point paths use the full `Path` union.
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
 * A point strictly inside `from` always follows the moved text. At the
 * boundaries, the start follows with forward affinity and the end follows
 * with backward affinity: each affinity attaches the point to the moved
 * character on its side.
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
 * exactly what the mapping reads: an optional `_key` to follow identity, `text` to
 * clamp an offset against a surviving span's new length.
 * @public
 */
export type SetChildrenStep = {
  type: 'set.children'
  path: StepPath
  field: string
  oldChildren: Array<{_key?: string; text?: string}>
  newChildren: Array<{_key?: string; text?: string}>
}

/**
 * `path` ends at the renamed node's address before the rename: the
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
  options?: {affinity?: 'forward' | 'backward' | 'both'},
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
          (step.offset === point.offset && affinity !== 'backward'))
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
        insideRange ||
        (atStart && affinity !== 'backward') ||
        (atEnd && affinity !== 'forward')

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
 * Pass `'backward'` to have it stay instead. `'both'` uses forward insertion
 * affinity and follows either boundary of moved text, matching caret mapping.
 * @public
 */
export function mapPoint(
  steps: ReadonlyArray<Step>,
  point: Point | null,
  options?: {affinity?: 'forward' | 'backward' | 'both'},
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
 * Map a range through a batch of steps with inward affinity: the
 * document-order start rides forward and the end rides backward, so text
 * inserted exactly at a range edge lands outside the range. At a moved-text
 * boundary, the start follows with forward affinity and the end follows with
 * backward affinity, attaching each edge to the moved character on its
 * inward side.
 * For points on different keyed paths, their document order is unavailable
 * without the document, so anchor and focus retain their conventional
 * forward/backward affinities.
 *
 * A collapsed range (anchor and focus at the same address) maps both ends
 * with backward affinity by default, so it can never inflate into an
 * inverted range at an insertion point. `collapsedAffinity: 'both'` follows
 * insertions and either boundary of moved text, matching a local caret.
 *
 * Returns `null` when either end is lost.
 * @public
 */
export function mapRange(
  steps: ReadonlyArray<Step>,
  range: Range,
  options?: {collapsedAffinity?: 'forward' | 'backward' | 'both'},
): Range | null {
  const isCollapsed =
    pathEquals(range.anchor.path, range.focus.path) &&
    range.anchor.offset === range.focus.offset

  if (isCollapsed) {
    const point = mapPoint(steps, range.anchor, {
      affinity: options?.collapsedAffinity ?? 'backward',
    })
    return point === null ? null : {anchor: point, focus: point}
  }

  const isBackwardOnSamePath =
    pathEquals(range.anchor.path, range.focus.path) &&
    range.anchor.offset > range.focus.offset
  const anchor = mapPoint(steps, range.anchor, {
    affinity: isBackwardOnSamePath ? 'backward' : 'forward',
  })
  const focus = mapPoint(steps, range.focus, {
    affinity: isBackwardOnSamePath ? 'forward' : 'backward',
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
  newChildren: Array<{_key?: string; text?: string}>,
  oldChildren: Array<{_key?: string; text?: string}>,
): Point | undefined {
  if (
    point.path.length !== nodePath.length + 2 ||
    !pathEquals(point.path.slice(0, nodePath.length), nodePath) ||
    point.path[nodePath.length] !== field
  ) {
    return undefined
  }

  const pointSegment = point.path.at(-1)
  const oldIndex = arrayIndex(oldChildren, pointSegment)
  if (oldIndex < 0) {
    return undefined
  }
  const newSegments = arraySegments(newChildren)
  const survivingIndex = isKeyedSegment(pointSegment)
    ? newSegments.findIndex(
        (segment) =>
          isKeyedSegment(segment) && segment._key === pointSegment._key,
      )
    : -1
  if (survivingIndex >= 0) {
    const text = newChildren[survivingIndex]?.text
    return typeof text === 'string' && point.offset > text.length
      ? {path: point.path, offset: text.length}
      : undefined
  }
  if (concatenatedText(oldChildren) !== concatenatedText(newChildren)) {
    return undefined
  }
  const getSpanText = (child: unknown) =>
    isRecord(child) && typeof child['text'] === 'string'
      ? child['text']
      : undefined
  let textOffset = isKeyedSegment(pointSegment)
    ? textOffsetOfChild(
        oldChildren,
        getSpanText,
        pointSegment._key,
        point.offset,
      )
    : undefined
  if (textOffset === undefined) {
    textOffset = point.offset
    for (let index = 0; index < oldIndex; index++) {
      textOffset += oldChildren[index]?.text?.length ?? 0
    }
  }
  if (oldChildren[oldIndex]?.text === undefined) {
    return undefined
  }
  const placed = childAtTextOffset(newChildren, getSpanText, textOffset)
  if (
    placed &&
    newSegments.some(
      (segment) => isKeyedSegment(segment) && segment._key === placed.key,
    )
  ) {
    return {
      path: [...nodePath, field, {_key: placed.key}],
      offset: placed.offset,
    }
  }
  for (let index = 0; index < newChildren.length; index++) {
    const text = newChildren[index]?.text
    if (text === undefined) {
      continue
    }
    if (textOffset <= text.length) {
      return {
        path: [...nodePath, field, newSegments[index]!],
        offset: textOffset,
      }
    }
    textOffset -= text.length
  }
  return undefined
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
