import type {Path} from '../engine/interfaces/path'

const KEYED_SEGMENT_PATTERN = /^\[_key=="(.*?)"\]/
const QUOTED_FIELD_PATTERN = /^\["(true|false|null)"\]/
const INDEX_PATTERN = /^\[(-?\d+)\]/
const RANGE_PATTERN = /^\[(-?\d+|):(-?\d+|)\]/
const FIELD_PATTERN = /^[^.[\]]+/

/**
 * Deserialize a path using Sanity's bracket notation. Malformed input returns
 * the segments read before the first token it cannot read.
 *
 * - `[_key=="k0"].children[_key=="s0"]` -> `[{_key: 'k0'}, 'children', {_key: 's0'}]`
 * - `body[2]` -> `['body', 2]`
 * - `[_key=="k0"]["null"]` -> `[{_key: 'k0'}, 'null']`
 * - `body[:3]` -> `['body', ['', 3]]`
 */
export function deserializePath(serializedPath: string): Path {
  const path: Path = []
  let remaining = serializedPath

  while (remaining.length > 0) {
    if (remaining.startsWith('.')) {
      remaining = remaining.slice(1)
      if (!FIELD_PATTERN.test(remaining)) {
        break
      }
    }

    const keyMatch = remaining.match(KEYED_SEGMENT_PATTERN)
    if (keyMatch) {
      path.push({_key: keyMatch[1]!})
      remaining = remaining.slice(keyMatch[0].length)
      continue
    }

    const quotedFieldMatch = remaining.match(QUOTED_FIELD_PATTERN)
    if (quotedFieldMatch) {
      path.push(quotedFieldMatch[1]!)
      remaining = remaining.slice(quotedFieldMatch[0].length)
      continue
    }

    const indexMatch = remaining.match(INDEX_PATTERN)
    if (indexMatch) {
      path.push(Number(indexMatch[1]))
      remaining = remaining.slice(indexMatch[0].length)
      continue
    }

    const rangeMatch = remaining.match(RANGE_PATTERN)
    if (rangeMatch) {
      path.push([
        rangeMatch[1] === '' ? '' : Number(rangeMatch[1]),
        rangeMatch[2] === '' ? '' : Number(rangeMatch[2]),
      ])
      remaining = remaining.slice(rangeMatch[0].length)
      continue
    }

    const fieldMatch = remaining.match(FIELD_PATTERN)
    if (!fieldMatch) {
      break
    }
    path.push(fieldMatch[0])
    remaining = remaining.slice(fieldMatch[0].length)
  }

  return path
}
