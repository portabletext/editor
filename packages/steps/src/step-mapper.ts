import type {KeyedSegment, Path} from '@portabletext/patches'
import {pathContains} from './lib/path-contains'
import {pathEquals} from './lib/path-equals'

/**
 * A node address uses a unique non-empty key when available, otherwise its
 * index among siblings.
 */
export type StepPath = Array<string | number | KeyedSegment>

/**
 * A position in a Portable Text document: a path plus a UTF-16 offset.
 * `path` may use keys, indices or field names.
 * @public
 */
export type Point = {path: Path; offset: number}

/**
 * A span of a Portable Text document, marked by an `anchor` and a
 * `focus` point. `backward: true` means the focus comes before the anchor in
 * the document. Omit it or pass `false` when the anchor comes first.
 * @public
 */
export type Range = {anchor: Point; focus: Point; backward?: boolean}

/**
 * Text was inserted into a span, `length` UTF-16 units of it starting at
 * `offset`.
 * @public
 */
type InsertTextStep = {
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
type RemoveTextStep = {
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
type MoveTextStep = {
  type: 'move.text'
  from: {path: StepPath; offset: number; length: number}
  to: {path: StepPath; offset: number}
}

/**
 * A subtree was removed. `nearest` is where a caret inside the removed node
 * goes, picked from the document just before the removal, or `null` when no
 * span remains. A numeric final path segment shifts later numeric siblings.
 * @public
 */
type RemoveNodeStep = {
  type: 'remove.node'
  replacement?: true
  nearest: Point | null
  path: StepPath
}

/**
 * A subtree changed address. `from` and `to` may use keys or indices,
 * including a key-to-index change when a sibling makes the key ambiguous.
 * A point inside `from` follows the subtree to `to`. Other points stay put.
 * @public
 */
type MoveNodeStep = {
  type: 'move.node'
  from: StepPath
  to: StepPath
}

/**
 * `path` is the node's address before the rename. Only points under that exact
 * address get the new key.
 * @public
 */
type SetKeyStep = {
  type: 'set.key'
  path: StepPath
  newKey: string
}

/**
 * The union of every step kind a change can produce.
 * @public
 */
export type Step =
  | InsertTextStep
  | RemoveTextStep
  | MoveTextStep
  | RemoveNodeStep
  | MoveNodeStep
  | SetKeyStep

/**
 * Map a point through one step.
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

    case 'remove.node': {
      if (step.replacement)
        return pathContains(step.path, point.path) ? null : point
      if (pathContains(step.path, point.path)) {
        return step.nearest === null
          ? null
          : shiftIndex(step.nearest, step.path, -1)
      }

      return shiftIndex(point, step.path, -1)
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
 * Map a point through steps. A removed point follows the removal's `nearest`
 * through the remaining steps. Returns `null` when no span remains or the
 * steps are `undefined`.
 * Affinity defaults to forward. Backward affinity stays before insertions.
 * @public
 */
export function mapPoint(
  steps: ReadonlyArray<Step> | undefined,
  point: Point,
  options?: {affinity?: 'forward' | 'backward'},
): Point | null {
  if (steps === undefined) {
    return null
  }
  let current: Point | null = point
  for (const step of steps) {
    current = mapPointThroughStep(step, current, options)
    if (current === null) {
      return null
    }
  }
  return current
}

function shiftIndex(point: Point, path: StepPath, count: number): Point {
  const depth = path.length - 1
  const index = path[depth]
  const pointIndex = point.path[depth]
  if (
    count === 0 ||
    typeof index !== 'number' ||
    typeof pointIndex !== 'number' ||
    !pathEquals(path.slice(0, depth), point.path.slice(0, depth)) ||
    pointIndex < index ||
    (count < 0 && pointIndex === index)
  ) {
    return point
  }
  const nextPath = [...point.path]
  nextPath[depth] = pointIndex + count
  return {path: nextPath, offset: point.offset}
}
