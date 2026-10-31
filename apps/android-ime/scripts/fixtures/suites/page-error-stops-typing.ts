import {expect, test, vi} from 'vitest'
import {driverRuns, typeOnDevice} from '../../driver.ts'

const CANDIDATES =
  "['設定', '手書き入力', '長音記号', '削除', '読点', '次の言語', 'スペース', '句点', '左', '右']"

const REMOVE_CHILD =
  "NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node."

const CRASH = /^NotFoundError: Failed to execute 'removeChild' on 'Node'/

const INCONCLUSIVE =
  'InconclusiveAttempt: Inconclusive: the driver faulted after typing started, so this run cannot tell whether the editor crashed. This is not a crash reproduction and not an editor failure. Rerun the job. The fault:'

test('Scenario: An error after word 1 ends the attempt of a crash case before a missing candidate on word 2 can be retried', async () => {
  vi.useFakeTimers()
  // The page records the error from its second state read, the one after word 1. Gboard offers the
  // candidate only on a retry, which would type both words cleanly and lose the error.
  globalThis.fakeGboard({
    lang: 'ja',
    texts: ['今日', '今日今日'],
    candidate: '今日',
    candidateFrom: 2,
    errorsFrom: 2,
  })
  const typing = typeOnDevice({
    lang: 'ja',
    page: 'editor.html?decorate=きょう',
    prefix: '',
    words: [
      {letters: 'kyou', candidate: '今日', expect: {trigger: 'commit'}},
      {letters: 'kyou', candidate: '今日', required: true, expect: {}},
    ],
    crash: CRASH,
  })
  await vi.runAllTimersAsync()

  expect({
    typed: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    typed: {
      text: '今日',
      picked: ['space'],
      compositionstart: 0,
      compositionupdate: 0,
      nested: 0,
      compositionstartPerWord: [0],
      errors: [REMOVE_CHILD],
      blocks: 1,
      beforeCommit: [{text: '今日', blocks: 1}],
      decoratedPerWord: [[]],
      committedRanges: [],
    },
    taps: [['k', 'y', 'o', 'u', 'スペース']],
    run: 'complete',
  })
})

test('Scenario: An error the page shows only after a missing required candidate ends a crash case on a fault with the error, never retried', async () => {
  vi.useFakeTimers()
  // Word 1 reads the page twice, once composing and once committed, and word 2 once composing, all
  // without an error. The read the driver takes after the fault is the first to show it.
  globalThis.fakeGboard({
    lang: 'ja',
    texts: ['きょう', '今日今日'],
    candidate: '今日',
    candidateFrom: 2,
    errorsFrom: 4,
  })
  const typing = typeOnDevice({
    lang: 'ja',
    page: 'editor.html?decorate=きょう',
    prefix: '',
    words: [
      {letters: 'kyou', candidate: '今日', expect: {}},
      {
        letters: 'kyou',
        candidate: '今日',
        required: true,
        expect: {trigger: 'commit'},
      },
    ],
    crash: CRASH,
  }).catch((error: Error) => error.message)
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    error: `Error: required candidate '今日' not offered for word 2, candidates ${CANDIDATES}, and the page recorded errors: ["${REMOVE_CHILD}"]`,
    taps: [['k', 'y', 'o', 'u', 'スペース', 'k', 'y', 'o', 'u']],
    run: 'faulted-with-page-errors',
  })
})

test('Scenario: An error the page shows only after Gboard vanished ends a crash case on a fault with the error, never retried', async () => {
  vi.useFakeTimers()
  // Gboard leaves the accessibility tree after the first letter, so the dash is never found. Word 1's
  // only read is the one after the fault.
  globalThis.fakeGboard({
    lang: 'en',
    texts: ['A', 'A-'],
    errorsFrom: 1,
    loseKeyboardAfter: 'A',
  })
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html',
    prefix: '',
    words: [{letters: 'a-', expect: {trigger: 'commit'}}],
    crash: CRASH,
  }).catch((error: Error) => error.message)
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    error: `Error: Gboard showed no whole new layout in 8 dumps, see out/en-an-error-the-page-shows-only-after-gboard-vanished-ends-a-crash-case-on-a-fault-with-the-error-never-retried-layout-0.xml, and the page recorded errors: ["${REMOVE_CHILD}"]`,
    taps: [['A']],
    run: 'faulted-with-page-errors',
  })
})

