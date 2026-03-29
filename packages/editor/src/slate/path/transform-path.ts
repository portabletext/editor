import type {Operation} from '../interfaces/operation'
import type {Path} from '../interfaces/path'
import {isAncestorPath} from './is-ancestor-path'
import {pathEndsBefore} from './path-ends-before'
import {pathEquals} from './path-equals'

export function transformPath(
  path: Path | null,
  operation: Operation,
): Path | null {
  if (!path) {
    return null
  }

  if (path.length === 0) {
    return path
  }

  switch (operation.type) {
    case 'insert_node': {
      const {path: op} = operation

      if (
        pathEquals(op, path) ||
        pathEndsBefore(op, path) ||
        isAncestorPath(op, path)
      ) {
        const p = [...path]
        p[op.length - 1] = p[op.length - 1]! + 1
        return p
      }

      break
    }

    case 'remove_node': {
      const {path: op} = operation

      if (pathEquals(op, path) || isAncestorPath(op, path)) {
        return null
      } else if (pathEndsBefore(op, path)) {
        const p = [...path]
        p[op.length - 1] = p[op.length - 1]! - 1
        return p
      }

      break
    }
  }

  return path
}
