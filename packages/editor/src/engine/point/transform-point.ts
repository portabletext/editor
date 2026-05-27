import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {Operation} from '../interfaces/operation'
import type {Path} from '../interfaces/path'
import type {Point, PointTransformOptions} from '../interfaces/point'
import {isAncestorPath} from '../path/is-ancestor-path'
import {pathEquals} from '../path/path-equals'

/**
 * Transform a point by an operation.
 *
 * With keyed paths, most operations don't affect paths at all:
 * - insert: no-op (new node has its own key, doesn't shift siblings)
 * - unset (node removal): invalidates if the point is at or inside the removed node
 * - unset (property removal): collapses offset when `text` is unset from a span
 * - insert_text: adjusts offset if in the same span
 * - remove_text: adjusts offset if in the same span
 * - set: updates keyed segments when `_key` changes, clamps offset when `text` changes
 * - set_selection: no-op
 */
export function transformPoint(
  point: Point | null,
  op: Operation,
  options: PointTransformOptions = {},
): Point | null {
  if (point === null) {
    return null
  }

  const {affinity = 'forward'} = options
  let {path, offset}: {path: Path; offset: number} = point

  switch (op.type) {
    case 'insert_text': {
      if (
        pathEquals(op.path, path) &&
        (op.offset < offset || (op.offset === offset && affinity === 'forward'))
      ) {
        offset += op.text.length
      }

      break
    }

    case 'remove_text': {
      if (pathEquals(op.path, path) && op.offset <= offset) {
        offset -= Math.min(offset - op.offset, op.text.length)
      }

      break
    }

    case 'set': {
      const propertyName = op.path[op.path.length - 1]
      const nodePath = op.path.slice(0, -1)

      // When _key is set to a new value, update any point referencing the old key
      if (propertyName === '_key' && typeof op.value === 'string') {
        const oldKey =
          op.inverse?.type === 'set' && typeof op.inverse.value === 'string'
            ? op.inverse.value
            : undefined

        if (oldKey) {
          const newPath: Path = [...path]
          let changed = false

          for (let i = 0; i < newPath.length; i++) {
            const segment = newPath[i]

            if (isKeyedSegment(segment) && segment._key === oldKey) {
              newPath[i] = {_key: op.value}
              changed = true
            }
          }

          if (changed) {
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

      break
    }

    case 'unset': {
      const lastSegment = op.path[op.path.length - 1]

      if (isKeyedSegment(lastSegment)) {
        if (pathEquals(op.path, path) || isAncestorPath(op.path, path)) {
          return null
        }
        break
      }

      const propertyName = lastSegment
      const nodePath = op.path.slice(0, -1)

      if (propertyName === 'text' && pathEquals(nodePath, path)) {
        offset = 0
      }

      break
    }

    // set_selection: no transform needed
    default:
      return point
  }

  return {path, offset}
}
