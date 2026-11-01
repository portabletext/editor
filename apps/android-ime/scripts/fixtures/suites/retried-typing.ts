import {expect, test, vi} from 'vitest'
import {typeOnDevice} from '../../driver.ts'

test('Scenario: Typing kyou after a driver fault', async () => {
  vi.useFakeTimers()
  const typing = typeOnDevice({
    lang: 'ja',
    page: 'editor.html',
    prefix: '',
    words: [{letters: 'kyou', candidate: '今日'}],
  })
  await vi.runAllTimersAsync()
  const typed = await typing

  expect({text: typed.text, calls: globalThis.deviceCalls}).toEqual({
    text: '今日',
    calls: [
      'attempt 1',
      'dump start',
      'dump stopped',
      'close chrome',
      'attempt 2',
      'close chrome',
    ],
  })
})
