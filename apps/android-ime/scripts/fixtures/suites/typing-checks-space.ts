import {expect, test, vi} from 'vitest'
import {driverRuns, typeOnDevice} from '../../driver.ts'
import {gboardKeysWithDump} from '../../lib/space.ts'

vi.mock(import('../../lib/space.ts'), async (importOriginal) => {
  const original = await importOriginal()
  return {...original, gboardKeysWithDump: vi.fn(original.gboardKeysWithDump)}
})

const CRASH = /^NotFoundError: Failed to execute 'removeChild' on 'Node'/

const INCONCLUSIVE =
  "InconclusiveAttempt: Inconclusive: the driver faulted after typing started, so this run cannot tell whether the editor crashed. This is not a crash reproduction and not an editor failure. Rerun the job. The fault: Error: word 1: the page did not get the Space tapped to commit it. Gboard's suggestion strip and logcat may explain why but never decide the outcome: the strip"

const LOST_SPACE =
  'and a Space the page lacks is never an editor result, whatever the strip and logcat show'

const SWITCHED = `${INCONCLUSIVE} ['Kyou', 'You', 'Kyu'] before the tap and ['you', 'I', 'to'] after it, the dump after it ending at 1.90s after the Space, switched True, input restarted`

const RESTART_LINE =
  'I GoogleInputMethodService: GoogleInputMethodService.onStartInput():1293 onStartInput(EditorInfo{EditorInfo{packageName=com.android.chrome, inputType=0, inputTypeString=NULL, enableLearning=false, autoCorrection=false, autoComplete=false, imeOptions=12000000, privateImeOptions=null, actionName=UNSPECIFIED, actionLabel=null, initialSelStart=-1, initialSelEnd=-1, initialCapsMode=0, label=null, fieldId=0, fieldName=null, extras=null, hintText=null, hintLocales=[]}}, true)'

// The device calls of a call that types `kyou` and Space, from its first input to its last, the same
// with the Space check as without it: a dump before each tap, the read and the candidates' dump once the
// letters were tapped, and the Space's own two dumps.
const KYOU_INPUT = [
  'tap K',
  'dump',
  'tap y',
  'dump',
  'tap o',
  'dump',
  'tap u',
  'screenshot composing1',
  'read',
  'dump',
  'dump',
  'dump',
  'tap Space',
]

test('Scenario: A Space the page got records a strip that switched and no input restart, and sends the device nothing between the inputs that a call without a crash does not', async () => {
  const typing = typeKyou({spaceStrip: ['switches'], lost: []})
  vi.mocked(gboardKeysWithDump).mockClear()
  await vi.runAllTimersAsync()
  const typed = await typing
  const io = globalThis.deviceIO()

  expect({
    typed,
    input: io.slice(io.indexOf('tap K'), io.lastIndexOf('tap Space') + 1),
    afterInput: io.slice(io.lastIndexOf('tap Space') + 1),
    variantCalls: vi.mocked(gboardKeysWithDump).mock.calls.length,
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    typed: kyou('Kyou ', [
      {word: 1, stripSwitched: true, inputRestarted: false},
    ]),
    input: KYOU_INPUT,
    variantCalls: 5,
    afterInput: [
      'screenshot after1',
      'read',
      'read',
      'dump',
      'date',
      'date',
      'date',
      'logcat -d -v epoch -b main -T 1793479998.000',
    ],
    run: 'complete',
  })
})

test('Scenario: A call without a crash sends the device the same calls between its inputs, and reads nothing after its final read', async () => {
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html',
    prefix: '',
    words: [{letters: 'kyou'}],
  })
  fake({spaceStrip: ['stays'], lost: [1]})
  vi.mocked(gboardKeysWithDump).mockClear()
  await vi.runAllTimersAsync()
  const typed = await typing
  const io = globalThis.deviceIO()

  expect({
    typed,
    input: io.slice(io.indexOf('tap K'), io.lastIndexOf('tap Space') + 1),
    afterInput: io.slice(io.lastIndexOf('tap Space') + 1),
    variantCalls: vi.mocked(gboardKeysWithDump).mock.calls.length,
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    typed: kyou('Kyou', undefined),
    input: KYOU_INPUT,
    afterInput: ['screenshot after1', 'read', 'read'],
    variantCalls: 0,
    run: 'complete',
  })
})

