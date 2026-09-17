// Ported from sanity/perf/bench/stats/bootstrap.ts — keep in sync.
import {median, quantile} from './quantiles'
import type {Rng} from './rng'

export interface DiffInterval {
  /** Point estimate: median(experiment pooled) − median(reference pooled). */
  diff: number
  /** Percentile bootstrap confidence bounds on the difference. */
  lo: number
  hi: number
  level: number
  iterations: number
}

/**
 * Cluster bootstrap on the difference of medians. Sessions — not pooled
 * keystrokes — are the resampling unit: keystrokes within one session share
 * environment state (GC phase, scheduler mood, neighbor noise), so
 * resampling them individually would fake independence and understate the
 * interval's width.
 *
 * Each iteration resamples sessions with replacement per side, pools the
 * resampled sessions' samples, and takes `median(experiment) −
 * median(reference)`; the interval is the percentile range of those
 * differences.
 */
export function bootstrapDiffOfMedians(options: {
  /** Per-session sample arrays for the reference side. */
  referenceSessions: number[][]
  /** Per-session sample arrays for the experiment side. */
  experimentSessions: number[][]
  rng: Rng
  iterations?: number
  level?: number
}): DiffInterval {
  const {
    referenceSessions,
    experimentSessions,
    rng,
    iterations = 2000,
    level = 0.95,
  } = options
  if (referenceSessions.length === 0 || experimentSessions.length === 0) {
    throw new Error(
      'bootstrapDiffOfMedians requires at least one session per side',
    )
  }

  const differences: number[] = []
  for (let iteration = 0; iteration < iterations; iteration++) {
    const resampledReference = resampleSessions(referenceSessions, rng)
    const resampledExperiment = resampleSessions(experimentSessions, rng)
    differences.push(median(resampledExperiment) - median(resampledReference))
  }

  const alpha = (1 - level) / 2
  return {
    diff: median(experimentSessions.flat()) - median(referenceSessions.flat()),
    lo: quantile(differences, alpha),
    hi: quantile(differences, 1 - alpha),
    level,
    iterations,
  }
}

function resampleSessions(sessions: number[][], rng: Rng): number[] {
  const pooled: number[] = []
  for (let sessionIndex = 0; sessionIndex < sessions.length; sessionIndex++) {
    const picked = sessions[Math.floor(rng() * sessions.length)]
    if (picked === undefined) throw new Error('unreachable')
    for (const sample of picked) {
      pooled.push(sample)
    }
  }
  return pooled
}
