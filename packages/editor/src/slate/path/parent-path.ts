import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {Path} from '../interfaces/path'

/**
 * Get the parent path of a path.
 *
 * Drops the last node segment (keyed or numeric) and the preceding field
 * name string.
 *
 * [{_key:'b1'}, 'children', {_key:'s1'}] → [{_key:'b1'}]
 * [{_key:'b1'}, 'children', 0]           → [{_key:'b1'}]
 * [{_key:'b1'}]                           → []
 */
export function parentPath(path: Path): Path {
  if (path.length === 0) {
    throw new Error(`Cannot get the parent path of the root path [${path}].`)
  }

  let lastNodeIndex = -1
  for (let i = path.length - 1; i >= 0; i--) {
    if (isKeyedSegment(path[i]) || typeof path[i] === 'number') {
      lastNodeIndex = i
      break
    }
  }

  if (lastNodeIndex === -1) {
    return []
  }

  const result = path.slice(0, lastNodeIndex)

  if (result.length > 0 && typeof result[result.length - 1] === 'string') {
    return result.slice(0, -1)
  }

  return result
}