test('Scenario: A Space the page lacks after a strip that switched with no input restart ends the call inconclusive once typing went on with the same input', async () => {
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html?decorate=you',
    prefix: '',
    words: [
      {letters: 'kyou', expect: {}},
      {letters: 'kyou', expect: {trigger: 'letters'}},
    ],
    crash: CRASH,
  }).catch((error: Error) => `${error.name}: ${error.message}`)
  fake({spaceStrip: ['switches', 'switches'], lost: [1]})
  await vi.runAllTimersAsync()

  expect({
    result: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    result: `${SWITCHED} False, ${LOST_SPACE}`,
    taps: [['K', 'y', 'o', 'u', 'Space', 'k', 'y', 'o', 'u', 'Space']],
    run: 'inconclusive',
  })
})

test('Scenario: A Space the page lacks after a strip that did not switch ends the call inconclusive, naming when the strip was read', async () => {
  const typing = typeKyou({spaceStrip: ['stays'], lost: [1]})
  await vi.runAllTimersAsync()

  expect({
    result: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    result: `${INCONCLUSIVE} ['Kyou', 'You', 'Kyu'] before the tap and ['Kyou', 'You', 'Kyu'] after it, the dump after it ending at 1.90s after the Space, switched False, input restarted False, ${LOST_SPACE}`,
    taps: [['K', 'y', 'o', 'u', 'Space']],
    run: 'inconclusive',
  })
})

test('Scenario: A Space the page lacks whose dump before the next word is still on completions ends the call inconclusive naming that strip, though a later strip switched', async () => {
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html?decorate=you',
    prefix: '',
    words: [
      {letters: 'kyou', expect: {}},
      {letters: 'kyou', expect: {trigger: 'letters'}},
    ],
    crash: CRASH,
  }).catch((error: Error) => `${error.name}: ${error.message}`)
  fake({spaceStrip: ['predictions-later', 'switches'], lost: [1]})
  await vi.runAllTimersAsync()

  expect({result: await typing, run: driverRuns.at(-1)?.state}).toEqual({
    result: `${INCONCLUSIVE} ['Kyou', 'You', 'Kyu'] before the tap and ['Kyou', 'You', 'Kyu'] after it, the dump after it ending at 1.90s after the Space, switched False, input restarted False, ${LOST_SPACE}`,
    run: 'inconclusive',
  })
})

test('Scenario: A partial dump in the loop before the Space never feeds the strip, which comes from the whole dump the loop tapped from', async () => {
  const typing = typeKyou({
    spaceStrip: ['switches'],
    lost: [],
    partialStripDumps: [3],
  })
  await vi.runAllTimersAsync()
  const typed = await typing
  const io = globalThis.deviceIO()

  expect({
    typed,
    beforeSpace: io.slice(io.indexOf('tap u') + 1, io.indexOf('tap Space') + 1),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    typed: kyou('Kyou ', [
      {word: 1, stripSwitched: true, inputRestarted: false},
    ]),
    beforeSpace: [
      'screenshot composing1',
      'read',
      'dump',
      'dump',
      'dump',
      'dump',
      'tap Space',
    ],
    run: 'complete',
  })
})

test('Scenario: A Space the page lacks whose dump after it does not parse leaves the strip unread and ends the call inconclusive', async () => {
  const typing = typeKyou({
    spaceStrip: ['switches'],
    lost: [1],
    lastDump: 'unparsable',
  })
  await vi.runAllTimersAsync()

  expect({result: await typing, run: driverRuns.at(-1)?.state}).toEqual({
    result: `${INCONCLUSIVE} ['Kyou', 'You', 'Kyu'] before the tap and unread after it, the dump after it ending at 1.90s after the Space, switched unread (the strip after the tap is unread: the dump does not parse: Error: malformed XML near offset 109926), input restarted False, ${LOST_SPACE}`,
    run: 'inconclusive',
  })
})

test('Scenario: A Space the page lacks whose dump after it holds no whole keyboard leaves the strip unread and ends the call inconclusive', async () => {
  const typing = typeKyou({
    spaceStrip: ['switches'],
    lost: [1],
    lastDump: 'partial',
  })
  await vi.runAllTimersAsync()

  expect({result: await typing, run: driverRuns.at(-1)?.state}).toEqual({
    result: `${INCONCLUSIVE} ['Kyou', 'You', 'Kyu'] before the tap and unread after it, the dump after it ending at 1.90s after the Space, switched unread (the strip after the tap is unread: the dump held no whole keyboard), input restarted False, ${LOST_SPACE}`,
    run: 'inconclusive',
  })
})

