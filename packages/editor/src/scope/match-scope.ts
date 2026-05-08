import type {ParsedScope} from './parse-scope'

/**
 * Checks whether a parsed scope matches a type-path from the root of the
 * editor down to the node being rendered.
 *
 * The match is terminal-anchored: the scope's last segment must align with
 * the last element of `typePath`. Earlier segments are matched in order:
 *
 * - `exact` segments must sit at the current cursor position.
 * - `any` segments can skip zero or more positions before matching.
 *
 * The scope's anchor (`$.` vs `$..`) is encoded in the first segment's
 * descent: `$.` produces an `exact` first segment (must start at position
 * 0), `$..` produces an `any` first segment (may start anywhere).
 *
 * Implemented as a backtracking match so an `any` segment can pick the
 * LAST viable position that still allows the remaining segments to align
 * with the terminal of `typePath`.
 *
 * @internal
 */
export function matchScope(
  scope: ParsedScope,
  typePath: ReadonlyArray<string>,
): boolean {
  if (scope.segments.length === 0) {
    return false
  }
  if (typePath.length === 0) {
    return false
  }
  return tryMatch(scope.segments, 0, typePath, 0)
}

function tryMatch(
  segments: ParsedScope['segments'],
  segIdx: number,
  typePath: ReadonlyArray<string>,
  pathIdx: number,
): boolean {
  if (segIdx === segments.length) {
    // Terminal-anchored: must have consumed the entire path.
    return pathIdx === typePath.length
  }
  const segment = segments[segIdx]
  if (!segment) {
    return false
  }
  if (segment.descent === 'exact') {
    if (pathIdx >= typePath.length || typePath[pathIdx] !== segment.type) {
      return false
    }
    return tryMatch(segments, segIdx + 1, typePath, pathIdx + 1)
  }
  // `any`: try each viable starting position from `pathIdx` to the end.
  for (let i = pathIdx; i < typePath.length; i++) {
    if (typePath[i] === segment.type) {
      if (tryMatch(segments, segIdx + 1, typePath, i + 1)) {
        return true
      }
    }
  }
  return false
}
