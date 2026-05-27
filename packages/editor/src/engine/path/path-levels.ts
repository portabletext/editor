import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {Path} from '../interfaces/path'

/**
 * Get all ancestor paths of a path, including the empty root path.
 *
 * Generates paths at node boundaries: keyed segments and numeric segments
 * represent nodes in the tree. String segments are field names and don't
 * represent node boundaries.
 *
 * [{_key:'b1'}, 'children', {_key:'s1'}]
 *   → [[], [{_key:'b1'}], [{_key:'b1'}, 'children', {_key:'s1'}]]
 *
 * [0, 'children', {_key:'s1'}]
 *   → [[], [0], [0, 'children', {_key:'s1'}]]
 */
export function pathLevels(path: Path): Path[] {
  const list: Path[] = [[]]

  for (let i = 0; i < path.length; i++) {
    const segment = path[i]
    if (isKeyedSegment(segment) || typeof segment === 'number') {
      list.push(path.slice(0, i + 1))
    }
  }

  return list
}
