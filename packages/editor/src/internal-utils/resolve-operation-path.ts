import type {Path} from '../engine/interfaces/path'
import {getValue} from './get-value'
import {toKeyedPatchPath} from './operation-to-patches'

/**
 * Mirrors `@portabletext/patches` bounds: `undefined` means the path
 * addresses nothing and the event must apply nothing.
 */
export function resolveOperationPath(
  value: unknown,
  path: Path,
  options?: {insert?: boolean},
): Path | undefined {
  const absolutePath: Path = []

  for (const [segmentIndex, segment] of path.entries()) {
    if (typeof segment !== 'number') {
      absolutePath.push(segment)
      continue
    }

    const elements = getValue(value, absolutePath)

    if (!Array.isArray(elements)) {
      absolutePath.push(segment)
      continue
    }

    const index = segment < 0 ? elements.length + segment : segment

    if (index >= 0 && index < elements.length) {
      absolutePath.push(index)
      continue
    }

    if (
      options?.insert &&
      segmentIndex === path.length - 1 &&
      elements.length === 0 &&
      (segment === 0 || segment === -1)
    ) {
      absolutePath.push(0)
      continue
    }

    return undefined
  }

  return toKeyedPatchPath(value, absolutePath)
}
