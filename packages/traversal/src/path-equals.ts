import type {Path} from '@portabletext/patches'
import {isKeyedSegment} from './is-keyed-segment'

/**
 * Returns true if `path` and `another` have the same length and the same
 * segment at every position.
 *
 * Keyed segments compare by `_key`, so `{_key: 'b1'}` equals any other
 * `{_key: 'b1'}`. Numbers and strings compare by identity. A keyed segment
 * never equals an index segment, even when both address the same node in a
 * document, because the comparison reads the paths only.
 *
 * @example
 * ```ts
 * import {pathEquals} from '@portabletext/traversal'
 *
 * pathEquals(
 *   [{_key: 'b1'}, 'children', {_key: 's1'}],
 *   [{_key: 'b1'}, 'children', {_key: 's1'}],
 * ) // true
 * ```
 *
 * @public
 */
export function pathEquals(path: Path, another: Path): boolean {
  if (path.length !== another.length) {
    return false
  }

  for (let index = 0; index < path.length; index++) {
    const segment = path[index]
    const otherSegment = another[index]

    if (isKeyedSegment(segment) && isKeyedSegment(otherSegment)) {
      if (segment._key !== otherSegment._key) {
        return false
      }
    } else if (segment !== otherSegment) {
      return false
    }
  }

  return true
}
