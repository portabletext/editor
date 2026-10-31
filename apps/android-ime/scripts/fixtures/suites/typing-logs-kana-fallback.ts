import {expect, test, vi} from 'vitest'
import {driverRuns, typeOnDevice} from '../../driver.ts'

test('Scenario: Space commits word 1 as kana on the retry after a rejected tap', async () => {
  vi.useFakeTimers()
  const log = vi.spyOn(console, 'log')
  globalThis.fakeGboard({
    lang: 'ja',
    texts: ['', 'きょう今日'],
    candidate: '今日',
    candidateAfterSpace: true,
    rejectFirst: 'y',
  })
  const typing = typeOnDevice({
    lang: 'ja',
    page: 'plain.html',
    prefix: '',
    words: [
      {letters: 'kyou', candidate: '今日'},
      {letters: 'kyou', candidate: '今日'},
    ],
  })
  await vi.runAllTimersAsync()

  expect({
    typed: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
    kanaFallback: kanaFallbackLines(log.mock.calls),
  }).toEqual({
    typed: {
      text: 'きょう今日',
      picked: ['space', '今日'],
      compositionstart: 0,
      compositionupdate: 0,
      nested: 0,
      compositionstartPerWord: [0, 0],
      errors: [],
      blocks: 1,
      beforeCommit: [
        {text: 'きょう今日', blocks: 1},
        {text: 'きょう今日', blocks: 1},
      ],
      decoratedPerWord: [[], []],
      committedRanges: [],
    },
    taps: [['k'], ['k', 'y', 'o', 'u', 'スペース', 'k', 'y', 'o', 'u', '今日']],
    run: 'complete',
    kanaFallback: [
      'KANA_FALLBACK triggered in Scenario: Space commits word 1 as kana on the retry after a rejected tap: picked space/今日',
    ],
  })
})

test('Scenario: Gboard offers the candidate for both words', async () => {
  vi.useFakeTimers()
  const log = vi.spyOn(console, 'log')
  globalThis.fakeGboard({lang: 'ja', texts: ['今日今日'], candidate: '今日'})
  const typing = typeOnDevice({
    lang: 'ja',
    page: 'plain.html',
    prefix: '',
    words: [
      {letters: 'kyou', candidate: '今日'},
      {letters: 'kyou', candidate: '今日'},
    ],
  })
  await vi.runAllTimersAsync()

  expect({
    picked: (await typing).picked,
    kanaFallback: kanaFallbackLines(log.mock.calls),
  }).toEqual({
    picked: ['今日', '今日'],
    kanaFallback: [
      'KANA_FALLBACK not triggered in Scenario: Gboard offers the candidate for both words: picked 今日/今日',
    ],
  })
})

test('Scenario: Words without a candidate', async () => {
  vi.useFakeTimers()
  const log = vi.spyOn(console, 'log')
  globalThis.fakeGboard({lang: 'en', texts: ['Kyou ']})
  const typing = typeOnDevice({
    lang: 'en',
    page: 'plain.html',
    prefix: '',
    words: [{letters: 'kyou '}],
  })
  await vi.runAllTimersAsync()

  expect({
    picked: (await typing).picked,
    kanaFallback: kanaFallbackLines(log.mock.calls),
  }).toEqual({picked: ['space'], kanaFallback: []})
})

test('Scenario: Printing the line throws', async () => {
  vi.useFakeTimers()
  const log = vi
    .spyOn(console, 'log')
    .mockImplementation((...args: unknown[]) => {
      if (typeof args[0] === 'string' && args[0].startsWith('KANA_FALLBACK'))
        throw new Error('stdout closed')
    })
  globalThis.fakeGboard({lang: 'ja', texts: ['今日今日'], candidate: '今日'})
  const typing = typeOnDevice({
    lang: 'ja',
    page: 'plain.html',
    prefix: '',
    words: [
      {letters: 'kyou', candidate: '今日'},
      {letters: 'kyou', candidate: '今日'},
    ],
  })
  await vi.runAllTimersAsync()

  expect({
    picked: (await typing).picked,
    run: driverRuns.at(-1)?.state,
    kanaFallback: kanaFallbackLines(log.mock.calls),
  }).toEqual({
    picked: ['今日', '今日'],
    run: 'complete',
    kanaFallback: [
      'KANA_FALLBACK not triggered in Scenario: Printing the line throws: picked 今日/今日',
    ],
  })
})

function kanaFallbackLines(calls: unknown[][]): unknown[] {
  return calls
    .map(([line]) => line)
    .filter(
      (line) => typeof line === 'string' && line.startsWith('KANA_FALLBACK'),
    )
}
