import {pathContains} from '../../traversal/path-contains'
import {
  childAtTextOffset,
  textOffsetOfChild,
} from '../../utils/util.child-text-offset'
import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {EngineOperation} from '../interfaces/operation'
import type {Path} from '../interfaces/path'
import type {Point, PointTransformOptions} from '../interfaces/point'
import {pathEquals} from '../path/path-equals'

/**
 * Transform a point by an operation. Returns the same `point` reference when
 * the operation doesn't actually move the point, so callers can use referential
 * equality to detect "nothing changed."
 *
 * With keyed paths, most operations don't affect paths at all:
 * - insert: no-op (new node has its own key, doesn't shift siblings)
 * - unset (node removal): invalidates if the point is at or inside the removed node
 * - unset (property removal): collapses offset when `text` is unset from a span
 * - insert.text: adjusts offset if in the same span
 * - remove.text: adjusts offset if in the same span
 * - set: updates keyed segments when `_key` changes, clamps offset when `text` changes
 * - set.selection: no-op
 */
export function transformPoint(
  point: Point | null,
  op: EngineOperation,
  options: PointTransformOptions = {},
): Point | null {
  if (point === null) {
    return null
  }

  const {affinity = 'forward'} = options

  switch (op.type) {
    case 'insert.text': {
      if (
        pathEquals(op.path, point.path) &&
        (op.offset < point.offset ||
          (op.offset === point.offset && affinity === 'forward'))
      ) {
        return {path: point.path, offset: point.offset + op.text.length}
      }

      return point
    }

    case 'remove.text': {
      if (pathEquals(op.path, point.path) && op.offset <= point.offset) {
        return {
          path: point.path,
          offset:
            point.offset - Math.min(point.offset - op.offset, op.text.length),
        }
      }

      return point
    }

    case 'set': {
      const propertyName = op.path[op.path.length - 1]
      const nodePath = op.path.slice(0, -1)

      let path: Path = point.path
      let offset: number = point.offset

      // When _key is set to a new value, update any point referencing the old key
      if (propertyName === '_key' && typeof op.value === 'string') {
        const oldKey =
          op.inverse?.type === 'set' && typeof op.inverse.value === 'string'
            ? op.inverse.value
            : undefined

        if (oldKey) {
          let newPath: Path | undefined

          for (let i = 0; i < path.length; i++) {
            const segment = path[i]

            if (isKeyedSegment(segment) && segment._key === oldKey) {
              if (newPath === undefined) {
                newPath = [...path]
              }
              newPath[i] = {_key: op.value}
            }
          }

          if (newPath !== undefined) {
            path = newPath
          }
        }
      }

      // When text is set on a span, clamp offset to the new text length
      if (propertyName === 'text' && pathEquals(nodePath, path)) {
        if (op.value == null || typeof op.value !== 'string') {
          offset = 0
        } else if (offset > op.value.length) {
          offset = op.value.length
        }
      }

      // When a node's children are replaced wholesale (the sync
      // machine's fallback for re-keyed remote children), a point
      // inside the old children references keys that no longer exist.
      // When the replacement preserves the concatenated span text (a
      // remote mark toggle: same characters, new span boundaries and
      // keys), the point maps losslessly through its text offset
      // within the node. Points whose span survived keep their
      // identity, and text-changing replacements keep the
      // untransformed point, offset mapping would be guesswork there.
      if (propertyName === 'children' && Array.isArray(op.value)) {
        const remappedPoint = remapPointThroughChildrenReplacement(
          point,
          op.path,
          op.value as Array<unknown>,
          op.inverse?.type === 'set' && Array.isArray(op.inverse.value)
            ? (op.inverse.value as Array<unknown>)
            : undefined,
        )
        if (remappedPoint) {
          path = remappedPoint.path
          offset = remappedPoint.offset
        }
      }

      if (path === point.path && offset === point.offset) {
        return point
      }

      return {path, offset}
    }

    case 'unset': {
      const lastSegment = op.path[op.path.length - 1]

      if (isKeyedSegment(lastSegment)) {
        if (pathContains(op.path, point.path)) {
          return null
        }
        return point
      }

      const propertyName = lastSegment
      const nodePath = op.path.slice(0, -1)

      if (
        propertyName === 'text' &&
        pathEquals(nodePath, point.path) &&
        point.offset !== 0
      ) {
        return {path: point.path, offset: 0}
      }

      return point
    }

    // set.selection: no transform needed
    default:
      return point
  }
}

/**
 * Map a point through a wholesale children replacement via its text
 * offset within the node. Returns `undefined` (leave the point
 * untransformed) unless every precondition holds: the point addresses
 * a direct child of the node whose children were replaced, that
 * child's key is gone from the new children (identity did not
 * survive), the old children are known (the op's inverse), and the
 * old and new children carry identical concatenated span text, the
 * condition that makes offset mapping lossless.
 *
 * Spans are detected structurally (`text` being a string) rather than
 * through the schema: `transformPoint` is deliberately schema-free,
 * and text-carrying children are the only ones that occupy offsets.
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
  oldChildren: Array<unknown> | undefined,
): Point | undefined {
  if (!oldChildren) {
    return undefined
  }

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
