import {expect, test, vi} from 'vitest'
import {driverRuns, typeOnDevice} from '../../driver.ts'

test('Scenario: A required candidate Gboard offers only on the retry is tapped there', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({
    lang: 'ja',
    texts: ['', '今日'],
    candidate: '今日',
    candidateFrom: 2,
  })
  const typing = typeOnDevice({
    lang: 'ja',
    page: 'editor.html?decorate=きょう',
    prefix: '',
    words: [{letters: 'kyou', candidate: '今日', required: true}],
  })
  await vi.runAllTimersAsync()

  expect({
    typed: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    typed: {
      text: '今日',
      picked: ['今日'],
      compositionstart: 0,
      compositionupdate: 0,
      nested: 0,
      compositionstartPerWord: [0],
      errors: [],
      blocks: 1,
      beforeCommit: [{text: '今日', blocks: 1}],
      decoratedPerWord: [[]],
      committedRanges: [],
    },
    taps: [
      ['k', 'y', 'o', 'u'],
      ['k', 'y', 'o', 'u', '今日'],
    ],
    run: 'complete',
  })
})

test('Scenario: A candidate that is not required falls back to Space as before', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({lang: 'ja', texts: ['きょう']})
  const typing = typeOnDevice({
    lang: 'ja',
    page: 'editor.html',
    prefix: '',
    words: [{letters: 'kyou', candidate: '今日'}],
  })
  await vi.runAllTimersAsync()

  expect({
    picked: (await typing).picked,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    picked: ['space'],
    taps: [['k', 'y', 'o', 'u', 'スペース']],
    run: 'complete',
  })
})

test('Scenario: A required candidate after letters that end in a space faults before typing', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({lang: 'ja', texts: ['きょう　']})
  const typing = typeOnDevice({
    lang: 'ja',
    page: 'editor.html',
    prefix: '',
    words: [{letters: 'kyou ', candidate: '今日', required: true}],
  }).catch((error: Error) => error.message)
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    error:
      "word 1 requires candidate '今日', but its letters end in a space, which commits it first",
    taps: [],
    run: 'faulted',
  })
})
