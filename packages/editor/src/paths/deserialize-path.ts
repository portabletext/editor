import type {Path} from '../types/paths'

/**
 * Deserialize a Sanity bracket notation path string to a keyed path array.
 *
 * - `[_key=="k0"]` -> `[{_key: 'k0'}]`
 * - `[_key=="k0"].children[_key=="s0"]` -> `[{_key: 'k0'}, 'children', {_key: 's0'}]`
 */
export function deserializePath(serialized: string): Path {
  const path: Path = []

  const regex = /\[_key=="([^"]+)"\]|(?:^|\.)([a-zA-Z_][a-zA-Z0-9_]*)/g

  for (
    let match = regex.exec(serialized);
    match !== null;
    match = regex.exec(serialized)
  ) {
    if (match[1] !== undefined) {
      path.push({_key: match[1]})
    } else if (match[2] !== undefined) {
      path.push(match[2])
    }
  }

  return path
}
