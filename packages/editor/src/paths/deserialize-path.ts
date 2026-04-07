import type {Path} from '../slate/interfaces/path'

const KEYED_SEGMENT_PATTERN = /\[_key=="(.+?)"\]/

/**
 * Deserialize a serialized keyed path using Sanity's bracket notation.
 *
 * - `[_key=="k0"]` -> `[{_key: 'k0'}]`
 * - `[_key=="k0"].children[_key=="s0"]` -> `[{_key: 'k0'}, 'children', {_key: 's0'}]`
 * - `[_key=="t0"].rows[_key=="r0"].cells[_key=="c0"].content[_key=="b0"].children[_key=="s0"]` -> `[{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'c0'}, 'content', {_key: 'b0'}, 'children', {_key: 's0'}]`
 */
export function deserializePath(serializedPath: string): Path {
  const path: Path = []
  let remaining = serializedPath

  while (remaining.length > 0) {
    // Remove leading dot separator
    if (remaining.startsWith('.')) {
      remaining = remaining.slice(1)
    }

    const keyMatch = remaining.match(KEYED_SEGMENT_PATTERN)

    if (keyMatch?.[1] && remaining.startsWith('[')) {
      path.push({_key: keyMatch[1]})
      remaining = remaining.slice(keyMatch[0].length)
      continue
    }

    // Field name segment: read until next '[' or '.'
    const nextBracket = remaining.indexOf('[')
    const nextDot = remaining.indexOf('.')
    let end: number

    if (nextBracket === -1 && nextDot === -1) {
      end = remaining.length
    } else if (nextBracket === -1) {
      end = nextDot
    } else if (nextDot === -1) {
      end = nextBracket
    } else {
      end = Math.min(nextBracket, nextDot)
    }

    const fieldName = remaining.slice(0, end)

    if (fieldName) {
      path.push(fieldName)
    }

    remaining = remaining.slice(end)
  }

  return path
}
