import {expect, test, vi} from 'vitest'
import {typeOnDevice} from '../../driver.ts'

test.fails('Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({
    lang: 'ja',
    texts: ['きょう　きょう', 'きょう　きょう'],
  })
  const typing = typeOnDevice({
    lang: 'ja',
    page: 'editor.html?decorate=きょう',
    prefix: '',
    words: [
      {letters: 'kyou', candidate: '今日', required: true},
      {letters: 'kyou', candidate: '今日', required: true},
    ],
  })
  // The rejection is awaited below, once the fake timers ran out.
  typing.catch(() => {})
  await vi.runAllTimersAsync()

  expect({text: (await typing).text, errors: []}).toEqual({
    text: '今日今日',
    errors: [],
  })
})
