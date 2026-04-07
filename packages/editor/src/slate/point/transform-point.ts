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
 * - insert_node: no-op (new node has its own key, doesn't shift siblings)
 * - remove_node: invalidates if the point is at or inside the removed node
 * - insert_text: adjusts offset if in the same span
 * - remove_text: adjusts offset if in the same span
 * - set_node: collapses offset if text is removed from the span
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

    case 'remove_node': {
      if (pathEquals(op.path, path) || isAncestorPath(op.path, path)) {
        return null
      }

      break
    }

    case 'set_node': {
      const newProperties = op.newProperties as Record<string, unknown>

      // Check text collapse BEFORE key substitution, since key substitution
      // changes the path and would cause pathEquals to fail against op.path.
      if (
        pathEquals(op.path, path) &&
        'text' in op.properties &&
        (!('text' in newProperties) || newProperties['text'] == null)
      ) {
        offset = 0
      }

      // When a node's _key changes, update any point referencing the old key
      if (
        '_key' in newProperties &&
        typeof newProperties['_key'] === 'string'
      ) {
        const oldProperties = op.properties as Record<string, unknown>
        const oldKey =
          '_key' in oldProperties
            ? (oldProperties['_key'] as string)
            : undefined

        if (oldKey) {
          const newPath: Path = [...path]
          let changed = false

          for (let i = 0; i < newPath.length; i++) {
            const segment = newPath[i]

            if (isKeyedSegment(segment) && segment._key === oldKey) {
              newPath[i] = {_key: newProperties['_key']}
              changed = true
            }
          }

          if (changed) {
            path = newPath
          }
        }
      }

      break
    }

    // insert_node: no path transform needed with keyed paths
    // set_selection: no transform needed
    default:
      return point
  }

  return {path, offset}
}
