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
function _matchScope(
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

// ---------- Throwaway instrumentation -------------------------------
// THIS BRANCH IS NOT FOR MERGING. The constant below is flipped to
// `true` only on a throwaway branch used to capture matchScope
// distribution data, locally and in a Vercel preview deploy.
//
// When the constant is `false` (main), the ternary at the bottom of the
// file collapses at module load to a direct reference to `_matchScope`.
// No per-call check, no extra function call, no measurement cost.
//
// IMPORTANT: when `__INSTRUMENT === true`, total wall-clock numbers (e.g.
// the performance.test.tsx harness's per-iteration ms) are not comparable
// to merged-PR baselines - the wrapper adds overhead per call. The valid
// signal is what `__matchScopeStats()` reports (per-call distribution,
// count), not the harness total.
//
// Purpose: disconfirmer for CPU-sampler attribution. If `matchScope`
// shows up at 46% self in a prod trace, we need entry/exit wall-clock
// timing to confirm whether per-call cost is real or sampler artifact.
//
// See /specs/matchscope-investigation.md.

const __INSTRUMENT = false

const __samples: Array<number> = []
let __total = 0

if (__INSTRUMENT) {
  ;(globalThis as {__matchScopeStats?: () => unknown}).__matchScopeStats =
    () => {
      const sorted = [...__samples].sort((a, b) => a - b)
      const at = (q: number) => sorted[Math.floor(sorted.length * q)]
      return {
        count: __samples.length,
        totalMs: Number(__total.toFixed(3)),
        p50: at(0.5),
        p95: at(0.95),
        p99: at(0.99),
        max: sorted[sorted.length - 1],
      }
    }
  ;(globalThis as {__matchScopeReset?: () => void}).__matchScopeReset = () => {
    __samples.length = 0
    __total = 0
  }
}

function _matchScopeInstrumented(
  scope: ParsedScope,
  typePath: ReadonlyArray<string>,
): boolean {
  const t0 = performance.now()
  const result = _matchScope(scope, typePath)
  const dt = performance.now() - t0
  __samples.push(dt)
  __total += dt
  return result
}

export const matchScope: typeof _matchScope = __INSTRUMENT
  ? _matchScopeInstrumented
  : _matchScope
