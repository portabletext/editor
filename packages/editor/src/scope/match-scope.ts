import type {ParsedScope} from './parse-scope'

/**
 * Checks whether a parsed scope matches a type-path from the root of the
 * editor down to the node being rendered.
 *
 * The match is terminal: the scope's last segment must align with the last
 * element of `typePath`. This is the semantics used by `defineContainer` and
 * `defineLeaf`.
 *
 * The algorithm walks the scope's segments left-to-right over `typePath`:
 *
 * - An `exact` segment must sit at the current cursor position in the path.
 * - An `any` segment can skip over zero or more path positions to find a match.
 * - After processing all segments, the cursor must have consumed the entire
 *   path (so the last segment aligns with the last path element).
 *
 * The scope's anchor (`$.` vs `$..`) is encoded in the first segment's
 * descent: `$.` produces an `exact` first segment (must start at position 0),
 * `$..` produces an `any` first segment (may start anywhere).
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

  let pathIdx = 0

  for (const segment of scope.segments) {
    if (segment.descent === 'exact') {
      if (pathIdx >= typePath.length || typePath[pathIdx] !== segment.type) {
        return false
      }
      pathIdx++
      continue
    }

    let found = -1
    for (let i = pathIdx; i < typePath.length; i++) {
      if (typePath[i] === segment.type) {
        found = i
        break
      }
    }

    if (found === -1) {
      return false
    }

    pathIdx = found + 1
  }

  return pathIdx === typePath.length
}
