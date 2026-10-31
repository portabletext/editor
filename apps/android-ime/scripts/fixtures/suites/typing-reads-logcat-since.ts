import {expect, test, vi} from 'vitest'
import {driverRuns, typeOnDevice} from '../../driver.ts'

// The read of `main` after a call's final read starts the pad and 5 seconds before the call's first tap,
// on the device's clock as `date +%s.%N` printed it, to the millisecond. The fake device's clock runs
// 1793480000 seconds ahead of the host's, which the test starts at 0, and its first tap goes out at 2.

const CRASH = /^NotFoundError: Failed to execute 'removeChild' on 'Node'/

const INCONCLUSIVE =
  "InconclusiveAttempt: Inconclusive: the driver faulted after typing started, so this run cannot tell whether the editor crashed. This is not a crash reproduction and not an editor failure. Rerun the job. The fault: Error: word 1: the page did not get the Space tapped to commit it. Gboard's suggestion strip and logcat may explain why but never decide the outcome: the strip ['Kyou', 'You', 'Kyu'] before the tap and ['you', 'I', 'to'] after it, the dump after it ending at 1.90s after the Space, switched True, input restarted unread ("

const LOST_SPACE =
  'and a Space the page lacks is never an editor result, whatever the strip and logcat show'

const READ = 'logcat -d -v epoch -b main -T 1793479998.000'

test('Scenario: adb rejects the time logcat reads from', async () => {
  const log = vi.spyOn(console, 'log')
  const typing = typeKyou('rejects-since', 1)
  await vi.runAllTimersAsync()

  expect({
    result: await typing,
    logcat: logcatReads(),
    lines: spaceLines(log.mock.calls),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    result: `${INCONCLUSIVE}the read of logcat failed: adb ${READ} exited with 1: logcat: -T '1793479998.000' not in time format.), ${LOST_SPACE}`,
    logcat: [READ],
    lines: [
      'logcat after the Spaces: -T 1793479998.000, adb exit status 1, 1 lines, first ["logcat: -T \'1793479998.000\' not in time format."], clock offset 1793480000.000s from a 0.000s round trip',
      "space 1: page lacks it, strip ['Kyou', 'You', 'Kyu'] -> ['you', 'I', 'to'], switched True, input restarted unread (the read of logcat failed: adb logcat -d -v epoch -b main -T 1793479998.000 exited with 1: logcat: -T '1793479998.000' not in time format.)",
    ],
    run: 'inconclusive',
  })
})

test('Scenario: logcat prints nothing from that time', async () => {
  const log = vi.spyOn(console, 'log')
  const typing = typeKyou('empty', 1)
  await vi.runAllTimersAsync()

  expect({
    result: await typing,
    logcat: logcatReads(),
    lines: spaceLines(log.mock.calls),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    result: `${INCONCLUSIVE}logcat holds no timed line), ${LOST_SPACE}`,
    logcat: [READ],
    lines: [
      'logcat after the Spaces: -T 1793479998.000, adb exit status 0, 0 lines, first [], clock offset 1793480000.000s from a 0.000s round trip',
      "space 1: page lacks it, strip ['Kyou', 'You', 'Kyu'] -> ['you', 'I', 'to'], switched True, input restarted unread (logcat holds no timed line)",
    ],
    run: 'inconclusive',
  })
})

test('Scenario: The raw read is logged once a call, after its final read', async () => {
  const log = vi.spyOn(console, 'log')
  const typing = typeKyou('whole', undefined, 2)
  await vi.runAllTimersAsync()

  expect({
    typed: await typing,
    logcat: logcatReads(),
    lines: spaceLines(log.mock.calls),
  }).toEqual({
    typed: {
      text: 'Kyou kyou ',
      picked: ['space', 'space'],
      compositionstart: 0,
      compositionupdate: 0,
      nested: 0,
      compositionstartPerWord: [0, 0],
      errors: [],
      blocks: 1,
      beforeCommit: [
        {text: 'Kyou', blocks: 1},
        {text: 'Kyou kyou', blocks: 1},
      ],
      decoratedPerWord: [[], []],
      committedRanges: [],
      spaces: [
        {word: 1, stripSwitched: true, inputRestarted: false},
        {word: 2, stripSwitched: true, inputRestarted: false},
      ],
    },
    logcat: [READ],
    lines: [
      "logcat after the Spaces: -T 1793479998.000, adb exit status 0, 20 lines, first ['--------- beginning of main', '1793480004.000  6165  6718 I Finsky:background: [128] DU: Stored data usage stats for package com.google.android.gms; completed bytes: 2736.'], clock offset 1793480000.000s from a 0.000s round trip",
      "space 1: page got it, strip ['Kyou', 'You', 'Kyu'] -> ['you', 'I', 'to'], switched True, input restarted False",
      "space 2: page got it, strip ['Kyou', 'You', 'Kyu'] -> ['you', 'I', 'to'], switched True, input restarted False",
    ],
  })
})

test('Scenario: Printing the raw read throws', async () => {
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      /logcat (after|log after) the Spaces/.test(args[0])
    )
      throw new Error('stdout closed')
  })
  const typing = typeKyou('empty', 1)
  await vi.runAllTimersAsync()

  expect({result: await typing, run: driverRuns.at(-1)?.state}).toEqual({
    result: `${INCONCLUSIVE}logcat holds no timed line), ${LOST_SPACE}`,
    run: 'inconclusive',
  })
})

/** Type `kyou` `words` times on the Space probe's strips, each Space switching it, the page losing Space `lost`. */
function typeKyou(
  spaceLog: 'whole' | 'rejects-since' | 'empty',
  lost: number | undefined,
  words = 1,
) {
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html?decorate=you',
    prefix: '',
    words: Array.from({length: words}, (_, index) => ({
      letters: 'kyou',
      expect: index === words - 1 ? {trigger: 'letters' as const} : {},
    })),
    crash: CRASH,
  }).catch((error: Error) => `${error.name}: ${error.message}`)
  vi.useFakeTimers({now: 0})
  globalThis.fakeGboard({
    lang: 'en',
    spaceStrip: Array.from({length: words}, () => 'switches' as const),
    spaceLog,
    page: (taps) => {
      let text = ''
      let spaces = 0
      for (const tap of taps) {
        if (tap === 'Space') {
          spaces += 1
          if (spaces !== lost) text += ' '
        } else if (/^[a-z]$/i.test(tap))
          text += text === '' ? tap.toUpperCase() : tap.toLowerCase()
      }
      return {text, events: []}
    },
  })
  return typing
}

function logcatReads(): string[] {
  return globalThis.deviceIO().filter((call) => call.startsWith('logcat'))
}

function spaceLines(calls: unknown[][]): string[] {
  return calls
    .map(([line]) => line)
    .filter(
      (line): line is string =>
        typeof line === 'string' &&
        /^PHASE \+\s*[\d.]+s (logcat after the Spaces|space \d+:)/.test(line),
    )
    .map((line) => line.replace(/^PHASE \+\s*[\d.]+s /, ''))
}
