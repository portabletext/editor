import type {Operation} from '../interfaces/operation'
import type {Path} from '../interfaces/path'
import {isAncestorPath} from './is-ancestor-path'
import {pathEquals} from './path-equals'

/**
 * Transform a path by an operation.
 *
 * With keyed paths, insert_node and remove_node don't shift sibling paths.
 * Only remove_node can invalidate a path (if the node or an ancestor is removed).
 */
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
    case 'remove_node': {
      const {path: op} = operation

      if (pathEquals(op, path) || isAncestorPath(op, path)) {
        return null
      }

      break
    }
  }

  return path
}