test('Scenario: A driver fault on a page without errors is still retried', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({
    lang: 'en',
    texts: ['A', 'A- '],
    loseKeyboardAfter: 'A',
  })
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html',
    prefix: '',
    words: [{letters: 'a- '}],
  })
  await vi.runAllTimersAsync()

  expect({
    text: (await typing).text,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    text: 'A- ',
    taps: [['A'], ['A', 'Symbol keyboard', 'Dash', 'Space', 'Letter keyboard']],
    run: 'complete',
  })
})

test('Scenario: A required candidate missing on the retry of a crash case with an error on the read after that fault ends on a fault with the error', async () => {
  vi.useFakeTimers()
  // The first attempt faults before any key is tapped, so only a crash case's retry can miss the candidate.
  globalThis.fakeGboard({
    lang: 'ja',
    texts: ['', 'きょう'],
    hangFirstDump: true,
    errorsFrom: 2,
    errorsAttempt: 2,
  })
  const typing = typeOnDevice({
    lang: 'ja',
    page: 'editor.html?decorate=きょう',
    prefix: '',
    words: [
      {
        letters: 'kyou',
        candidate: '今日',
        required: true,
        expect: {trigger: 'commit'},
      },
    ],
    crash: CRASH,
  }).catch((error: Error) => error.message)
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    error: `Error: required candidate '今日' not offered for word 1, candidates ${CANDIDATES}, and the page recorded errors: ["${REMOVE_CHILD}"]`,
    taps: [[], ['k', 'y', 'o', 'u']],
    run: 'faulted-with-page-errors',
  })
})

test('Scenario: A rejected tap with an error on the read after it ends a crash case on a fault with the error, never retried', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({
    lang: 'en',
    texts: ['A', 'A- '],
    rejectFirst: 'Dash',
    errorsFrom: 1,
  })
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html',
    prefix: '',
    words: [{letters: 'a- ', expect: {trigger: 'commit'}}],
    crash: CRASH,
  }).catch((error: Error) => error.message)
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    error: `TapNotInjectedError: tap at 593,1885 was not injected, and the page recorded errors: ["${REMOVE_CHILD}"]`,
    taps: [['A', 'Symbol keyboard', 'Letter keyboard']],
    run: 'faulted-with-page-errors',
  })
})

test('Scenario: A missing required candidate with an unrelated page error ends a crash case on a fault with the error, never retried', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({
    lang: 'ja',
    texts: ['きょう', '今日'],
    candidate: '今日',
    candidateFrom: 2,
    errorsFrom: 2,
    error: 'TypeError: unrelated page failure',
  })
  const typing = typeOnDevice({
    lang: 'ja',
    page: 'editor.html',
    prefix: '',
    words: [
      {
        letters: 'kyou',
        candidate: '今日',
        required: true,
        expect: {trigger: 'commit'},
      },
    ],
    crash: CRASH,
  }).catch((error: Error) => error.message)
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    error: `Error: required candidate '今日' not offered for word 1, candidates ${CANDIDATES}, and the page recorded errors: ['TypeError: unrelated page failure']`,
    taps: [['k', 'y', 'o', 'u']],
    run: 'faulted-with-page-errors',
  })
})

test('Scenario: An error the page recorded on Enter stays the result when the tap back to the letters then hangs, never retried', async () => {
  vi.useFakeTimers()
  // The dump after Enter is the tap back's first, and it never answers. A retry would type cleanly.
  globalThis.fakeGboard({
    lang: 'en',
    texts: ['- \n', ''],
    errorsFrom: 2,
    hangDumpAfter: 'Enter',
  })
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html?behavior=dissolve-on-break',
    prefix: '',
    words: [{letters: '- ', enter: true}],
  })
  await vi.runAllTimersAsync()

  expect({
    typed: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    typed: {
      text: '- \n',
      picked: ['space'],
      compositionstart: 0,
      compositionupdate: 0,
      nested: 0,
      compositionstartPerWord: [0],
      errors: [REMOVE_CHILD],
      blocks: 1,
      beforeCommit: [{text: '- \n', blocks: 1}],
      decoratedPerWord: [[]],
      committedRanges: [],
    },
    taps: [['Symbol keyboard', 'Dash', 'Space', 'Enter']],
    run: 'complete',
  })
})

