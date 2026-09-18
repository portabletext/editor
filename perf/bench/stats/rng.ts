// Ported from sanity/perf/bench/stats/rng.ts — keep in sync.

/**
 * mulberry32 — tiny seeded PRNG. Every random choice in the bench suite goes
 * through a seeded instance so runs are reproducible: the same seed produces
 * the same session schedule and the same bootstrap confidence interval.
 */
export type Rng = () => number

export function mulberry32(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let hash = Math.imul(state ^ (state >>> 15), 1 | state)
    hash = (hash + Math.imul(hash ^ (hash >>> 7), 61 | hash)) ^ hash
    return ((hash ^ (hash >>> 14)) >>> 0) / 4294967296
  }
}
