import type {PortableTextBlock, Schema} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import type {Point} from '../interfaces/point'
import type {Range} from '../interfaces/range'

/**
 * Normalizes a selection range so that points at decorator boundaries resolve
 * consistently across browsers.
 *
 * At a mark boundary, the DOM cursor can sit at the end of one text node or
 * the start of the adjacent text node. Both are visually identical but produce
 * different Slate points. Browsers disagree on which side to pick.
 *
 * This normalizes to a consistent convention:
 * - Trailing edge: cursor at end of decorated span moves to offset 0 of next
 * - Leading edge: cursor at offset 0 of decorated span moves to end of previous
 *
 * Only applies to collapsed selections (cursors) and only at decorator
 * boundaries. Annotation boundaries are left as-is because moving across an
 * annotation edge changes the semantic insertion context.
 *
 * Skips normalization when the cursor arrived at the boundary by moving
 * through the same span (e.g., arrow-keying through text).
 *
 * @public
 */
export function normalizeRangeAtMarkBoundary(
  range: Range,
  value: PortableTextBlock[],
  schema: Schema,
  previousSelection: Range | null,
): Range {
  // Only normalize collapsed selections (cursors). Expanded selections
  // must preserve their exact boundaries because moving an endpoint across
  // a mark boundary changes which content is selected.
  const isCollapsed =
    range.anchor.path[0] === range.focus.path[0] &&
    range.anchor.path[1] === range.focus.path[1] &&
    range.anchor.offset === range.focus.offset

  if (!isCollapsed) {
    return range
  }

  // Skip normalization when the cursor arrived at the end of a span by
  // moving through the same span (e.g., arrow-keying through text). In
  // this case the browser correctly resolved the cursor to the current
  // text node and we should not jump it to the next span.
  if (previousSelection && isIncrementalMove(previousSelection, range)) {
    return range
  }

  const anchor = normalizePointAtMarkBoundary(range.anchor, value, schema)
  const focus = normalizePointAtMarkBoundary(range.focus, value, schema)

  if (anchor === range.anchor && focus === range.focus) {
    return range
  }

  return {...range, anchor, focus}
}

/**
 * Checks if the new range is a single-character move within the same span
 * as the previous selection. This indicates arrow-key navigation rather than
 * a click or programmatic selection.
 */
function isIncrementalMove(prev: Range, next: Range): boolean {
  // Both must be collapsed
  const prevCollapsed =
    prev.anchor.path[0] === prev.focus.path[0] &&
    prev.anchor.path[1] === prev.focus.path[1] &&
    prev.anchor.offset === prev.focus.offset

  if (!prevCollapsed) {
    return false
  }

  // Must be in the same block and same span
  if (
    prev.anchor.path[0] !== next.anchor.path[0] ||
    prev.anchor.path[1] !== next.anchor.path[1]
  ) {
    return false
  }

  // Offset changed by exactly 1 (arrow right or arrow left)
  const offsetDelta = Math.abs(next.anchor.offset - prev.anchor.offset)
  return offsetDelta === 1
}

function normalizePointAtMarkBoundary(
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

  const decoratorNames = new Set(
    schema.decorators.map((decorator) => decorator.name),
  )

  // Case 1: Trailing edge - cursor at end of span, next span has different
  // decorator marks. Move to offset 0 of next span.
  if (point.offset === child.text.length) {
    const nextChild = block.children[childIndex + 1]

    if (nextChild && isSpan({schema}, nextChild)) {
      const result = normalizeAtBoundary(child, nextChild, decoratorNames, {
        path: [blockIndex, childIndex + 1],
        offset: 0,
      })
      if (result) {
        return result
      }
    }
  }

  // Case 2: Leading edge - cursor at offset 0 of a decorated span, previous
  // span has fewer decorators. Move to end of previous span.
  if (point.offset === 0 && childIndex > 0) {
    const prevChild = block.children[childIndex - 1]

    if (prevChild && isSpan({schema}, prevChild)) {
      const currentDecorators = (child.marks ?? []).filter((mark) =>
        decoratorNames.has(mark),
      )
      const prevDecorators = (prevChild.marks ?? []).filter((mark) =>
        decoratorNames.has(mark),
      )

      // Only normalize at the leading edge when the current span has MORE
      // decorators than the previous span. This means we're at the start
      // of a decorated region and should resolve outside it.
      if (
        currentDecorators.length > prevDecorators.length &&
        !marksEqual(currentDecorators, prevDecorators)
      ) {
        // Check annotation marks are the same
        const currentAnnotations = (child.marks ?? []).filter(
          (mark) => !decoratorNames.has(mark),
        )
        const prevAnnotations = (prevChild.marks ?? []).filter(
          (mark) => !decoratorNames.has(mark),
        )

        if (marksEqual(currentAnnotations, prevAnnotations)) {
          return {
            path: [blockIndex, childIndex - 1],
            offset: prevChild.text.length,
          }
        }
      }
    }
  }

  return point
}

/**
 * Checks if normalization should happen at a boundary between two spans.
 * Returns the normalized point if normalization is needed, null otherwise.
 */
function normalizeAtBoundary(
  currentSpan: {marks?: string[]},
  adjacentSpan: {marks?: string[]},
  decoratorNames: Set<string>,
  targetPoint: Point,
): Point | null {
  const currentDecorators = (currentSpan.marks ?? []).filter((mark) =>
    decoratorNames.has(mark),
  )
  const adjacentDecorators = (adjacentSpan.marks ?? []).filter((mark) =>
    decoratorNames.has(mark),
  )

  if (marksEqual(currentDecorators, adjacentDecorators)) {
    return null
  }

  // Ensure annotation marks are the same on both spans
  const currentAnnotations = (currentSpan.marks ?? []).filter(
    (mark) => !decoratorNames.has(mark),
  )
  const adjacentAnnotations = (adjacentSpan.marks ?? []).filter(
    (mark) => !decoratorNames.has(mark),
  )

  if (!marksEqual(currentAnnotations, adjacentAnnotations)) {
    return null
  }

  return targetPoint
}

function marksEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false
    }
  }

  return true
}