test("Scenario: An error other than the case's crash stays a fault with the error when the tap back to the letters then hangs, never retried", async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({
    lang: 'en',
    texts: ['- \n', ''],
    errorsFrom: 2,
    error: 'TypeError: unrelated page failure',
    hangDumpAfter: 'Enter',
  })
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html?behavior=dissolve-on-break',
    prefix: '',
    words: [{letters: '- ', enter: true, expect: {trigger: 'commit'}}],
    crash: /^NotFoundError: Failed to execute 'removeChild' on 'Node'/,
  }).catch((error: Error) => error.message)
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    error:
      "Error: no error but the case's crash /^NotFoundError: Failed to execute 'removeChild' on 'Node'/ was expected, and the page recorded errors: ['TypeError: unrelated page failure']",
    taps: [['Symbol keyboard', 'Dash', 'Space', 'Enter']],
    run: 'faulted-with-page-errors',
  })
})

test('Scenario: A driver fault on a page without errors is still retried when the tap back to the letters then hangs', async () => {
  vi.useFakeTimers()
  // The first attempt's Enter splits the block, a driver fault. The tap back then hangs, so the retry
  // starts on the symbol layout and takes it as its own start.
  globalThis.fakeGboard({
    lang: 'en',
    texts: ['- \n', ''],
    hangDumpAfter: 'Enter',
  })
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html?behavior=dissolve-on-break',
    prefix: '',
    words: [{letters: '- ', enter: true, expect: {textOnCommit: ''}}],
  })
  await vi.runAllTimersAsync()

  expect({
    text: (await typing).text,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    text: '',
    taps: [
      ['Symbol keyboard', 'Dash', 'Space', 'Enter'],
      ['Dash', 'Space', 'Enter'],
    ],
    run: 'complete',
  })
})

test("Scenario: A crash case's error the page recorded on Enter stays the result when the screenshot after Enter then hangs until the attempt deadline, never retried", async () => {
  vi.useFakeTimers()
  // The screenshot comes before the read after Enter, so only the read after the fault shows the error. A
  // retry would type cleanly.
  globalThis.fakeGboard({
    lang: 'en',
    texts: ['- \n', ''],
    errorsFrom: 2,
    hangScreenshotAfter: 'Enter',
  })
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html?behavior=dissolve-on-break',
    prefix: '',
    words: [{letters: '- ', enter: true, expect: {trigger: 'commit'}}],
    crash: CRASH,
  })
  await vi.runAllTimersAsync()

  expect({
    typed: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    typed: {
      text: '- \n',
      picked: ['space'],
      compositionstart: 0,
      compositionupdate: 0,
      nested: 0,
      compositionstartPerWord: [0],
      errors: [REMOVE_CHILD],
      blocks: 1,
      beforeCommit: [{text: '- \n', blocks: 1}],
      decoratedPerWord: [[]],
      committedRanges: [],
    },
    taps: [['Symbol keyboard', 'Dash', 'Space', 'Enter', 'Letter keyboard']],
    run: 'complete',
  })
})

test('Scenario: A screenshot after Enter and the read after it that both hang end a crash case inconclusive, never retried', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({
    lang: 'en',
    texts: ['- \n', ''],
    errorsFrom: 2,
    hangScreenshotAfter: 'Enter',
    hangReads: true,
  })
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html?behavior=dissolve-on-break',
    prefix: '',
    words: [{letters: '- ', enter: true, expect: {trigger: 'commit'}}],
    crash: CRASH,
  }).catch((error: Error) => `${error.name}: ${error.message}`)
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    error: `${INCONCLUSIVE} DeadlineError: attempt en-a-screenshot-after-enter-and-the-read-after-it-that-both-hang-end-a-crash-case-inconclusive-never-retried timed out after 180s, and the page could not be read after it: DeadlineError: reading the page after the fault timed out after 30s`,
    taps: [['Symbol keyboard', 'Dash', 'Space', 'Enter', 'Letter keyboard']],
    run: 'inconclusive',
  })
})

test('Scenario: A dump that hangs before any key is tapped is retried without a crash', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({
    lang: 'en',
    texts: ['', 'A'],
    hangFirstDump: true,
  })
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html',
    prefix: '',
    words: [{letters: 'a'}],
  })
  await vi.runAllTimersAsync()

  expect({
    text: (await typing).text,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    text: 'A',
    taps: [[], ['A', 'Space']],
    run: 'complete',
  })
})

