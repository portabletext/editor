import {comparePaths as comparePathsEngine} from '../engine/path/compare-paths'
import type {Path} from '../types/paths'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Returns:
 *
 * - `-1` if `pathA` is before `pathB`
 * - `0` if `pathA` and `pathB` are equal, or one is an ancestor of the
 *   other
 * - `1` if `pathA` is after `pathB`
 *
 * Compares the two paths by document order, resolved at any depth.
 *
 * Equal-or-ancestor paths return `0`, not just structurally-equal ones —
 * `[{_key: 'b1'}]` and `[{_key: 'b1'}, 'children', {_key: 's1'}]` compare
 * as equal. Use `pathEquals` when you need the stricter check.
 *
 * @beta
 */
export function comparePaths(
  snapshot: TraversalSnapshot,
  pathA: Path,
  pathB: Path,
): -1 | 0 | 1 {
  return comparePathsEngine(pathA, pathB, {value: snapshot.context.value})
}
