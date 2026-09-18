// Ported from sanity/perf/bench/stats/quantiles.ts — keep in sync.

/**
 * Type-7 (linear interpolation) quantile — the R/NumPy default.
 */
export function quantile(values: number[], probability: number): number {
  if (values.length === 0) {
    throw new Error('Cannot compute quantile of empty sample')
  }
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    throw new Error(
      `quantile probability must be a finite number in [0, 1], got ${probability}`,
    )
  }
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error('Cannot compute quantile of non-finite samples')
  }
  const sorted = values.toSorted((first, second) => first - second)
  const index = probability * (sorted.length - 1)
  const lowerRank = Math.floor(index)
  const upperRank = Math.ceil(index)
  const lowerValue = sorted[lowerRank]
  const upperValue = sorted[upperRank]
  if (lowerValue === undefined || upperValue === undefined)
    throw new Error('unreachable')
  if (lowerRank === upperRank) {
    return lowerValue
  }
  return lowerValue + (upperValue - lowerValue) * (index - lowerRank)
}

export function median(values: number[]): number {
  return quantile(values, 0.5)
}

export interface SummaryStats {
  n: number
  min: number
  median: number
  p75: number
  p90: number
  p99: number
  max: number
}

export function summarize(values: number[]): SummaryStats {
  return {
    n: values.length,
    min: Math.min(...values),
    median: quantile(values, 0.5),
    p75: quantile(values, 0.75),
    p90: quantile(values, 0.9),
    p99: quantile(values, 0.99),
    max: Math.max(...values),
  }
}