test('Scenario: A Space the page lacks after a strip that switched across an input restart in its window ends the call inconclusive, naming the restart', async () => {
  const typing = typeKyou({
    spaceStrip: ['switches'],
    restarts: [{tap: 4, dump: 3, at: 'during'}],
    lost: [1],
  })
  await vi.runAllTimersAsync()

  expect({result: await typing, run: driverRuns.at(-1)?.state}).toEqual({
    result: `${SWITCHED} True, 1793480005.601  1766  1766 ${RESTART_LINE}, ${LOST_SPACE}`,
    run: 'inconclusive',
  })
})

test('Scenario: A restart inside the pad before the dump before the Space counts, and ends the call inconclusive when the page lacks the Space', async () => {
  const typing = typeKyou({
    spaceStrip: ['switches'],
    restarts: [{tap: 4, dump: 3, at: 'before', seconds: 0.5}],
    lost: [1],
  })
  await vi.runAllTimersAsync()

  expect({
    restarted: restartedOf(await typing),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    restarted: true,
    run: 'inconclusive',
  })
})

test('Scenario: A restart inside the pad after the dump after the Space counts, and ends the call inconclusive when the page lacks the Space', async () => {
  const typing = typeKyou({
    spaceStrip: ['switches'],
    restarts: [{tap: 5, dump: 1, at: 'after', seconds: 0.5}],
    lost: [1],
  })
  await vi.runAllTimersAsync()

  expect({
    restarted: restartedOf(await typing),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    restarted: true,
    run: 'inconclusive',
  })
})

test('Scenario: A Space the page lacks after a strip that switched from a snapshot older than its dump, with the restart that reset it 1.5 seconds before that dump, outside the pad, ends the call inconclusive', async () => {
  const typing = typeKyou({
    spaceStrip: ['switches'],
    restarts: [{tap: 4, dump: 3, at: 'before', seconds: 1.5}],
    lost: [1],
  })
  await vi.runAllTimersAsync()

  expect({result: await typing, run: driverRuns.at(-1)?.state}).toEqual({
    result: `${SWITCHED} False, ${LOST_SPACE}`,
    run: 'inconclusive',
  })
})

test('Scenario: A Space that never reached Gboard, after which the last dump returns a stale snapshot of predictions, ends the call inconclusive though the strip switched with no restart', async () => {
  const typing = typeKyou({spaceStrip: ['stale-predictions'], lost: [1]})
  await vi.runAllTimersAsync()

  expect({result: await typing, run: driverRuns.at(-1)?.state}).toEqual({
    result: `${SWITCHED} False, ${LOST_SPACE}`,
    run: 'inconclusive',
  })
})

test('Scenario: A Space the page lacks, with a restart during the dump before it that a clock offset read 3 seconds low places outside its window, ends the call inconclusive', async () => {
  const typing = typeKyou({
    spaceStrip: ['switches'],
    restarts: [{tap: 4, dump: 3, at: 'during'}],
    clockError: -3,
    lost: [1],
  })
  await vi.runAllTimersAsync()

  expect({result: await typing, run: driverRuns.at(-1)?.state}).toEqual({
    result: `${SWITCHED} False, ${LOST_SPACE}`,
    run: 'inconclusive',
  })
})

test('Scenario: A read of logcat whose first line is not older than the padded window ends the call inconclusive when the page lacks the Space', async () => {
  const typing = typeKyou({
    spaceStrip: ['switches'],
    spaceLog: 'truncated-head',
    lost: [1],
  })
  await vi.runAllTimersAsync()

  expect({result: await typing, run: driverRuns.at(-1)?.state}).toEqual({
    result: `${SWITCHED} unread (logcat's first line, at 1793480005.000, is not older than the padded window's start at 1793480004.600), ${LOST_SPACE}`,
    run: 'inconclusive',
  })
})

test('Scenario: A read of logcat whose last line is not newer than the padded window ends the call inconclusive when the page lacks the Space', async () => {
  const typing = typeKyou({
    spaceStrip: ['switches'],
    spaceLog: 'truncated-tail',
    lost: [1],
  })
  await vi.runAllTimersAsync()

  expect({result: await typing, run: driverRuns.at(-1)?.state}).toEqual({
    result: `${SWITCHED} unread (logcat's last line, at 1793480007.000, is not newer than the padded window's end at 1793480008.500), ${LOST_SPACE}`,
    run: 'inconclusive',
  })
})

