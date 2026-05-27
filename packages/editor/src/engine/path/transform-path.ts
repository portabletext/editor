import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {Operation} from '../interfaces/operation'
import type {Path} from '../interfaces/path'
import {isAncestorPath} from './is-ancestor-path'
import {pathEquals} from './path-equals'

/**
 * Transform a path by an operation.
 *
 * With keyed paths, insert and unset (node removal) don't shift sibling paths.
 * Only unset (node removal) can invalidate a path (if the node or an ancestor is removed).
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
    case 'unset': {
      const lastSegment = operation.path[operation.path.length - 1]

      if (isKeyedSegment(lastSegment)) {
        const {path: operationPath} = operation

        if (
          pathEquals(operationPath, path) ||
          isAncestorPath(operationPath, path)
        ) {
          return null
        }
      }

      break
    }
  }

  return path
}
