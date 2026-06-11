import {pathContains} from '../../traversal/path-contains'
import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {EngineOperation} from '../interfaces/operation'
import type {Path} from '../interfaces/path'

/**
 * Transform a path by an operation.
 *
 * With keyed paths, insert and unset (node removal) don't shift sibling paths.
 * Only unset (node removal) can invalidate a path (if the node or an ancestor is removed).
 */
export function transformPath(
  path: Path | null,
  operation: EngineOperation,
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

        if (pathContains(operationPath, path)) {
          return null
        }
      }

      break
    }
  }

  return path
}
