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
 * - `-1` when `a` is less specific than `b` (a should sort before b).
 * - `1` when `a` is more specific than `b` (a should sort after b).
 * - `0` when the two scopes have equal specificity.
 *
 * Exact-duplicate registrations (same scope, different configs) produce equal
 * specificity; resolution between them is a registration-order policy applied
 * by the caller, not a comparator concern.
 *
 * @internal
 */
export function compareSpecificity(a: ParsedScope, b: ParsedScope): -1 | 0 | 1 {
  const aRooted = a.anchor === '$.'
  const bRooted = b.anchor === '$.'

  if (aRooted !== bRooted) {
    return aRooted ? 1 : -1
  }

  if (a.segments.length !== b.segments.length) {
    return a.segments.length > b.segments.length ? 1 : -1
  }

  const aExact = countExactSegments(a)
  const bExact = countExactSegments(b)

  if (aExact !== bExact) {
    return aExact > bExact ? 1 : -1
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
