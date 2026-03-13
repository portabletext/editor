import type {Operation} from '../interfaces/operation'
import type {Point, PointTransformOptions} from '../interfaces/point'
import {isAncestorPath} from '../path/is-ancestor-path'
import {pathEquals} from '../path/path-equals'
import {transformPath} from '../path/transform-path'

export function transformPoint(
  point: Point | null,
  op: Operation,
  options: PointTransformOptions = {},
): Point | null {
  if (point === null) {
    return null
  }

  const {affinity = 'forward'} = options
  let {path, offset} = point

  switch (op.type) {
    case 'insert_node': {
      path = transformPath(path, op)!
      break
    }

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

      path = transformPath(path, op)!
      break
    }

    default:
      return point
  }

  return {path, offset}
}
