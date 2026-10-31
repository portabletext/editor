import {expect, test, vi} from 'vitest'
import {driverRuns, typeOnDevice} from '../../driver.ts'

const CRASH = /^NotFoundError: Failed to execute 'removeChild' on 'Node'/

// Each case is a call with a `crash` whose first attempt faults before any input, on a first dump of Gboard
// that hangs until the attempt's bound, so its retry depends only on the Chrome restart between the
// attempts. Calls without a `crash` restart Chrome without reading its pid.

const NO_FRESH_CHROME =
  'InconclusiveAttempt: Inconclusive: the driver faulted and the restart before its retry did not show a fresh Chrome, so the retry did not run. This is not a crash reproduction and not an editor failure. Rerun the job. ChromeNotRestarted:'

function typeKyou() {
  return typeOnDevice({
    lang: 'en',
    page: 'editor.html',
    prefix: '',
    words: [{letters: 'kyou', expect: {trigger: 'letters'}}],
    crash: CRASH,
  }).catch((error: Error) => `${error.name}: ${error.message}`)
}

test('Scenario: A force-stop that leaves the old Chrome running ends the call inconclusive, with no retry', async () => {
  vi.useFakeTimers()
  const log = vi.spyOn(console, 'log')
  globalThis.fakeGboard({lang: 'en', texts: ['', 'Kyou '], hangFirstDump: true})
  globalThis.fakeChrome({survivesStop: true})
  const typing = typeKyou()
  await vi.runAllTimersAsync()

  expect({
    result: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
    phase: noRetryLines(log.mock.calls),
  }).toEqual({
    result: `${NO_FRESH_CHROME} the old Chrome still ran 15s after the force-stop, old pid 4100, new pid 4100`,
    taps: [[]],
    run: 'inconclusive',
    phase: [
      'no retry, Chrome did not restart: the old Chrome still ran 15s after the force-stop, old pid 4100, new pid 4100',
    ],
  })
})

test('Scenario: A force-stop that exits non-zero while Chrome still stops is retried in the new Chrome', async () => {
  vi.useFakeTimers()
  const log = vi.spyOn(console, 'log')
  globalThis.fakeGboard({lang: 'en', texts: ['', 'Kyou '], hangFirstDump: true})
  globalThis.fakeChrome({stopFails: 'exit'})
  const typing = typeKyou()
  await vi.runAllTimersAsync()

  expect({
    result: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
    chrome: globalThis.chromeCalls(),
    phase: freshChromeLines(log.mock.calls),
  }).toEqual({
    result: {
      text: 'Kyou ',
      picked: ['space'],
      compositionstart: 0,
      compositionupdate: 0,
      nested: 0,
      compositionstartPerWord: [0],
      errors: [],
      blocks: 1,
      beforeCommit: [{text: 'Kyou ', blocks: 1}],
      decoratedPerWord: [[]],
      committedRanges: [],
      spaces: [{word: 1, stripSwitched: false, inputRestarted: false}],
    },
    taps: [[], ['K', 'Y', 'O', 'U', 'Space']],
    run: 'complete',
    chrome: [
      'pidof 4100',
      'force-stop',
      'pidof 4101',
      'pidof 4101',
      'force-stop',
    ],
    phase: [
      'force-stop chrome failed: CommandError: adb shell am force-stop com.android.chrome exited with 255: error: closed',
      'fresh chrome for the retry: old pid 4100, new pid 4101',
    ],
  })
})

test('Scenario: A force-stop that times out while Chrome still stops is retried in the new Chrome, naming the adb timeout', async () => {
  vi.useFakeTimers()
  const log = vi.spyOn(console, 'log')
  globalThis.fakeGboard({lang: 'en', texts: ['', 'Kyou '], hangFirstDump: true})
  globalThis.fakeChrome({stopFails: 'timeout'})
  const typing = typeKyou()
  await vi.runAllTimersAsync()

  expect({
    text: ((await typing) as {text: string}).text,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
    phase: freshChromeLines(log.mock.calls),
  }).toEqual({
    text: 'Kyou ',
    taps: [[], ['K', 'Y', 'O', 'U', 'Space']],
    run: 'complete',
    phase: [
      'force-stop chrome failed: CommandTimeoutError: adb shell am force-stop com.android.chrome timed out after 15s, adb timed out during the Chrome restart',
      'fresh chrome for the retry: old pid 4100, new pid 4101',
    ],
  })
})

