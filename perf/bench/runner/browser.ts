import {chromium, type Browser, type Page} from 'playwright'

export function launchBrowser(options?: {headed?: boolean}): Promise<Browser> {
  return chromium.launch({headless: !options?.headed})
}

/**
 * Fixed-work microbenchmark run once per bench invocation (unthrottled) —
 * the host-speed calibration score recorded in every result document. CDP
 * CPU throttling is *relative* to host speed, so absolute latency numbers
 * are only comparable across runs via this score. Higher = slower host.
 *
 * Ported from sanity/perf/bench/runner/browser.ts (calibrateHost) — keep in
 * sync.
 */
export async function calibrateHost(browser: Browser): Promise<number> {
  const context = await browser.newContext()
  const page = await context.newPage()
  try {
    return await runCalibrationLoop(page)
  } finally {
    await context.close()
  }
}

/**
 * The same fixed-work loop as `calibrateHost`, run under
 * `Emulation.setCPUThrottlingRate` at the rate every typing session uses.
 * Recorded alongside the unthrottled score so a benchrun's JSON carries
 * proof the throttle applied — a wrong CDP session target silently yields a
 * ~1x ratio instead of the expected ~N x, and every session's samples would
 * then be running at native host speed without saying so.
 */
export async function calibrateHostThrottled(
  browser: Browser,
  cpuThrottleRate: number,
): Promise<number> {
  const context = await browser.newContext()
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  try {
    await cdp.send('Emulation.setCPUThrottlingRate', {rate: cpuThrottleRate})
    return await runCalibrationLoop(page)
  } finally {
    await context.close()
  }
}

async function runCalibrationLoop(page: Page): Promise<number> {
  return page.evaluate(() => {
    const runDurations: number[] = []
    for (let run = 0; run < 5; run++) {
      const start = performance.now()
      let hash = 2166136261
      for (let index = 0; index < 5_000_000; index++) {
        hash ^= index
        hash = Math.imul(hash, 16777619)
      }
      if (hash === 0) throw new Error('unreachable')
      runDurations.push(performance.now() - start)
    }
    runDurations.sort((first, second) => first - second)
    const median = runDurations[2]
    if (median === undefined) throw new Error('unreachable')
    return median
  })
}
