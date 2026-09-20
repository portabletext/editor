// Ported from sanity/perf/bench/stats/gate.ts — keep in sync.
import type {DiffInterval} from './bootstrap'

export type Verdict = 'regression' | 'improvement' | 'neutral' | 'inconclusive'

export interface GateThresholds {
  /** Minimum absolute difference (ms) to matter. */
  absMs: number
  /** Minimum relative difference (fraction of the reference median). */
  rel: number
  /** CI half-width below which sampling may stop (see shouldStop). */
  targetHalfWidthMs: number
}

/**
 * Interaction latency: differences of one Event Timing duration-granularity
 * step (8ms) or under 5% are noise. The absolute floor sits strictly above
 * one 8ms granularity step (the smallest non-zero difference the browser can
 * report) so that two identical builds can never gate a verdict off a single
 * quantisation step landing samples one step apart.
 */
export const KEYSTROKE_LATENCY_THRESHOLDS: GateThresholds = {
  absMs: 16,
  rel: 0.05,
  targetHalfWidthMs: 8,
}

/**
 * Verdict rule: a difference is real only when the CI excludes zero AND the
 * point estimate exceeds both threshold floors. `inconclusive` (CI too wide
 * to decide at these thresholds) is distinct from `neutral` so a noisy run
 * never reads as a pass/fail coin flip.
 */
export function gate(
  interval: DiffInterval,
  referenceMedian: number,
  thresholds: GateThresholds,
): Verdict {
  const minimumEffect = Math.max(
    thresholds.absMs,
    thresholds.rel * referenceMedian,
  )

  if (interval.lo > 0 && interval.diff >= minimumEffect) {
    return 'regression'
  }
  if (interval.hi < 0 && -interval.diff >= minimumEffect) {
    return 'improvement'
  }
  const halfWidth = (interval.hi - interval.lo) / 2
  if (halfWidth > Math.max(thresholds.targetHalfWidthMs, minimumEffect)) {
    return 'inconclusive'
  }
  return 'neutral'
}

/** True only for `regression` and `improvement` — the self-test's failure predicate. */
export function isDecidedVerdict(verdict: Verdict | undefined): boolean {
  return verdict === 'regression' || verdict === 'improvement'
}

/** `self-test` fails as soon as any scenario's verdict is decided. */
export function hasDecidedVerdict(
  verdicts: Array<Verdict | undefined>,
): boolean {
  return verdicts.some(isDecidedVerdict)
}

/**
 * Dynamic stopping: stop sampling once the CI is tight enough to decide —
 * the exact complement of gate()'s `inconclusive` boundary, so a run that
 * stopped as "converged" can never gate inconclusive.
 */
export function shouldStop(
  interval: DiffInterval,
  referenceMedian: number,
  thresholds: GateThresholds,
): boolean {
  const minimumEffect = Math.max(
    thresholds.absMs,
    thresholds.rel * referenceMedian,
  )
  const halfWidth = (interval.hi - interval.lo) / 2
  return halfWidth <= Math.max(thresholds.targetHalfWidthMs, minimumEffect)
}
