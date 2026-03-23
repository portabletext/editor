import type {PortableTextBlock, Schema} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import type {Point} from '../interfaces/point'
import type {Range} from '../interfaces/range'

/**
 * Normalizes a selection range at decorator mark boundaries so that the
 * cursor resolves consistently across browsers.
 *
 * At a mark boundary the DOM cursor can sit at the end of one text node
 * or the start of the next. Both positions are visually identical but
 * produce different Slate points. Firefox and Chrome disagree on which
 * side to pick after text insertion at a boundary.
 *
 * This moves the cursor from the end of a decorated span to offset 0 of
 * the next span when leaving a decorated region.
 *
 * Only applies to collapsed selections at decorator boundaries.
 * Annotation boundaries are left as-is because the cursor position
 * determines whether typed text gets the annotation.
 *
 * Skips normalization when the cursor moved incrementally within the
 * same span (e.g. arrow-keying through text), since the browser
 * correctly resolved the cursor to the current text node.
 *
 * @public
 */
export function normalizeRangeAtMarkBoundary(
  range: Range,
  value: PortableTextBlock[],
  schema: Schema,
  previousSelection: Range | null,
): Range {
  const isCollapsed =
    range.anchor.path[0] === range.focus.path[0] &&
    range.anchor.path[1] === range.focus.path[1] &&
    range.anchor.offset === range.focus.offset

  if (!isCollapsed) {
    return range
  }

  // When the cursor moved one position within the same span (arrow-key
  // navigation), the browser resolved it correctly and normalization
  // would cause an unexpected jump to the next span.
  if (previousSelection && isIncrementalMove(previousSelection, range)) {
    return range
  }

  const normalized = normalizePoint(range.focus, value, schema)

  if (normalized === range.focus) {
    return range
  }

  return {...range, anchor: normalized, focus: normalized}
}

function isIncrementalMove(prev: Range, next: Range): boolean {
  const prevCollapsed =
    prev.anchor.path[0] === prev.focus.path[0] &&
    prev.anchor.path[1] === prev.focus.path[1] &&
    prev.anchor.offset === prev.focus.offset

  if (!prevCollapsed) {
    return false
  }

  // Same block and same span
  if (
    prev.anchor.path[0] !== next.anchor.path[0] ||
    prev.anchor.path[1] !== next.anchor.path[1]
  ) {
    return false
  }

  // Offset changed by exactly 1
  return Math.abs(next.anchor.offset - prev.anchor.offset) === 1
}

function normalizePoint(
  point: Point,
  value: PortableTextBlock[],
  schema: Schema,
): Point {
  const [blockIndex, childIndex] = point.path

  if (blockIndex === undefined || childIndex === undefined) {
    return point
  }

  const block = value[blockIndex]

  if (!block || !isTextBlock({schema}, block)) {
    return point
  }

  const child = block.children[childIndex]

  if (!child || !isSpan({schema}, child)) {
    return point
  }

  // Only act when the cursor is at the end of a span
  if (point.offset !== child.text.length) {
    return point
  }

  const nextChild = block.children[childIndex + 1]

  if (!nextChild || !isSpan({schema}, nextChild)) {
    return point
  }

  // Only normalize at decorator boundaries, not annotation boundaries
  const decoratorNames = new Set(schema.decorators.map((d) => d.name))

  const currentDecorators = (child.marks ?? []).filter((m) =>
    decoratorNames.has(m),
  )
  const nextDecorators = (nextChild.marks ?? []).filter((m) =>
    decoratorNames.has(m),
  )

  // Same decorators on both sides - no boundary to normalize
  if (
    currentDecorators.length === nextDecorators.length &&
    currentDecorators.every((m, i) => m === nextDecorators[i])
  ) {
    return point
  }

  // Only normalize when leaving a decorated region (current span has
  // more decorators than the next). When entering a decorated region
  // (current has fewer), the cursor should stay at the undecorated side.
  if (currentDecorators.length <= nextDecorators.length) {
    return point
  }

  // Different annotation marks means this is an annotation boundary
  const currentAnnotations = (child.marks ?? []).filter(
    (m) => !decoratorNames.has(m),
  )
  const nextAnnotations = (nextChild.marks ?? []).filter(
    (m) => !decoratorNames.has(m),
  )

  if (
    currentAnnotations.length !== nextAnnotations.length ||
    currentAnnotations.some((m, i) => m !== nextAnnotations[i])
  ) {
    return point
  }

  return {
    path: [blockIndex, childIndex + 1],
    offset: 0,
  }
}
