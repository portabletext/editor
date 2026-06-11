import {pathContains} from '../../traversal/path-contains'
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
