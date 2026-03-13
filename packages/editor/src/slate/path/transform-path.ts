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

  const p = [...path]

  if (path.length === 0) {
    return p
  }

  switch (operation.type) {
    case 'insert_node': {
      const {path: op} = operation

      if (pathEquals(op, p) || pathEndsBefore(op, p) || isAncestorPath(op, p)) {
        p[op.length - 1] = p[op.length - 1]! + 1
      }

      break
    }

    case 'remove_node': {
      const {path: op} = operation

      if (pathEquals(op, p) || isAncestorPath(op, p)) {
        return null
      } else if (pathEndsBefore(op, p)) {
        p[op.length - 1] = p[op.length - 1]! - 1
      }

      break
    }
  }

  return p
}
