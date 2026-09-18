/**
 * A session that throws (most commonly `SessionError`) is discarded and
 * retried, never counted toward the sample — a typing session that produced
 * no observable effect on the document is not a fast session, it is a
 * broken one. Mirrors sanity/perf/bench/runner/orchestrator.ts's
 * `maxConsecutiveFailures` retry loop — keep in sync.
 */
export interface RetryConfig {
  /** Consecutive failures on one call site that abort instead of retrying. */
  maxConsecutiveFailures: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {maxConsecutiveFailures: 3}

export async function withSessionRetry<T>(options: {
  run: () => Promise<T>
  config?: Partial<RetryConfig>
  onFailure?: (error: unknown, attempt: number) => void
  label: string
}): Promise<T> {
  const config = {...DEFAULT_RETRY_CONFIG, ...options.config}
  let attempt = 0
  for (;;) {
    try {
      return await options.run()
    } catch (error) {
      attempt += 1
      options.onFailure?.(error, attempt)
      if (attempt >= config.maxConsecutiveFailures) {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(
          `${options.label}: ${attempt} consecutive session failures (last: ${message})`,
          {cause: error},
        )
      }
    }
  }
}
