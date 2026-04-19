import type {ParsedScope} from './parse-scope'

/**
 * Compares two parsed scopes by specificity.
 *
 * When multiple registered scopes match the same position, the more specific
 * one wins. Specificity is determined by three rules applied lexicographically:
 *
 * 1. Root-anchored (`$.`) beats descendant (`$..`).
 * 2. Longer chain beats shorter.
 * 3. More exact-descent segments beat fewer.
 *
 * Returns a standard comparator result:
 *
 * - `-1` when `left` is less specific than `right` (left should sort before right).
 * - `1` when `left` is more specific than `right` (left should sort after right).
 * - `0` when the two scopes have equal specificity.
 *
 * Exact-duplicate registrations (same scope, different configs) produce equal
 * specificity; resolution between them is a registration-order policy applied
 * by the caller, not a comparator concern.
 *
 * @internal
 */
export function compareSpecificity(
  left: ParsedScope,
  right: ParsedScope,
): -1 | 0 | 1 {
  const leftRooted = left.anchor === '$.'
  const rightRooted = right.anchor === '$.'

  if (leftRooted !== rightRooted) {
    return leftRooted ? 1 : -1
  }

  if (left.segments.length !== right.segments.length) {
    return left.segments.length > right.segments.length ? 1 : -1
  }

  const leftExact = countExactSegments(left)
  const rightExact = countExactSegments(right)

  if (leftExact !== rightExact) {
    return leftExact > rightExact ? 1 : -1
  }

  return 0
}

function countExactSegments(scope: ParsedScope): number {
  let count = 0
  for (const segment of scope.segments) {
    if (segment.descent === 'exact') {
      count++
    }
  }
  return count
}
