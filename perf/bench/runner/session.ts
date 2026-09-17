import type {Browser, Page} from 'playwright'
import type {BenchEntries} from '../instrumentation/types'
import type {CaretTarget} from '../scenarios/types'
import {SessionError} from './session-error'

const CHARACTERS =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/**
 * The Event Timing API cannot observe interactions faster than this (spec
 * minimum durationThreshold). Keystrokes that produce no entry are recorded
 * at this floor value, on both sides of a comparison, so it stays fair.
 */
const OBSERVABILITY_FLOOR_MS = 16

export interface SessionConfig {
  warmupKeystrokes: number
  measuredKeystrokes: number
  cadenceMs: number
  cpuThrottleRate: number
  readinessTimeoutMs: number
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  warmupKeystrokes: 8,
  measuredKeystrokes: 32,
  cadenceMs: 100,
  // 8x: at 4x most `hugeDoc`/`decoratorHeavy` keystrokes land below the
  // observability floor (see the README's noise policy).
  cpuThrottleRate: 8,
  readinessTimeoutMs: 30_000,
}

export interface SessionResult {
  /** One keydown-to-paint latency per measured keystroke (ms), floor-filled. */
  samples: number[]
  /** Measured keystrokes that produced no Event Timing entry. */
  belowFloorCount: number
}

/**
 * One typing session: navigate to the scenario, wait for readiness, place
 * the caret, type warm-up keystrokes (discarded), then the measured
 * keystrokes at a fixed cadence timed in Node. All latency numbers come
 * from the page's own Event Timing observer; the runner only orchestrates.
 */
export async function runTypingSession(options: {
  browser: Browser
  url: string
  scenarioName: string
  target: CaretTarget
  instrumentationSource: string
  config?: Partial<SessionConfig>
  traceFile?: string
}): Promise<SessionResult> {
  const config = {...DEFAULT_SESSION_CONFIG, ...options.config}
  const context = await options.browser.newContext()
  if (options.traceFile !== undefined) {
    await context.tracing.start({screenshots: true, snapshots: true})
  }
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  if (config.cpuThrottleRate > 1) {
    await cdp.send('Emulation.setCPUThrottlingRate', {
      rate: config.cpuThrottleRate,
    })
  }

  try {
    await page.addInitScript(options.instrumentationSource)
    const scenarioUrl = `${options.url}?scenario=${encodeURIComponent(options.scenarioName)}`
    await page.goto(scenarioUrl, {waitUntil: 'domcontentloaded'})
    await page
      .locator('body[data-bench-ready="true"]')
      .waitFor({state: 'attached', timeout: config.readinessTimeoutMs})

    await placeCaret(page, options.target)
    const textLengthBeforeTyping = await readEditorTextLength(page)

    let characterOffset = 0
    await typeKeystrokes(
      page,
      config.warmupKeystrokes,
      config.cadenceMs,
      characterOffset,
    )
    characterOffset += config.warmupKeystrokes
    await drainEntries(page)

    await typeKeystrokes(
      page,
      config.measuredKeystrokes,
      config.cadenceMs,
      characterOffset,
    )
    const entries = await drainEntries(page)

    const textLengthAfterTyping = await readEditorTextLength(page)
    const expectedGrowth = config.warmupKeystrokes + config.measuredKeystrokes
    const actualGrowth = textLengthAfterTyping - textLengthBeforeTyping
    if (actualGrowth !== expectedGrowth) {
      throw new SessionError(
        'no-op-typing',
        `expected the editor's text to grow by ${expectedGrowth} characters ` +
          `(${config.warmupKeystrokes} warm-up + ${config.measuredKeystrokes} measured), ` +
          `it grew by ${actualGrowth}`,
      )
    }

    return toSessionResult(entries, config.measuredKeystrokes)
  } finally {
    if (options.traceFile !== undefined) {
      await context.tracing.stop({path: options.traceFile})
    }
    await context.close()
  }
}

async function placeCaret(page: Page, target: CaretTarget): Promise<void> {
  const block = page.locator(`[data-block-index="${target.blockIndex}"]`)
  await block.waitFor({state: 'visible', timeout: 30_000})
  await block.click()
  if (target.position === 'end') {
    await page.keyboard.press('End')
  }
}

/**
 * Total text length of the document, read straight off the editor's own
 * contenteditable root (`data-pt-editor` — see engine/react/components/
 * editable.tsx) rather than tracked in Node: the session-validity check
 * below needs the editor's own account of what landed, not the runner's
 * assumption that every keystroke it sent took effect.
 */
async function readEditorTextLength(page: Page): Promise<number> {
  return page
    .locator('[data-pt-editor]')
    .first()
    .evaluate((element) => element.textContent?.length ?? 0)
}

async function typeKeystrokes(
  page: Page,
  count: number,
  cadenceMs: number,
  characterOffset: number,
): Promise<void> {
  for (let index = 0; index < count; index++) {
    const character = CHARACTERS[(characterOffset + index) % CHARACTERS.length]
    if (character === undefined) throw new Error('unreachable')
    await page.keyboard.press(character)
    await page.waitForTimeout(cadenceMs)
  }
}

/** Two rAFs so trailing presentation work is attributed, then drain. */
async function drainEntries(page: Page): Promise<BenchEntries> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      }),
  )
  await page.waitForTimeout(200)
  const entries = await page.evaluate(() => window.__bench?.take() ?? null)
  if (!entries) {
    throw new Error(
      'instrumentation collector missing (window.__bench) — was it injected?',
    )
  }
  return entries
}

/**
 * Group Event Timing entries by interactionId and take the max duration per
 * interaction (the same rule web-vitals INP uses). Keystrokes that produced
 * no entry — faster than the observability floor — are recorded at the
 * floor, and counted in belowFloorCount.
 *
 * Near-verbatim port of sanity/perf/bench/runner/session/interaction.ts's
 * `toLatencies` — keep in sync.
 */
function toSessionResult(
  entries: BenchEntries,
  sentKeystrokes: number,
): SessionResult {
  const maxDurationByInteraction = new Map<number, number>()
  for (const event of entries.events) {
    if (event.interactionId > 0) {
      const currentMax = maxDurationByInteraction.get(event.interactionId) ?? 0
      maxDurationByInteraction.set(
        event.interactionId,
        Math.max(currentMax, event.duration),
      )
    }
  }
  const observedLatencies = [...maxDurationByInteraction.values()]
  const belowFloorCount = Math.max(
    0,
    entries.keydownCount - maxDurationByInteraction.size,
  )
  const samples = observedLatencies.concat(
    Array(belowFloorCount).fill(OBSERVABILITY_FLOOR_MS),
  )
  if (samples.length !== sentKeystrokes) {
    throw new Error(
      `expected ${sentKeystrokes} keystroke samples, got ${samples.length} ` +
        `(${observedLatencies.length} observed interactions, ${entries.keydownCount} keydowns, ` +
        `${belowFloorCount} below floor)`,
    )
  }
  return {samples, belowFloorCount}
}
