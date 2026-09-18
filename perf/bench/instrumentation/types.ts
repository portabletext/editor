/**
 * Shapes shared between the in-page collector (instrumentation/index.ts,
 * bundled and injected into the host page) and the runner (which drains
 * them via `window.__bench.take()`). Import type-only from runner code.
 */

/** One Event Timing API entry (PerformanceEventTiming), trimmed. */
export interface EventTimingSample {
  name: string
  interactionId: number
  startTime: number
  /** startTime → next paint, rounded to 8ms granularity by the browser. */
  duration: number
}

export interface BenchEntries {
  events: EventTimingSample[]
  /** Keydown events observed since the last take() — the "sent" count. */
  keydownCount: number
}

export interface BenchCollector {
  /** Drain and return everything collected since the last take(). */
  take(): BenchEntries
}

declare global {
  interface Window {
    __bench?: BenchCollector
  }
}
