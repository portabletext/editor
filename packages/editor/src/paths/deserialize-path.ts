import type {Path} from '../types/paths'

/**
 * Deserialize a serialized keyed path.
 *
 * Assumes a structure where the path is always bookended keyed segments with
 * string segments in between:
 *
 * - `k0` -> `[{_key: 'k0'}]`
 * - `k0.children.s0` -> `[{_key: 'k0'}, 'children', {_key: 's0'}]`
 * - `tableKey.rows.rowKey.cells.cellKey.content.blockKey.children.spanKey` -> `[{_key: 'tableKey'}, 'rows', {_key: 'rowKey'}, 'cells', {_key: 'cellKey'}, 'content', {_key: 'blockKey'}, 'children', {_key: 'spanKey}]`
 */
export function deserializePath(serializedPath: string): Path {
  const segments = serializedPath.split('.')

  const path: Path = []

  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index]

    if (!segment) {
      continue
    }

    if (index % 2 === 0) {
      path.push({_key: segment})
    } else {
      path.push(segment)
    }
  }

  return path
}
