import {pathContains} from '../../traversal/path-contains'
import {
  childAtTextOffset,
  textOffsetOfChild,
} from '../../utils/util.child-text-offset'
import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {Path} from '../interfaces/path'
import type {Point, PointTransformOptions} from '../interfaces/point'
import {pathEquals} from '../path/path-equals'

export type InsertTextStep = {
  type: 'insert.text'
  path: Path
  offset: number
  text: string
}

export type RemoveTextStep = {
  type: 'remove.text'
  path: Path
  offset: number
  text: string
}

export type SetTextStep = {
  type: 'set.text'
  path: Path
  text: string
}

export type RemoveNodeStep = {
  type: 'remove.node'
  path: Path
}

export type UnsetTextStep = {
  type: 'unset.text'
  path: Path
}

export type RekeyStep = {
  type: 'rekey'
  oldKey: string
  newKey: string
}

export type ReplaceChildrenStep = {
  type: 'replace.children'
  path: Path
  oldChildren: Array<unknown>
  newChildren: Array<unknown>
}

export type Step =
  | InsertTextStep
  | RemoveTextStep
  | SetTextStep
  | RemoveNodeStep
  | UnsetTextStep
  | RekeyStep
  | ReplaceChildrenStep

/**
 * Map a point through one step. Returns the same `point` reference when the
 * step doesn't actually move the point, so callers can use referential
 * equality to detect "nothing changed."
 */
export function mapPointThroughStep(
  step: Step,
  point: Point | null,
  options: PointTransformOptions = {},
): Point | null {
  if (point === null) {
    return null
  }

  const {affinity = 'forward'} = options

  switch (step.type) {
    case 'insert.text': {
      if (
        pathEquals(step.path, point.path) &&
        (step.offset < point.offset ||
          (step.offset === point.offset && affinity === 'forward'))
      ) {
        return {path: point.path, offset: point.offset + step.text.length}
      }

      return point
    }

    case 'remove.text': {
      if (pathEquals(step.path, point.path) && step.offset <= point.offset) {
        return {
          path: point.path,
          offset:
            point.offset -
            Math.min(point.offset - step.offset, step.text.length),
        }
      }

      return point
    }

    case 'set.text': {
      if (!pathEquals(step.path, point.path)) {
        return point
      }

      const offset =
        point.offset > step.text.length ? step.text.length : point.offset

      if (offset === point.offset) {
        return point
      }

      return {path: point.path, offset}
    }

    case 'rekey': {
      let path: Path | undefined

      for (let i = 0; i < point.path.length; i++) {
        const segment = point.path[i]

        if (isKeyedSegment(segment) && segment._key === step.oldKey) {
          if (path === undefined) {
            path = [...point.path]
          }
          path[i] = {_key: step.newKey}
        }
      }

      return path === undefined ? point : {path, offset: point.offset}
    }

    case 'replace.children': {
      const remapped = remapPointThroughChildrenReplacement(
        point,
        step.path,
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

    case 'unset.text': {
      if (pathEquals(step.path, point.path) && point.offset !== 0) {
        return {path: point.path, offset: 0}
      }

      return point
    }
  }
}

/**
 * Map a point through a batch of steps, in order. A step that invalidates
 * the point (a node removal) short-circuits the remaining steps.
 */
export function mapPointThroughSteps(
  steps: ReadonlyArray<Step>,
  point: Point | null,
  options: PointTransformOptions = {},
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
 * Map a point through a wholesale children replacement via its text
 * offset within the node. Returns `undefined` (leave the point
 * untransformed) unless every precondition holds: the point addresses
 * a direct child of the node whose children were replaced, that
 * child's key is gone from the new children (identity did not
 * survive), and the old and new children carry identical concatenated
 * span text, the condition that makes offset mapping lossless.
 *
 * Spans are detected structurally (`text` being a string) rather than
 * through the schema: this mapper is deliberately schema-free, and
 * text-carrying children are the only ones that occupy offsets.
 *
 * The offset arithmetic is shared with the snapshot-aware block-offset
 * utils through `utils/util.child-text-offset.ts`, so the boundary
 * convention (an offset landing exactly on a span boundary stays at
 * the end of the earlier span) is the same by construction. Only the
 * span detection differs: structural here, schema-based there.
 *
 * A container's array field may also be named `children` and hold
 * blocks rather than spans. The text requirement makes that a no-op by
 * construction: blocks carry no `text` of their own, so a point
 * addressing a replaced block bails at the offset walk, and points
 * deeper inside such blocks fail the direct-child path guard.
 */
function remapPointThroughChildrenReplacement(
  point: Point,
  childrenPath: Path,
  newChildren: Array<unknown>,
  oldChildren: Array<unknown>,
): Point | undefined {
  if (
    point.path.length !== childrenPath.length + 1 ||
    !pathEquals(point.path.slice(0, childrenPath.length), childrenPath)
  ) {
    return undefined
  }

  const pointSegment = point.path[point.path.length - 1]
  if (!isKeyedSegment(pointSegment)) {
    return undefined
  }

  if (newChildren.some((child) => childKey(child) === pointSegment._key)) {
    // The point's span survived the replacement; identity wins over
    // offset mapping.
    return undefined
  }

  const nodeTextOffset = textOffsetOfChild(
    oldChildren,
    childText,
    pointSegment._key,
    point.offset,
  )
  if (nodeTextOffset === undefined) {
    return undefined
  }

  if (concatenatedText(oldChildren) !== concatenatedText(newChildren)) {
    return undefined
  }

  const placed = childAtTextOffset(newChildren, childText, nodeTextOffset)
  if (placed === undefined) {
    return undefined
  }

  return {
    path: [...childrenPath, {_key: placed.key}],
    offset: placed.offset,
  }
}

function childText(child: unknown): string | undefined {
  if (child !== null && typeof child === 'object' && 'text' in child) {
    const text = (child as {text: unknown}).text
    return typeof text === 'string' ? text : undefined
  }
  return undefined
}

function childKey(child: unknown): string | undefined {
  if (child !== null && typeof child === 'object' && '_key' in child) {
    const key = (child as {_key: unknown})._key
    return typeof key === 'string' ? key : undefined
  }
  return undefined
}

function concatenatedText(children: Array<unknown>): string {
  let text = ''
  for (const child of children) {
    const childTextValue = childText(child)
    if (childTextValue !== undefined) {
      text += childTextValue
    }
  }
  return text
}
