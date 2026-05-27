import type {DropPosition} from '../behaviors/behavior.core.drop-position'
import type {Path} from '../engine/interfaces/path'
import {pathEquals} from '../engine/path/path-equals'

/**
 * Returns the `position` of a drop hover when the hover targets the given
 * element path; `undefined` otherwise.
 *
 * Path-based match — works at any depth. Comparing by `_key` alone is
 * ambiguous because keys are sibling-unique, not tree-unique: two blocks
 * at different depths can share the same `_key` and a key-only match
 * would paint the indicator on both.
 */
export function resolveElementDropPosition(
  dropPosition: DropPosition | undefined,
  elementPath: Path,
): DropPosition['position'] | undefined {
  if (!dropPosition) {
    return undefined
  }

  if (!pathEquals(dropPosition.path, elementPath)) {
    return undefined
  }

  return dropPosition.position
}
