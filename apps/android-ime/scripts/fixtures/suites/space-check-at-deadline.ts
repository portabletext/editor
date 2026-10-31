import {appendFileSync} from 'node:fs'
import {clearInterval, setInterval} from 'node:timers'
import {afterEach, beforeEach, inject, vi} from 'vitest'
import {driverRuns} from '../../driver.ts'

// `tests/en.crashes.test.ts` on the fake Gboard of `gboard-with-layouts.ts`, its last composing screenshot
// answering 176.5 seconds into the attempt, as in a slow run whose final read of the page still comes
// before the 180-second deadline. `inject('spaceCheckAtDeadline')` picks the read after it that hangs or
// fails, whether the page records the case's crash with its trigger, and the file each test's run is
// appended to as a JSON line.
export type SpaceCheckAtDeadline = {
  fault:
    | 'none'
    | 'last-dump-hangs'
    | 'last-dump-fails'
    | 'clock-hangs'
    | 'clock-fails'
    | 'logcat-hangs'
    | 'logcat-fails'
  crash: boolean
  runs: string
}

declare module 'vitest' {
  interface ProvidedContext {
    spaceCheckAtDeadline: SpaceCheckAtDeadline
  }
}

const ERROR =
  "NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node."

beforeEach(({task}) => {
  const {fault, crash} = inject('spaceCheckAtDeadline')
  const prefix = /after yo/.test(task.name) ? 'yo' : ''
  const words = prefix === '' ? 2 : 1
  vi.useFakeTimers({now: 0})
  let delayed = false
  globalThis.fakeGboard({
    lang: 'en',
    spaceStrip: Array.from({length: words}, () => 'switches' as const),
    ...(fault === 'last-dump-hangs' ? {lastDump: 'hangs' as const} : {}),
    ...(fault === 'last-dump-fails' ? {lastDump: 'fails' as const} : {}),
    ...(fault === 'clock-hangs' ? {clock: 'hangs' as const} : {}),
    ...(fault === 'clock-fails' ? {clock: 'fails' as const} : {}),
    ...(fault === 'logcat-hangs' ? {spaceLog: 'hangs' as const} : {}),
    ...(fault === 'logcat-fails' ? {spaceLog: 'fails' as const} : {}),
    slowScreenshot: (name) => {
      if (delayed || !name.endsWith(`-composing${words}`)) return 0
      delayed = true
      return Math.max(0, 176.5 - Date.now() / 1000)
    },
    page: (taps) => {
      const texts = [prefix]
      for (const tap of taps) {
        const text = texts.at(-1)!
        if (/^[a-z]$/i.test(tap))
          texts.push(
            text + (text === '' ? tap.toUpperCase() : tap.toLowerCase()),
          )
        else if (tap === 'Space') texts.push(`${text} `)
      }
      const committed = texts.map((text) =>
        Array.from({length: text.split('you').length - 1}, () => ({
          text: 'you',
          composing: false,
        })),
      )
      const decorated = committed.flatMap((ranges, index) =>
        ranges.slice((committed[index - 1] ?? []).length),
      )
      // The crash comes with the trigger's letters, the last word's, and shows from the read once they were tapped.
      const letters = taps.filter((tap) => /^[a-z]$/i.test(tap)).length
      return {
        text: texts.at(-1),
        blocks: 1,
        events: [],
        errors: crash && letters === (words === 2 ? 8 : 1) ? [ERROR] : [],
        decorated: decorated.map((range) => ({...range, live: range.text})),
        deletions: [],
        committed,
      }
    },
  })
  let busy = false
  pump = setInterval(async () => {
    if (busy) return
    busy = true
    try {
      await vi.advanceTimersByTimeAsync(1000)
    } finally {
      busy = false
    }
  }, 1)
})

let pump: ReturnType<typeof setInterval> | undefined

afterEach(({task}) => {
  clearInterval(pump)
  const {state, errors, inconclusive} = driverRuns.findLast(
    (run) => run.test === task.name,
  )!
  appendFileSync(
    inject('spaceCheckAtDeadline').runs,
    `${JSON.stringify({test: task.name, state, errors, inconclusive})}\n`,
  )
  vi.useRealTimers()
})
