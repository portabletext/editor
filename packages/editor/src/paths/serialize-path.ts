import type {Path} from '../types/paths'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

/**
 * Serialize a keyed path to a string using Sanity's bracket notation.
 *
 * - `[{_key: 'k0'}]` -> `[_key=="k0"]`
 * - `[{_key: 'k0'}, 'children', {_key: 's0'}]` -> `[_key=="k0"].children[_key=="s0"]`
 * - `[{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'c0'}, 'content', {_key: 'b0'}, 'children', {_key: 's0'}]` -> `[_key=="t0"].rows[_key=="r0"].cells[_key=="c0"].content[_key=="b0"].children[_key=="s0"]`
 */
export function serializePath(path: Path): string {
  return path.reduce<string>((result, segment, index) => {
    if (isKeyedSegment(segment)) {
      return `${result}[_key=="${segment._key}"]`
    }

    const separator = index === 0 ? '' : '.'
    return `${result}${separator}${segment}`
  }, '')
}
