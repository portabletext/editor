import type {KeyedPath, KeyedPathSegment} from '../interfaces/operation'

/**
 * Resolves a keyed path to an indexed path by walking the tree.
 * String segments navigate into object fields.
 * Keyed segments find by `_key` in the current array.
 *
 * Uses blockIndexMap for the first keyed segment as an optimization.
 */
export function resolveKeyedPath(
  root: {children: Array<unknown>},
  path: KeyedPath,
  blockIndexMap?: Map<string, number>,
): Array<number> | undefined {
  const result: Array<number> = []
  let current: unknown = root

  for (let i = 0; i < path.length; i++) {
    const segment = path.at(i)

    if (segment === undefined) {
      return undefined
    }

    if (typeof segment === 'string') {
      if (
        current === null ||
        current === undefined ||
        typeof current !== 'object'
      ) {
        return undefined
      }
      current = (current as Record<string, unknown>)[segment]
    } else {
      const keyedSegment = segment as KeyedPathSegment
      const arr = Array.isArray(current)
        ? (current as Array<Record<string, unknown>>)
        : (current as Record<string, unknown>)['children']

      if (!Array.isArray(arr)) {
        return undefined
      }

      // Use blockIndexMap for top-level blocks
      if (result.length === 0 && blockIndexMap) {
        const index = blockIndexMap.get(keyedSegment._key)
        if (index === undefined) {
          return undefined
        }
        result.push(index)
        current = arr.at(index)
      } else {
        const index = arr.findIndex(
          (item) =>
            item !== null &&
            typeof item === 'object' &&
            '_key' in item &&
            item._key === keyedSegment._key,
        )
        if (index === -1) {
          return undefined
        }
        result.push(index)
        current = arr.at(index)
      }
    }
  }

  return result
}
