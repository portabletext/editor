/**
 * The in-page collector. Bundled to an IIFE by the runner at startup
 * (runner/bundle-instrumentation.ts) and injected via `page.addInitScript`,
 * so it runs before any host code on every navigation. All timing happens
 * on the page's own monotonic clock; the runner never compares
 * cross-process timestamps.
 *
 * Ported from sanity/perf/bench/instrumentation/index.ts — keep in sync
 * (trimmed to Event Timing + a keydown counter; the source suite also
 * tracks LoAF, paint and layout-shift entries this bench does not need).
 */
import type {BenchCollector, BenchEntries, EventTimingSample} from './types'

/**
 * The spec minimum. Interactions faster than 16ms are unobservable — which
 * is why sessions run under CPU throttling (see the README).
 */
const EVENT_DURATION_THRESHOLD_MS = 16

function install(): void {
  const events: EventTimingSample[] = []
  let keydownCount = 0

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const eventTiming = entry as PerformanceEventTiming
      events.push({
        name: eventTiming.name,
        interactionId: eventTiming.interactionId ?? 0,
        startTime: eventTiming.startTime,
        duration: eventTiming.duration,
      })
    }
  })
  observer.observe({
    type: 'event',
    buffered: true,
    // `durationThreshold` is missing from lib.dom's PerformanceObserverInit
    // even though it is part of the Event Timing spec Chromium implements.
    durationThreshold: EVENT_DURATION_THRESHOLD_MS,
  } as PerformanceObserverInit)

  window.addEventListener(
    'keydown',
    () => {
      keydownCount += 1
    },
    {capture: true},
  )

  const collector: BenchCollector = {
    take(): BenchEntries {
      const taken: BenchEntries = {events: events.splice(0), keydownCount}
      keydownCount = 0
      return taken
    },
  }

  window.__bench = collector
}

install()