test('Scenario: A restart that stops Chrome is retried in the new Chrome', async () => {
  vi.useFakeTimers()
  const log = vi.spyOn(console, 'log')
  globalThis.fakeGboard({lang: 'en', texts: ['', 'Kyou '], hangFirstDump: true})
  globalThis.fakeChrome()
  const typing = typeKyou()
  await vi.runAllTimersAsync()

  expect({
    text: ((await typing) as {text: string}).text,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
    chrome: globalThis.chromeCalls(),
    phase: freshChromeLines(log.mock.calls),
  }).toEqual({
    text: 'Kyou ',
    taps: [[], ['K', 'Y', 'O', 'U', 'Space']],
    run: 'complete',
    chrome: [
      'pidof 4100',
      'force-stop',
      'pidof 4101',
      'pidof 4101',
      'force-stop',
    ],
    phase: ['fresh chrome for the retry: old pid 4100, new pid 4101'],
  })
})

test('Scenario: A restart that finds no Chrome running is retried in the one the retry launches', async () => {
  vi.useFakeTimers()
  const log = vi.spyOn(console, 'log')
  globalThis.fakeGboard({lang: 'en', texts: ['', 'Kyou '], hangFirstDump: true})
  globalThis.fakeChrome({notRunning: true})
  const typing = typeKyou()
  await vi.runAllTimersAsync()

  expect({
    text: ((await typing) as {text: string}).text,
    run: driverRuns.at(-1)?.state,
    chrome: globalThis.chromeCalls().slice(0, 4),
    phase: freshChromeLines(log.mock.calls),
  }).toEqual({
    text: 'Kyou ',
    run: 'complete',
    chrome: ['pidof none', 'force-stop', 'pidof 4100', 'pidof 4100'],
    phase: ['fresh chrome for the retry: old pid none, new pid 4100'],
  })
})

test('Scenario: A pid read that times out ends the call inconclusive, with no retry, naming the adb timeout', async () => {
  vi.useFakeTimers()
  const log = vi.spyOn(console, 'log')
  globalThis.fakeGboard({lang: 'en', texts: ['', 'Kyou '], hangFirstDump: true})
  globalThis.fakeChrome({pidofTimesOutAfter: 1})
  const typing = typeKyou()
  await vi.runAllTimersAsync()

  expect({
    result: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
    phase: noRetryLines(log.mock.calls),
  }).toEqual({
    result: `${NO_FRESH_CHROME} adb timed out during the Chrome restart: adb shell pidof com.android.chrome ran past 5s after the force-stop, old pid 4100, new pid unread`,
    taps: [[]],
    run: 'inconclusive',
    phase: [
      'no retry, Chrome did not restart: adb timed out during the Chrome restart: adb shell pidof com.android.chrome ran past 5s after the force-stop, old pid 4100, new pid unread',
    ],
  })
})

function phaseLines(calls: unknown[][], pattern: RegExp): string[] {
  return calls
    .map(([line]) =>
      typeof line === 'string' ? line.replace(/^PHASE \+\s*[\d.]+s /, '') : '',
    )
    .filter((line) => pattern.test(line))
}

function noRetryLines(calls: unknown[][]): string[] {
  return phaseLines(calls, /^no retry, Chrome did not restart/)
}

/** The restart's lines, up to the line the retry logs once its Chrome is fresh. */
function freshChromeLines(calls: unknown[][]): string[] {
  const lines = phaseLines(calls, /^(fresh chrome|force-stop chrome failed)/)
  return lines.slice(
    0,
    lines.findIndex((line) => line.startsWith('fresh chrome')) + 1,
  )
}
