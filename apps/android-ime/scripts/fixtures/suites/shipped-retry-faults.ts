import {appendFileSync} from 'node:fs'
import {clearInterval, setInterval} from 'node:timers'
import {afterEach, beforeEach, inject, vi} from 'vitest'
import {driverRuns} from '../../driver.ts'

// `tests/ja.test.ts` and `tests/en.test.ts` on the fake Gboard of `gboard-with-layouts.ts`, with the
// production bounds and pauses on fake timers that a pump advances. Each attempt's tap on the field's
// second letter is rejected once, so every call has a first attempt that faulted after input and a retry.
// `inject('shippedFault')` picks how the pid reads or the relaunch of a call with a `crash` would fail, which
// these calls, without one, never read. `IME_CALLS_FILE` gets each test's state, retries, taps and Chrome
// calls.
export type ShippedFault =
  | 'pid-error'
  | 'pid-timeout'
  | 'pid-empty'
  | 'restart-survives'
  | 'relaunch-none'
  | 'relaunch-old'
  | 'slow-pid-success'

declare module 'vitest' {
  interface ProvidedContext {
    shippedFault: ShippedFault
  }
}

let pump: ReturnType<typeof setInterval> | undefined
let log: {mock: {calls: unknown[][]}; mockRestore: () => void} | undefined

beforeEach(({task}) => {
  vi.useFakeTimers()
  const lang = task.file.name.includes('/ja.') ? 'ja' : 'en'
  const prefix = /after existing text/.test(task.name) ? 'x' : ''
  globalThis.fakeGboard({
    lang,
    candidate: '今日',
    rejectFirst: lang === 'ja' ? 'y' : 'Y',
    page: (taps) =>
      lang === 'ja'
        ? japanesePage(prefix, taps)
        : englishPage(prefix, taps, task.name.includes('plain')),
    ...(inject('shippedFault') === 'slow-pid-success'
      ? {loadingReads: {count: 16, seconds: 9.5}}
      : {}),
  })
  globalThis.fakeChrome(chrome(inject('shippedFault')))
  log = vi.spyOn(console, 'log')
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

afterEach(({task}) => {
  clearInterval(pump)
  const retries = (log?.mock.calls ?? []).filter(
    ([line]) => typeof line === 'string' && / RETRY /.test(line),
  ).length
  log?.mockRestore()
  vi.useRealTimers()
  appendFileSync(
    process.env.IME_CALLS_FILE!,
    `${JSON.stringify({
      test: task.name,
      state: driverRuns.findLast((run) => run.test === task.name)?.state,
      retries,
      taps: globalThis.gboardTaps(),
      chrome: globalThis.chromeCalls(),
    })}\n`,
  )
})

function chrome(
  fault: ShippedFault,
): Parameters<typeof globalThis.fakeChrome>[0] {
  switch (fault) {
    case 'pid-error':
      return {pidofFails: {read: 1, stderr: 'error: closed'}}
    case 'pid-timeout':
      return {pidofTimesOutAfter: 0}
    case 'pid-empty':
      return {pidofFails: {read: 1, stderr: 'unrelated adb error'}}
    case 'restart-survives':
      return {survivesStop: true}
    case 'relaunch-none':
      return {relaunch: 'none'}
    case 'relaunch-old':
      return {relaunch: 'old'}
    case 'slow-pid-success':
      return {slowPidof: {read: 3, seconds: 4.9}}
  }
}

/**
 * English Gboard commits each letter, capitalizing the block's first one. A plain `contenteditable` can drop
 * its trailing space, which `tests/en.test.ts` accepts.
 */
function englishPage(prefix: string, taps: string[], plain: boolean) {
  let text = prefix
  for (const tap of taps) {
    if (/^[A-Z]$/.test(tap)) text += text === '' ? tap : tap.toLowerCase()
    else if (tap === 'Space') text += ' '
  }
  return {text: plain ? text.trimEnd() : text, events: [], errors: []}
}

/** Japanese Gboard opens a composition on `k` and closes it on the candidate. */
function japanesePage(prefix: string, taps: string[]) {
  let text = prefix
  const events: Array<{type: string}> = []
  for (const tap of taps) {
    if (tap === 'k') events.push({type: 'compositionstart'})
    if (tap === '今日') {
      text += '今日'
      events.push({type: 'compositionend'})
    }
  }
  return {text, events, errors: []}
}