test('Scenario: A read of the device clock that fails leaves the restart unread and ends the call inconclusive when the page lacks the Space', async () => {
  const typing = typeKyou({
    spaceStrip: ['switches'],
    clock: 'fails',
    lost: [1],
  })
  await vi.runAllTimersAsync()

  expect({
    result: await typing,
    logcat: logcatReads(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    result: `${SWITCHED} unread (the read of the device clock failed: Error: adb shell date +%s.%N exited with 1: date: not found), ${LOST_SPACE}`,
    logcat: [],
    run: 'inconclusive',
  })
})

test('Scenario: A read of the device clock whose shortest round trip is longer than the pad ends the call inconclusive when the page lacks the Space', async () => {
  const typing = typeKyou({
    spaceStrip: ['switches'],
    clock: 'slow',
    lost: [1],
  })
  await vi.runAllTimersAsync()

  expect({result: await typing, run: driverRuns.at(-1)?.state}).toEqual({
    result: `${SWITCHED} unread (the device clock's shortest round trip took 3.000s, longer than the 1s pad), ${LOST_SPACE}`,
    run: 'inconclusive',
  })
})

test('Scenario: A read of logcat that adb fails ends the call inconclusive when the page lacks the Space', async () => {
  const typing = typeKyou({
    spaceStrip: ['switches'],
    spaceLog: 'fails',
    lost: [1],
  })
  await vi.runAllTimersAsync()

  expect({result: await typing, run: driverRuns.at(-1)?.state}).toEqual({
    result: `${SWITCHED} unread (the read of logcat failed: adb logcat -d -v epoch -b main -T 1793479998.000 exited with 1: logcat: Unable to open log device), ${LOST_SPACE}`,
    run: 'inconclusive',
  })
})

test('Scenario: A Japanese call with a crash reads no strip, no clock and no logcat around the Space that commits a word as kana', async () => {
  const typing = typeOnDevice({
    lang: 'ja',
    page: 'editor.html',
    prefix: '',
    words: [{letters: 'kyou', expect: {trigger: 'commit'}}],
    crash: CRASH,
  })
  vi.useFakeTimers()
  globalThis.fakeGboard({lang: 'ja', texts: ['きょう　']})
  vi.mocked(gboardKeysWithDump).mockClear()
  await vi.runAllTimersAsync()
  const io = globalThis.deviceIO()

  expect({
    text: (await typing).text,
    spaces: (await typing).spaces,
    afterInput: io.slice(io.lastIndexOf('tap スペース') + 1),
    variantCalls: vi.mocked(gboardKeysWithDump).mock.calls.length,
  }).toEqual({
    text: 'きょう　',
    spaces: undefined,
    afterInput: ['screenshot after1', 'read', 'read'],
    variantCalls: 0,
  })
})

function typeKyou(options: Parameters<typeof fake>[0]) {
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html?decorate=you',
    prefix: '',
    words: [{letters: 'kyou', expect: {trigger: 'letters'}}],
    crash: CRASH,
  }).catch((error: Error) => `${error.name}: ${error.message}`)
  fake(options)
  return typing
}

/**
 * The fake Gboard of the Space probe's dumps, and a page that shows each letter tapped, capitalizing the
 * block's first, and each Space but the ones `lost` numbers. The first dump is `en-keyboard.xml`, whose
 * keys are labelled uppercase, and the probe's are lowercase.
 */
function fake({
  lost,
  ...options
}: Omit<Parameters<typeof globalThis.fakeGboard>[0], 'lang' | 'page'> & {
  lost: number[]
}): void {
  vi.useFakeTimers({now: 0})
  globalThis.fakeGboard({
    lang: 'en',
    ...options,
    page: (taps) => {
      let text = ''
      let spaces = 0
      for (const tap of taps) {
        if (tap === 'Space') {
          spaces += 1
          if (!lost.includes(spaces)) text += ' '
        } else if (/^[a-z]$/i.test(tap))
          text += text === '' ? tap.toUpperCase() : tap.toLowerCase()
      }
      return {text, events: []}
    },
  })
}

function restartedOf(result: unknown): boolean | 'unread' | string {
  if (typeof result !== 'string') return 'typed'
  return result.includes('input restarted True, ') ? true : result
}

function logcatReads(): string[] {
  return globalThis.deviceIO().filter((call) => call.startsWith('logcat'))
}

function kyou(
  text: string,
  spaces:
    | Array<{
        word: number
        stripSwitched: boolean | 'unread'
        inputRestarted: boolean | 'unread'
      }>
    | undefined,
) {
  return {
    text,
    picked: ['space'],
    compositionstart: 0,
    compositionupdate: 0,
    nested: 0,
    compositionstartPerWord: [0],
    errors: [],
    blocks: 1,
    beforeCommit: [{text: 'Kyou', blocks: 1}],
    decoratedPerWord: [[]],
    committedRanges: [],
    ...(spaces === undefined ? {} : {spaces}),
  }
}