test('Scenario: A rejected Enter that still reaches the page after a read without errors ends a crash case inconclusive, never retried', async () => {
  vi.useFakeTimers()
  // The rejected Enter lands on the tap back's first dump, after the read once the tap failed, and the page
  // records the error then. A retry would type cleanly.
  globalThis.fakeGboard({
    lang: 'en',
    rejectFirst: 'Enter',
    rejectedLandsLate: true,
    page: (taps) =>
      taps.includes('Enter')
        ? {
            text: '- \n',
            errors: globalThis.gboardTaps().length === 1 ? [REMOVE_CHILD] : [],
          }
        : {text: '- '},
  })
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html?behavior=dissolve-on-break',
    prefix: '',
    words: [{letters: '- ', enter: true, expect: {trigger: 'commit'}}],
    crash: CRASH,
  }).catch((error: Error) => `${error.name}: ${error.message}`)
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    error: `${INCONCLUSIVE} TapNotInjectedError: tap at 994,2196 was not injected, and input the attempt sent may still reach the page, so a read without errors after it is no result`,
    taps: [['Symbol keyboard', 'Dash', 'Space', 'Enter', 'Letter keyboard']],
    run: 'inconclusive',
  })
})

test('Scenario: A driver fault after the first letter on a page without errors ends a crash case inconclusive, never retried', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({
    lang: 'en',
    texts: ['A', 'A- '],
    loseKeyboardAfter: 'A',
  })
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html',
    prefix: '',
    words: [{letters: 'a- ', expect: {trigger: 'commit'}}],
    crash: CRASH,
  }).catch((error: Error) => `${error.name}: ${error.message}`)
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    error: `${INCONCLUSIVE} Error: Gboard showed no whole new layout in 8 dumps, see out/en-a-driver-fault-after-the-first-letter-on-a-page-without-errors-ends-a-crash-case-inconclusive-never-retried-layout-0.xml, and input the attempt sent may still reach the page, so a read without errors after it is no result`,
    taps: [['A']],
    run: 'inconclusive',
  })
})

test('Scenario: A dump that hangs before any key is tapped is retried for a crash case', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({
    lang: 'en',
    texts: ['', 'A'],
    hangFirstDump: true,
  })
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html',
    prefix: '',
    words: [{letters: 'a', expect: {trigger: 'commit'}}],
    crash: CRASH,
  })
  await vi.runAllTimersAsync()

  expect({
    text: (await typing).text,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    text: 'A',
    taps: [[], ['A', 'Space']],
    run: 'complete',
  })
})

test('Scenario: A rejected Enter that still reaches the page later is retried without a crash', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({
    lang: 'en',
    rejectFirst: 'Enter',
    rejectedLandsLate: true,
    page: (taps) => ({text: taps.includes('Enter') ? '' : '- '}),
  })
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html?behavior=dissolve-on-break',
    prefix: '',
    words: [{letters: '- ', enter: true}],
  })
  await vi.runAllTimersAsync()

  expect({
    text: (await typing).text,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    text: '',
    taps: [
      ['Symbol keyboard', 'Dash', 'Space', 'Enter', 'Letter keyboard'],
      ['Symbol keyboard', 'Dash', 'Space', 'Enter', 'Letter keyboard'],
    ],
    run: 'complete',
  })
})

test('Scenario: A dropped CDP connection after the first letter is retried without a crash, as it was before the read after a fault', async () => {
  vi.useFakeTimers()
  // Every state read of the first attempt fails from the first letter on, the read after the fault too.
  globalThis.fakeGboard({
    lang: 'en',
    texts: ['A', 'A'],
    dropReadsAfter: 'A',
  })
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html',
    prefix: '',
    words: [{letters: 'a'}],
  })
  await vi.runAllTimersAsync()

  expect({
    text: (await typing).text,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    text: 'A',
    taps: [['A'], ['A', 'Space']],
    run: 'complete',
  })
})

test('Scenario: An error the page records stops no call without a crash, which types every word and returns it with the result', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({
    lang: 'en',
    texts: ['A b '],
    errorsFrom: 1,
  })
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html',
    prefix: '',
    words: [{letters: 'a'}, {letters: 'b'}],
  })
  await vi.runAllTimersAsync()

  expect({
    typed: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    typed: {
      text: 'A b ',
      picked: ['space', 'space'],
      compositionstart: 0,
      compositionupdate: 0,
      nested: 0,
      compositionstartPerWord: [0, 0],
      errors: [REMOVE_CHILD],
      blocks: 1,
      beforeCommit: [
        {text: 'A b ', blocks: 1},
        {text: 'A b ', blocks: 1},
      ],
      decoratedPerWord: [[], []],
      committedRanges: [],
    },
    taps: [['A', 'Space', 'B', 'Space']],
    run: 'complete',
  })
})
