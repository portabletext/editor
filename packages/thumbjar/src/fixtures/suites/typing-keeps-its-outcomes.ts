import {beforeEach, expect, test, vi} from 'vitest'
import {driverRuns, typeOnDevice} from '../../driver.ts'

beforeEach(() => {
  globalThis.gboardDevice.reset()
  vi.useFakeTimers()
})

test('Scenario: A candidate Gboard does not offer is committed with Space', async (context) => {
  globalThis.gboardDevice.keyboard = 'ja'
  const running = typeOnDevice(context, {
    keyboard: 'ja',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    words: [{letters: 'kyou', candidate: '今日'}],
  })
  await vi.runAllTimersAsync()
  const typed = await running

  expect({
    text: typed.text,
    picked: typed.picked,
    run: driverRuns.at(-1),
    taps: globalThis.gboardDevice.calls.filter((call) =>
      call.startsWith('tap'),
    ),
  }).toEqual({
    text: 'kyou',
    picked: ['space'],
    run: {
      test: 'Scenario: A candidate Gboard does not offer is committed with Space',
      fails: false,
      state: 'complete',
      taps: [{keys: ['k', 'y', 'o', 'u', 'スペース'], events: []}],
    },
    taps: ['tap field', 'tap k', 'tap y', 'tap o', 'tap u', 'tap スペース'],
  })
})

test('Scenario: A fault after a key tap is retried in a restarted Chrome without a pid check', async (context) => {
  globalThis.gboardDevice.rejectedTaps = [3]
  const running = typeOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    words: [{letters: 'ab'}],
  })
  await vi.runAllTimersAsync()
  const typed = await running

  expect({
    text: typed.text,
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    text: 'ab ',
    run: {
      test: 'Scenario: A fault after a key tap is retried in a restarted Chrome without a pid check',
      fails: false,
      state: 'complete',
      taps: [{keys: ['A', 'B', 'Space'], events: []}],
    },
    calls: [
      'open chrome',
      'attempt 1',
      'tap field',
      'tap A',
      'tap B rejected',
      'force-stop chrome',
      'open chrome',
      'attempt 2',
      'tap field',
      'tap A',
      'tap B',
      'tap Space',
      'force-stop chrome',
    ],
  })
})
