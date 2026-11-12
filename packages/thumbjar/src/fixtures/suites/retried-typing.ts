import {expect, test, vi} from 'vitest'
import {driverRuns, typeOnDevice} from '../../driver.ts'

test('Scenario: A call with its options first throws before the device', async () => {
  const options = {
    keyboard: 'ja',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    words: [{letters: 'kyou', candidate: '今日'}],
  }
  const call = typeOnDevice as unknown as (
    options: unknown,
  ) => ReturnType<typeof typeOnDevice>

  await expect(call(options)).rejects.toThrow(
    '`typeOnDevice` takes the context Vitest passes to the test first: `typeOnDevice(context, options)`',
  )
  expect({runs: driverRuns, calls: globalThis.deviceCalls}).toEqual({
    runs: [],
    calls: [],
  })
})

test('Scenario: Typing kyou after a driver fault', async (context) => {
  vi.useFakeTimers()
  const typing = typeOnDevice(context, {
    keyboard: 'ja',
    url: 'http://localhost:8765/editor.html',
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
