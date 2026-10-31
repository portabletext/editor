import {expect, test, vi} from 'vitest'
import {typeOnDevice} from '../../driver.ts'

test.fails('Scenario: Typing kyou while 今日 is missing on the retry and the page records an error after the miss', async () => {
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
    crash: /^NotFoundError: Failed to execute 'removeChild' on 'Node'/,
  })
  // The rejection is awaited below, once the fake timers ran out.
  typing.catch(() => {})
  await vi.runAllTimersAsync()

  expect((await typing).errors).toEqual([])
})
